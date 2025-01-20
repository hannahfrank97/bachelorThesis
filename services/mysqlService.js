const mysql = require('mysql2/promise');

let connection;

async function connectToMySql() {
    connection = await mysql.createConnection({
        host: 'localhost',
        user: 'root',
        password: 'test',
        database: 'mysql_database'
    });
    console.log("Connected to MySQL");
    return connection;
}

async function inserDataToMySql(data) {
    const sql = `
    INSERT INTO DATA 
    (id, first_name, last_name, email, address, address2, products, car, moviegenre, slogan)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;
    await connection.execute(sql[
        data.id,
            data.first_name,
            data.last_name,
            data.email,
            data.address,
            data.address2,
            data.products,
            data.car,
            data.moviegenre,
            data.slogan
        ]
    );
}

async function updateDataInMysql(data) {
    const sql = `
    UPDATE DATA
    SET first_name = ?, last_name = ?, email = ?, address = ?, address2 = ?, products = ?, car = ?, moviegenre = ?, slogan = ?
    WHERE id = ?
  `;
    await connection.execute(sql[
        data.first_name,
            data.last_name,
            data.email,
            data.address,
            data.address2,
            data.products,
            data.car,
            data.moviegenre,
            data.slogan,
            data.id
        ]);
}

async function deleteDataInMysql(data) {
    const sql = `
    DELETE FROM DATA
    WHERE id = ?
  `;
    await connection.execute(sql[
        data.id]);

}


module.exports = {
    connectToMySql,
    inserDataToMySql,
    updateDataInMysql,
    deleteDataInMysql
}