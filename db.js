const mysql = require('mysql2');

const connection = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    database: 'proactively_backend'
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