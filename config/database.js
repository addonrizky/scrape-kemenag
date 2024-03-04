var mysql = require('mysql');

var state = {
  pool: null,
  mode: null,
}

exports.connect = async function(mode, done) {
  state.pool = mysql.createPool({
    //connectionLimit: 50,
    connectionLimit: 150,
    host: process.env.HOST_DB,
    user:  process.env.USER_DB,
    password:  process.env.PASS_DB,
    database: process.env.SCHEMA_DB,
    multipleStatements : true,
  })

  state.mode = mode;
  done();
}

exports.get = function() {
  return state.pool;
}
