const mysql = require('mysql2');

const connection = mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'proactively_backend',
});

connection.connect((err)=>{
    if (err){
        console.log(`error connecting to db ${err}`);
    }
    else{
        console.log('connected sucessfully');
    }
});

module.exports = {connection};