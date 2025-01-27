const mysql = require('mysql2/promise');

let connection;

async function connectToMySql() {
    connection = await mysql.createConnection({
        host: 'mysql-container',
        user: 'root',
        password: 'test',
        database: 'mysql_database'
    });
    console.log("Connected to MySQL");
    return connection;
}

module.exports = {
    connectToMySql,
};