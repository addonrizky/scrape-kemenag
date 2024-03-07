var db = require('../config/database.js');

exports.updateCheckpoint = async function (checkpoint) {
    db.get().query('UPDATE counter SET checkpoint = ? WHERE id = 1', [checkpoint], function (err, rows) {
        if (err) {
            console.log("error on update ", err)
        }
    });
};

exports.getCheckpoint = async function () {
    const checkpoint = await new Promise(function (resolve, reject) {
        db.get().query('SELECT checkpoint FROM counter WHERE id = 1', [], function (err, rows) {
            if (err) {
                console.log(err);
                reject(err); ''
            } else {
                resolve(rows);
            }
        });
    })

    return checkpoint[0].checkpoint
}