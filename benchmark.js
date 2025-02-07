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
        let insertTime = await measureSyncTime(testData, insertDataToMySql, insertDataToMongo, "insert");

        // 🔹 2️⃣ Update-Test
        let updatedData = testData.map(d => ({ ...d, last_name: "Updated" }));
        let updateTime = await measureSyncTime(updatedData, updateDataInMysql, updateDataInMongo, "update");

        // 🔹 3️⃣ Delete-Test
        let deleteTime = await measureSyncTime(testData, deleteDataInMysql, deleteDataInMongo, "delete");

        results.push({ size, insertTime, updateTime, deleteTime });
        console.log(`✅ Done for ${size} records!`);
    }

    // Save results to a json file
    fs.writeFileSync('sync_results.json', JSON.stringify(results, null, 2));
    console.log("📄 Results saved to sync_results.json");
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

    let start = Date.now(); // Timestamp Start
    for (let d of data) {
        await mysqlFunc(d);
        await mongoFunc(d);
    }

    let syncTime = await waitForSync(data.length);
    let end = Date.now();

    let duration = end - start;
    console.log(`⏳ ${operation} sync time: ${duration} ms`);
    return duration;
}

// 🔹 Checks if Mongodb and MySQL are in sync
async function waitForSync(expectedCount) {
    let start = Date.now();
    let count = 0;

    while (count < expectedCount) {
        await new Promise(resolve => setTimeout(resolve, POLLING_INTERVAL));
        count = await checkSync();
    }

    return Date.now() - start;
}

// 🔹 Checks the amount of synchronised data
async function checkSync() {
    const mysqlCount = await countMySQL();
    const mongoCount = await countMongo();
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
