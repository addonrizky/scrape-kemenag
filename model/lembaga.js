var db = require('../config/database.js');

exports.saveLembaga = async function (nama_lembaga, nama_pimpinan, phone) {
	var lembaga_data = {
		'nama_lembaga' : nama_lembaga,
		'nama_pimpinan' : nama_pimpinan,
		'phone' : phone
	};

	db.get().query('INSERT INTO lembaga SET ?', [lembaga_data], function(err, result) {
		if(err){
			console.log("error on insertion lembaga", err)
		}
	})
};