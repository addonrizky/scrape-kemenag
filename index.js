const puppeteer = require('puppeteer');
const db = require('./config/database');
const lembagaModel = require('./model/lembaga');
const counterModel = require('./model/counter');
const express = require('express')
const cors = require('cors');

const app = express()
const port = 3099

var corsOptions = {
    origin: '*',
    optionsSuccessStatus: 200 // some legacy browsers (IE11, various SmartTVs) choke on 204
}

//app.use(cors(corsOptions));
app.use(express.json())

app.get('/', (req, res) => {
    res.send('Hello World!')
})

app.get('/errorcreate', (req, res) => {
    process.exit(1)
})

app.listen(port, async function () {
    console.log('Express server lisening on port ' + port);
});

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

    // get last counter
    const checkpoint = await counterModel.getCheckpoint()
    const checkpointArea = await checkpoint.split(".")

    let stillRun = true
    let provinceIter = checkpointArea[0]
    let regencyIter = checkpointArea[1]
    let districtIter = checkpointArea[2]
    let lembagaIter = checkpointArea[3]
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
            if(e.toString().includes("Protocol")){
                process.exit(1)
            }
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
    await page.select('select[name="TBLDATA_length"]', '100')

    await sleep(1000)
    await page.evaluate(() => {
        document.scrollingElement.scrollTop = 800
    })
    console.log("scroll down")

    // click province
    const provinceBtn = await page.$$('table#TBLDATA tbody td a');
    const provinceValue = await (await provinceBtn[provinceIter].getProperty('innerHTML')).jsonValue();
    console.log("province val: ", provinceValue)
    await provinceBtn[provinceIter].click()

    await sleep(2000)
    await page.select('select[name="TBLDATA_length"]', '100')

    await sleep(1000)
    await page.evaluate(() => {
        document.scrollingElement.scrollTop = 800
    })
    console.log("scroll down")

    // click regency
    await sleep(1000)
    const regencyBtn = await page.$$('table#TBLDATA tbody td a');
    const regencyValue = await (await regencyBtn[regencyIter].getProperty('innerHTML')).jsonValue();
    console.log("regency val: ", regencyValue)
    await regencyBtn[regencyIter].click()

    await sleep(2000)
    await page.select('select[name="TBLDATA_length"]', '100')

    await sleep(1000)
    await page.evaluate(() => {
        document.scrollingElement.scrollTop = 800
    })
    console.log("scroll down")

    // click district
    await sleep(1000)
    const districtBtn = await page.$$('table#TBLDATA tbody td a');
    const districtValue = await (await districtBtn[districtIter].getProperty('innerHTML')).jsonValue();
    console.log("district val: ", districtValue)

    if(districtBtn.length == 0){
        return "INCR_REGENCY"
    }

    await districtBtn[districtIter].click()

    await sleep(2000)
    await page.select('select[name="TBLDATA_length"]', '100')

    await sleep(1000)
    await page.evaluate(() => {
        document.scrollingElement.scrollTop = 800
    })
    console.log("scroll down")

    // click lembaga
    await sleep(1000)
    const lembagaBtn = await page.$$('table#TBLDATA tbody td a');

    if(districtBtn.length - 1 == districtIter && lembagaBtn.length == 0){
        return "INCR_REGENCY"
    }

    const lembagaValue = await (await lembagaBtn[lembagaIter].getProperty('innerHTML')).jsonValue();
    console.log("lembaga val: ", lembagaValue)
    console.log("banyaknya lembaga : ", lembagaBtn.length)

    await sleep(1000)
    await page.screenshot({ path: 'image/screenshot.png' });
    console.log("capture the page")

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

    //console.log(provinceValue, regencyValue, districtValue, lembagaValue)
    await lembagaModel.saveLembaga(valueLembaga, valuePimpinan, valueKontak, provinceValue, regencyValue, districtValue);
    await counterModel.updateCheckpoint(provinceIter+"."+regencyIter+"."+districtIter+"."+lembagaIter)

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