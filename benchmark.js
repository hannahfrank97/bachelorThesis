const { insertDataToMySql, updateDataInMysql, deleteDataInMysql, connectToMySql } = require('./consumer/services/mysqlService');
const { insertDataToMongo, updateDataInMongo, deleteDataInMongo, connectToMongo } = require('./consumer/services/mongoDBService');
const faker = require('faker');
const fs = require('fs');

const testSizes = [30, 60, 100, 500, 1000, 2000];
const POLLING_INTERVAL = 20; // in ms

async function runTests() {
    await connectToMySql();
    await connectToMongo();

    let results = [];

    for (let size of testSizes) {
        console.log(`🔹 Testing with ${size} records...`);

        let testData = generateTestData(size);

        // 1️⃣ Insert-Test
        let start = Date.now();
        await insertBulkData(testData);
        let mysqlSyncTime = await waitForSync(size);
        let end = Date.now();
        let insertTime = end - start;

        // 2️⃣ Update-Test
        let updatedData = testData.map(d => ({ ...d, last_name: "Updated" }));
        start = Date.now();
        await updateBulkData(updatedData);
        let updateSyncTime = await waitForSync(size);
        end = Date.now();
        let updateTime = end - start;

        // 3️⃣ Delete-Test
        start = Date.now();
        await deleteBulkData(testData);
        let deleteSyncTime = await waitForDelete(size);
        end = Date.now();
        let deleteTime = end - start;

        // Saves the results in an array
        results.push({ size, insertTime, updateTime, deleteTime });
        console.log(`✅ Done for ${size} records!`);
    }

    // Saves the results in a json file
    fs.writeFileSync('sync_results.json', JSON.stringify(results, null, 2));
    console.log("📄 Results saved to sync_results.json");
}

// 🔹 Generating fake data for testing
function generateTestData(size) {
    return Array.from({ length: size }, (_, i) => ({
        id: i + 1,
        first_name: faker.name.firstName(),
        last_name: faker.name.lastName(),
        email: faker.internet.email(),
        address: faker.address.streetAddress(),
        address2: faker.address.secondaryAddress(),
        products: faker.commerce.productName(),
        car: faker.vehicle.manufacturer(),
        moviegenre: faker.music.genre(),
        slogan: faker.company.catchPhrase()
    }));
}

// 🔹 Inserting the fake data into MySQL & MongoDB
async function insertBulkData(data) {
    for (let d of data) {
        await insertDataToMySql(d);
        await insertDataToMongo(d);
    }
}

// 🔹 Updating the fake data in MySQL & MongoDB
async function updateBulkData(data) {
    for (let d of data) {
        await updateDataInMysql(d);
        await updateDataInMongo(d);
    }
}

// 🔹 Deleting the fake data from MySQL & MongoDB
async function deleteBulkData(data) {
    for (let d of data) {
        await deleteDataInMysql(d.id);
        await deleteDataInMongo(d.id);
    }
}

// 🔹 Makes sure that MySQL & MongoDB are in sync
async function waitForSync(expectedCount) {
    let start = Date.now();
    let count = 0;

    while (count < expectedCount) {
        await new Promise(resolve => setTimeout(resolve, POLLING_INTERVAL));
        count = await checkSync();
    }

    return Date.now() - start;
}

// 🔹 Checks when the data is deleted from MySQL & MongoDB
async function waitForDelete(expectedCount) {
    let start = Date.now();
    let count = expectedCount;

    while (count > 0) {
        await new Promise(resolve => setTimeout(resolve, POLLING_INTERVAL));
        count = await checkSync();
    }

    return Date.now() - start;
}

// 🔹 Checks if the data in both databases are in sync
async function checkSync() {
    const mysqlCount = await countMySQL();
    const mongoCount = await countMongo();
    return Math.min(mysqlCount, mongoCount);
}

// 🔹 Counts the number of records in MySQL
async function countMySQL() {
    const [rows] = await connection.execute("SELECT COUNT(*) as count FROM DATA");
    return rows[0].count;
}

// 🔹 Counts the number of records in MongoDB
async function countMongo() {
    return await collection.countDocuments();
}

// Starting the tests
runTests().catch(console.error);
