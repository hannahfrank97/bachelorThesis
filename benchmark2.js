const {
    insertPassengerMySql,
    insertFlightMySql,
    insertTicketMySql,
    countMySQL
} = require('./consumer/services/mysqlService');

const {
    connectToMongo,
    insertPassengerMongo,
    insertFlightMongo,
    insertTicketMongo,
    countMongo
} = require('./consumer/services/mongoDBService');

async function testForeignKeyHandling() {
    console.log("🚀 Starting Foreign Key Test...");

    await connectToMongo();

    let flight = { id: 1, flight_number: "LH123", destination: "Berlin" };
    let passenger = { id: 1, name: "Alice", email: "alice@example.com" };
    let ticket = { id: 1, passenger_id: 1, flight_id: 1, seat: "12A" };

    console.log("🔹 Trying to insert Ticket first (should fail)");
    await insertTicketMySql(ticket);
    await insertTicketMongo(ticket);

    console.log("🔹 Inserting Passenger and Flight");
    await insertPassengerMySql(passenger);
    await insertPassengerMongo(passenger);
    await insertFlightMySql(flight);
    await insertFlightMongo(flight);

    console.log("🔹 Retrying Ticket Insertion");
    await insertTicketMySql(ticket);
    await insertTicketMongo(ticket);

    console.log("✅ Foreign Key Test completed!");
}

async function checkForeignKeySync() {
    await connectToMongo();

    const mysqlCount = await countMySQL("Ticket");
    const mongoCount = await countMongo("Ticket");

    console.log(`🔍 Foreign Key Sync Check: MySQL = ${mysqlCount}, MongoDB = ${mongoCount}`);

    if (mysqlCount !== mongoCount) {
        console.warn("⚠️ Foreign Key Sync Mismatch detected!");
    } else {
        console.log("✅ Foreign Key Data is consistent!");
    }
}

// **Run Tests**
(async () => {
    await testForeignKeyHandling();
    await checkForeignKeySync();
})();
