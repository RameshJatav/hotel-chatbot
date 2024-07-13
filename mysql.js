const mysql = require('mysql');
const conn = mysql.createConnection({
    host:"localhost",
    user:"root",
    password:"",
    database:"hotel_db"
});

module.exports = conn;