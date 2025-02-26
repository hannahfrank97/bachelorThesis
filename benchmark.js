const {
    insertDataToMySql,
    updateDataInMysql,
    deleteDataInMysql,
    connectToMySql,
    countMySQL
} = require('./consumer/services/mysqlService');
const {
    insertDataToMongo,
    updateDataInMongo,
    deleteDataInMongo,
    connectToMongo,
    countMongo
} = require('./consumer/services/mongoDBService');
const { faker } = require('@faker-js/faker');
const fs = require('fs');

const testSizes = [30, 60, 100, 500, 1000, 2000];
const POLLING_INTERVAL = 20; // in ms

let collections;
let collection;

async function runTests() {
    await connectToMySql();
    collections = await connectToMongo();
    collection = collections.dataCollection;

    let results = [];
    let latencyResults = [];

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


        latencyResults.push({
            size,
            insertLatency: insertTimes.latency,
            updateLatency: updateTimes.latency,
            deleteLatency: deleteTimes.latency
        });

    // Save results to a json file
         console.log(`✅ Done for ${size} records!`);

    }

    // Save  full sync results
    fs.writeFileSync('sync_results_v3.json', JSON.stringify(results, null, 2));
    console.log("📄 Results saved to sync_results_v3.json");

    // Save latency results
    fs.writeFileSync('latency_results.json', JSON.stringify(latencyResults, null, 2));
    console.log("📄 Results saved to latency_results.json");
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
    console.log(`⏳ Measuring ${operation} latency and total time for ${data.length} records...`);

    let expectedCount = data.length;

    // 🔹 1️⃣ Latenzzeit messen (bis 1. Eintrag in MongoDB)
    let startLatency = Date.now();

    if (operation === "delete") {
        for (let d of data) {
            console.log(`🗑️ Deleting in MySQL: ID=${d.id}`);
            await mysqlFunc(d.id); // Hier übergeben wir nur die ID!
        }
    } else {
        for (let d of data) {
            await mysqlFunc(d); // Für Insert/Update bleibt es gleich
        }
    }

    while (await countMongo("DATA") < expectedCount) {
        await new Promise(resolve => setTimeout(resolve, POLLING_INTERVAL));
    }

    let endLatency = Date.now();
    let mysqlToMongoLatency = endLatency - startLatency;

    // 🔹 2️⃣ Gesamtsynchronisationszeit messen (bis vollständiger Sync)
    let startTotalSync = Date.now();

    await waitForSync(expectedCount);

    let endTotalSync = Date.now();
    let mysqlToMongoTotalTime = endTotalSync - startTotalSync;

    console.log(`✅ ${operation} times: Latency = ${mysqlToMongoLatency}ms, Total Sync Time = ${mysqlToMongoTotalTime}ms`);

    return {
        latency: mysqlToMongoLatency,  // Nur bis 1. Datensatz sichtbar ist
        totalSyncTime: mysqlToMongoTotalTime // Bis vollständige Synchronisation abgeschlossen ist
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
    const mysqlCount = await countMySQL("DATA");
    const mongoCount = await countMongo("DATA");
    console.log(`🔍 Sync Check: MySQL = ${mysqlCount}, MongoDB = ${mongoCount}`);

    return Math.min(mysqlCount, mongoCount);
}

// Run the tests
runTests().catch(console.error);
