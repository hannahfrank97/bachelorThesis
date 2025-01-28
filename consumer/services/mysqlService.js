const mysql = require('mysql2/promise');

let connection;

/**
 * Initialisiert die MySQL-Verbindung.
 */
async function connectToMySql() {
    try {
        connection = await mysql.createConnection({
            host: 'mysql-container', // Name des MySQL-Containers im Docker-Netzwerk
            user: 'root',
            password: 'test',
            database: 'mysql_database'
        });
        console.log("Connected to MySQL");
        return connection;
    } catch (err) {
        console.error("Error connecting to MySQL:", err);
        throw err; // Weiterwerfen des Fehlers zur Handhabung im Consumer
    }
}

/**
 * Fügt Daten in MySQL ein oder aktualisiert sie bei Konflikten.
 * @param {Object} data - Die Daten, die eingefügt oder aktualisiert werden sollen.
 */
async function insertDataToMySql(data) {
    if (!connection) {
        await connectToMySql();
    }

    // Validate that we have an ID before proceeding
    if (!data.id) {
        throw new Error('ID is required for MySQL insertion');
    }

    // Convert undefined values to null and remove MongoDB-specific fields
    const sanitizedData = {
        id: data.id, // Don't allow null for ID
        first_name: data.first_name || null,
        last_name: data.last_name || null,
        email: data.email || null,
        address: data.address || null,
        address2: data.address2 || null,
        products: data.products || null,
        car: data.car || null,
        moviegenre: data.moviegenre || null,
        slogan: data.slogan || null
    };

    const sql = `
        INSERT INTO DATA
        (id, first_name, last_name, email, address, address2, products, car, moviegenre, slogan)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
            first_name = VALUES(first_name),
            last_name = VALUES(last_name),
            email = VALUES(email),
            address = VALUES(address),
            address2 = VALUES(address2),
            products = VALUES(products),
            car = VALUES(car),
            moviegenre = VALUES(moviegenre),
            slogan = VALUES(slogan)
    `;

    try {
        await connection.execute(sql, [
            sanitizedData.id,
            sanitizedData.first_name,
            sanitizedData.last_name,
            sanitizedData.email,
            sanitizedData.address,
            sanitizedData.address2,
            sanitizedData.products,
            sanitizedData.car,
            sanitizedData.moviegenre,
            sanitizedData.slogan
        ]);
        console.log(`[MySQLService] Data with id ${sanitizedData.id} inserted/updated successfully.`);
    } catch (err) {
        console.error("Error in insertDataToMySql:", err);
        throw err;
    }
}

/**
 * Aktualisiert Daten in MySQL.
 * @param {Object} data - Die Daten, die aktualisiert werden sollen.
 */
async function updateDataInMysql(data) {
    const sql = `
        UPDATE DATA
        SET first_name = ?, last_name = ?, email = ?, address = ?, address2 = ?, products = ?, car = ?, moviegenre = ?, slogan = ?
        WHERE id = ?
    `;
    const values = [
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
    ];

    try {
        await connection.execute(sql, values);
        console.log(`[MySQLService] Data with id ${data.id} updated successfully.`);
    } catch (err) {
        console.error("Error in updateDataInMysql:", err);
        throw err;
    }
}

/**
 * Löscht Daten aus MySQL basierend auf der ID.
 * @param {number} id - Die ID der zu löschenden Daten.
 */
async function deleteDataInMysql(id) {
    const sql = `
        DELETE FROM DATA
        WHERE id = ?
    `;
    try {
        await connection.execute(sql, [id]);
        console.log(`[MySQLService] Data with id ${id} deleted successfully.`);
    } catch (err) {
        console.error("Error in deleteDataInMysql:", err);
        throw err;
    }
}

module.exports = {
    insertDataToMySql,
    updateDataInMysql,
    deleteDataInMysql,
    connectToMySql
};
