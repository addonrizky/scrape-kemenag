const puppeteer = require('puppeteer');
const db = require('./config/database');
const lembagaModel = require('./model/lembaga');


(async () => {
    // Creating MySQL connection
    await db.connect("mode_production", function (err, rslt) {
        if (err) {
            console.log('Unable to connect to MySQL.');
            process.exit(1);
        } else {
            console.log("successfully connect to database")
        }
    });

    let url = "https://emispendis.kemenag.go.id/pdpontrenv2/Sebaran/Pp";

    const browser = await puppeteer.launch({
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const pages = await browser.pages()
    console.log("open new tab")

    const page = pages[0]

    let stillRun = true
    let provinceIter = 0
    let regencyIter = 4
    let districtIter = 5
    let lembagaIter = 8
    let iterSignal = "NO_SIGNAL"
    let iterSoFar = 0
    while(stillRun){
        try{
            iterSignal = await scrapeLembaga(page, url, provinceIter,regencyIter,districtIter,lembagaIter)
            console.log(iterSignal)
            switch(iterSignal){
                case "INCR_PROVINCE":
                    provinceIter++
                    regencyIter=0
                    districtIter=0
                    lembagaIter=0
                    break
                case "INCR_REGENCY":
                    regencyIter++
                    districtIter=0
                    lembagaIter=0
                    break
                case "INCR_DISTRICT":
                    districtIter++
                    lembagaIter=0
                    break
                case "INCR_LEMBAGA":
                    lembagaIter++
                    break
                default:
                    stillRun = false
            }  
        } catch(e){
            console.log("error ges ", e)
        }
        iterSoFar++
        console.log("iteration so far : ", iterSoFar)
    }
    
})()

function sleep(ms) {
    return new Promise((resolve) => {
        setTimeout(resolve, ms);
    });
}

async function scrapeLembaga(page, url, provinceIter, regencyIter, districtIter, lembagaIter){
    console.log("WHERE WE AT ? ", provinceIter+".", regencyIter+".", districtIter+".", lembagaIter)
    await page.goto(
        url,
        {
            waitUntil: 'networkidle0',
        }
    );
    console.log("wait until page loaded")

    await sleep(1000)
    await page.evaluate(() => {
        document.scrollingElement.scrollTop = 800
    })
    console.log("scroll down")

    // click province
    const provinceBtn = await page.$$('table#TBLDATA tbody td a');
    await provinceBtn[provinceIter].click()

    // click regency
    await sleep(1000)
    const regencyBtn = await page.$$('table#TBLDATA tbody td a');
    await regencyBtn[regencyIter].click()

    await sleep(1000)
    await page.evaluate(() => {
        document.scrollingElement.scrollTop = 800
    })
    console.log("scroll down")

    // click district
    await sleep(1000)
    const districtBtn = await page.$$('table#TBLDATA tbody td a');

    if(districtBtn.length == 0){
        return "INCR_REGENCY"
    }

    await districtBtn[districtIter].click()

    await sleep(1000)
    await page.evaluate(() => {
        document.scrollingElement.scrollTop = 800
    })
    console.log("scroll down")

    // click lembaga
    await sleep(1000)
    const lembagaBtn = await page.$$('table#TBLDATA tbody td a');
    console.log("banyaknya lembaga : ", lembagaBtn.length)

    if(districtBtn.length - 1 == districtIter && lembagaBtn.length == 0){
        return "INCR_REGENCY"
    }
    if(lembagaBtn.length == 0){
        return "INCR_DISTRICT"
    }

    await lembagaBtn[lembagaIter].click()

    // get nama pimpinan
    await sleep(5000)
    const labelLembagaRaw = await page.waitForSelector('th >>>> ::-p-text("Nama Lembaga")');
    const valueLembagaRaw = await page.evaluateHandle(el => el.nextElementSibling, labelLembagaRaw);
    const valueLembaga = await (await valueLembagaRaw.getProperty('innerHTML')).jsonValue();
    console.log(valueLembagaRaw)

    await sleep(1000)
    console.log("search for kontak button")
    let kontak_elem = await page.$$('a[href="#navpills-kontak"]');
    await kontak_elem[0].click()

    // get nama pimpinan
    await sleep(1000)
    const labelPimpinanRaw = await page.waitForSelector('th >>>> ::-p-text("Nama Pimpinan")');
    const valuePimpinanRaw = await page.evaluateHandle(el => el.nextElementSibling, labelPimpinanRaw);
    const valuePimpinan = await (await valuePimpinanRaw.getProperty('innerHTML')).jsonValue();
    console.log(valuePimpinan)

    // get kontak pimpinan
    await sleep(1000)
    const labelKontakRaw = await page.waitForSelector('th >>>> ::-p-text("No. Telp")');
    const valueKontakRaw = await page.evaluateHandle(el => el.nextElementSibling, labelKontakRaw);
    const valueKontak = await(await valueKontakRaw.getProperty('innerHTML')).jsonValue();
    console.log(valueKontak)

    await sleep(1000)
    await page.screenshot({ path: 'image/screenshot.png' });
    console.log("capture the page")

    await lembagaModel.saveLembaga(valueLembaga, valuePimpinan, valueKontak);

    if(provinceBtn.length - 1 == provinceIter){
        return "DONE";
    }
    
    if(regencyBtn.length - 1 == regencyIter){
        return "INCR_PROVINCE";
    }

    if(districtBtn.length - 1 == districtIter){
        return "INCR_REGENCY";
    }

    if(lembagaBtn.length - 1 == lembagaIter){
        return "INCR_DISTRICT";
    }
    
    return "INCR_LEMBAGA";
}