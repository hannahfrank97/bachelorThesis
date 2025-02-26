const mysql = require('mysql2/promise');

let connection;

/**
 * Initializing MongoDB to MySQL.
 */
async function connectToMySql() {
    if (!connection) {
        try {
            connection = await mysql.createConnection({
                host: 'mysql',
                user: 'root',
                password: 'test',
                database: 'mysql_database'
            });
            console.log("Connected to MySQL");
            return connection;
        } catch (err) {
            console.error("Error connecting to MySQL:", err);
            throw err;
        }

    }
    return connection;
}

/**
 * Adding data to mysql or updating it if it already exists.
 * @param {Object} data - the data that should be inserted or updated
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
        moviegenre: data.moviegenre || null
    };

    const sql = `
        INSERT INTO DATA
        (id, first_name, last_name, email, address, address2, products, car, moviegenre)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
            first_name = VALUES(first_name),
            last_name = VALUES(last_name),
            email = VALUES(email),
            address = VALUES(address),
            address2 = VALUES(address2),
            products = VALUES(products),
            car = VALUES(car),
            moviegenre = VALUES(moviegenre)
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
            sanitizedData.moviegenre
        ]);
        console.log(`[MySQLService] Data with id ${sanitizedData.id} inserted/updated successfully.`);
    } catch (err) {
        console.error("Error in insertDataToMySql:", err);
        throw err;
    }
}

/**
 * Updating data in MySQL.
 * @param {Object} data
 */
async function updateDataInMysql(data) {
    const sql = `
        UPDATE DATA
        SET first_name = ?, last_name = ?, email = ?, address = ?, address2 = ?, products = ?, car = ?, moviegenre = ?
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
 * Deletes the data with the given ID from MySQL.
 * @param {number} id - the ID of the data to delete
 */
async function deleteDataInMysql(id) {
    if (typeof id !== "number") {
        console.error("❌ Fehler: deleteDataInMysql erwartet eine Zahl, erhalten:", id);
        return;
    }

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

async function insertPassengerMySql(passenger) {
    if (!connection) {
        await connectToMySql();
    }

    const sql = `INSERT INTO Passenger (id, name, email) VALUES (?, ?, ?)`;
    await connection.execute(sql, [passenger.id, passenger.name, passenger.email]);
    console.log(`✅ Inserted Passenger ${passenger.id} into MySQL`);
}


async function insertFlightMySql(flight) {
    const sql = `INSERT INTO Flight (id, flight_number, destination) VALUES (?, ?, ?)`;
    await connection.execute(sql, [flight.id, flight.flight_number, flight.destination]);
    console.log(`✅ Inserted Flight ${flight.id}`);
}

async function insertTicketMySql(ticket) {
    try {
        const sql = `INSERT INTO Ticket (id, passenger_id, flight_id, seat) VALUES (?, ?, ?, ?)`;
        await connection.execute(sql, [ticket.id, ticket.passenger_id, ticket.flight_id, ticket.seat]);
        console.log(`✅ Inserted Ticket ${ticket.id}`);
    } catch (err) {
        console.error(`❌ Ticket insert failed for ${ticket.id}: ${err.message}`);
    }
}

// 🔹 Counts the amount of entries in MySQL
async function countMySQL() {
    if (!connection) {
        connection = await connectToMySql();
    }
    const [rows] = await connection.execute("SELECT COUNT(*) as count FROM DATA");
    return rows[0].count;
}


module.exports = {
    insertDataToMySql,
    updateDataInMysql,
    deleteDataInMysql,
    connectToMySql,
    connection,
    insertTicketMySql,
    insertFlightMySql,
    insertPassengerMySql,
    countMySQL
};
