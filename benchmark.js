const {
    insertDataToMySql,
    updateDataInMysql,
    deleteDataInMysql,
    connectToMySql
} = require('./consumer/services/mysqlService');
const {
    insertDataToMongo,
    updateDataInMongo,
    deleteDataInMongo,
    connectToMongo
} = require('./consumer/services/mongoDBService');
const { faker } = require('@faker-js/faker');
const fs = require('fs');

const testSizes = [30, 60, 100, 500, 1000, 2000];
const POLLING_INTERVAL = 20; // in ms

let collection;
let connection;

async function runTests() {
    await connectToMySql();
    collection = await connectToMongo();

    let results = [];

    for (let size of testSizes) {
        console.log(`🔹 Testing with ${size} records...`);
        let testData = generateTestData(size);

        // 🔹 1️⃣ Insert-Test
        let insertTimes = await measureSyncTime(testData, insertDataToMySql, insertDataToMongo, "insert");

        // 🔹 2️⃣ Update-Test
        let updatedData = testData.map(d => ({ ...d, last_name: "Updated" }));
        let updateTimes = await measureSyncTime(updatedData, updateDataInMysql, updateDataInMongo, "update");

        // 🔹 3️⃣ Delete-Test
        let deleteTimes = await measureSyncTime(testData, deleteDataInMysql, deleteDataInMongo, "delete");

        results.push({
            size,
            insertTime: insertTimes.mysqlToMongo,
            insertTimeReverse: insertTimes.mongoToMysql,
            updateTime: updateTimes.mysqlToMongo,
            updateTimeReverse: updateTimes.mongoToMysql,
            deleteTime: deleteTimes.mysqlToMongo,
            deleteTimeReverse: deleteTimes.mongoToMysql
        });

        console.log(`✅ Done for ${size} records!`);
    }

    // Save results to a json file
    fs.writeFileSync('sync_results_v3.json', JSON.stringify(results, null, 2));
    console.log("📄 Results saved to sync_results_v3.json");
}

// 🔹 Generates fake test data
function generateTestData(size) {
    return Array.from({ length: size }, (_, i) => ({
        id: i + 1,
        first_name: faker.person.firstName(),
        last_name: faker.person.lastName(),
        email: faker.internet.email(),
        address: faker.location.streetAddress(),
        address2: faker.location.secondaryAddress(),
        products: faker.commerce.productName(),
        car: faker.vehicle.manufacturer(),
        moviegenre: faker.music.genre()
    }));
}

// 🔹 Calculates the synchronization time for MySQL and MongoDB
async function measureSyncTime(data, mysqlFunc, mongoFunc, operation) {
    console.log(`⏳ Measuring ${operation} latency for ${data.length} records...`);

    let startMysqlToMongo = Date.now();

    if (operation === "delete") {
        for (let d of data) {
            console.log(`🗑️ Deleting in MySQL: ID=${d.id}, Type=${typeof d.id}`);
            await mysqlFunc(d.id); // Deleting first in MySQL
        }
    } else {
        for (let d of data) {
            await mysqlFunc(d); // Inserting/Updating first in MySQL
        }
    }

    console.log("⏳ Waiting for Debezium sync (MySQL → MongoDB)...");
    await new Promise(resolve => setTimeout(resolve, 2000)); // waiting for 2 seconds for Debezium Sync

    let mysqlToMongoSyncTime = await waitForSync(data.length);
    let endMysqlToMongo = Date.now();

    let startMongoToMysql = Date.now();

    if (operation === "delete") {
        for (let d of data) {
            console.log(`🗑️ Deleting in MongoDB: ID=${d.id}, Type=${typeof d.id}`);
            await mongoFunc(d.id); // Then -> deleting in MongoDB
        }
    } else {
        for (let d of data) {
            await mongoFunc(d); // And then inserting/updating in MongoDB
        }
    }

    console.log("⏳ Waiting for Debezium sync (MongoDB → MySQL)...");
    await new Promise(resolve => setTimeout(resolve, 2000)); // Waiting for 2 seconds for Debezium Sync

    let mongoToMysqlSyncTime = await waitForSync(data.length);
    let endMongoToMysql = Date.now();

    let totalMysqlToMongo = endMysqlToMongo - startMysqlToMongo;
    let totalMongoToMysql = endMongoToMysql - startMongoToMysql;

    console.log(`✅ ${operation} sync time: MySQL → MongoDB = ${totalMysqlToMongo}ms, MongoDB → MySQL = ${totalMongoToMysql}ms`);

    return {
        mysqlToMongo: totalMysqlToMongo,
        mongoToMysql: totalMongoToMysql
    };
}



// 🔹 Checks if Mongodb and MySQL are in sync
async function waitForSync(expectedCount) {
    let start = Date.now();
    let count = -1; // Ensure first loop runs
    let iteration = 0;

    while (count !== expectedCount && iteration < 100) { // Limit retries to prevent infinite loops
        count = await checkSync();
        console.log(`🔄 Waiting for Sync... Count: ${count}, Expected: ${expectedCount}`);

        if (expectedCount === 0 && count === 0) {
            console.log("✅ Deletion sync confirmed.");
            return Date.now() - start;
        }

        await new Promise(resolve => setTimeout(resolve, POLLING_INTERVAL));
        iteration++;
    }

    console.warn("⚠️ Sync needed too much time!");
    return Date.now() - start;
}


// 🔹 Checks the amount of synchronised data
async function checkSync() {
    const mysqlCount = await countMySQL();
    const mongoCount = await countMongo();
    console.log(`🔍 Sync Check: MySQL = ${mysqlCount}, MongoDB = ${mongoCount}`);

    return Math.min(mysqlCount, mongoCount);
}

// 🔹 Counts the amount of entries in MySQL
async function countMySQL() {
    if (!connection) {
        connection = await connectToMySql();
    }
    const [rows] = await connection.execute("SELECT COUNT(*) as count FROM DATA");
    return rows[0].count;
}

// 🔹 Counts the amount of entries in MongoDB
async function countMongo() {
    return await collection.countDocuments();
}

// Run the tests
runTests().catch(console.error);
