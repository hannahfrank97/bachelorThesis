const { Kafka } = require('kafkajs');
const {
    updateDataInMysql,
    insertDataToMySql,
    connectToMySql,
    insertPassengerMySql,
    insertFlightMySql,
    insertTicketMySql,
    countMySQL
} = require('./services/mysqlService');

const {
    insertDataToMongo,
    updateDataInMongo,
    connectToMongo,
    insertPassengerMongo,
    insertFlightMongo,
    insertTicketMongo,
    countMongo
} = require('./services/mongoDBService');

// Kafka Configuration
const kafka = new Kafka({
    clientId: 'sync-service',
    brokers: ['kafka:9092'],
});

// Kafka Consumer
const consumer = kafka.consumer({ groupId: 'sync-group' });

async function initialize() {
    try {
        console.log('Initializing MySQL connection...');
        await connectToMySql();
        console.log('MySQL connection initialized successfully.');

        console.log('Initializing MongoDB connection...');
        await connectToMongo();
        console.log('MongoDB connection initialized successfully.');
    } catch (error) {
        console.error('Failed to initialize MySQL or MongoDB connection:', error);
        throw error;
    }
}

async function startConsumer() {
    try {
        await initialize();

        console.log('Starting Kafka Consumer...');
        await consumer.connect();
        console.log('Kafka Consumer connected.');

        await consumer.subscribe({
            topics: [
                'mysql.mysql_database.DATA',
                'mongodb.mongo_database.DATA',
                'mysql.mysql_database.Passenger',
                'mysql.mysql_database.Flight',
                'mysql.mysql_database.Ticket',
                'mongodb.mongo_database.Passenger',
                'mongodb.mongo_database.Flight',
                'mongodb.mongo_database.Ticket'
            ],
            fromBeginning: true
        });

        console.log('Subscribed to topics.');

        await consumer.run({
            eachMessage: async ({ topic, message }) => {
                console.log(`📩 Received Kafka message from ${topic}`);

                if (!message || !message.value) {
                    console.error("❌ Error: Received null message or missing value.");
                    return;
                }

                let msgValue;
                try {
                    msgValue = message.value.toString();
                } catch (err) {
                    console.error("❌ Error converting message.value to string:", err);
                    return;
                }

                try {
                    const data = JSON.parse(msgValue);
                    const op = data.op || data.__op || '';

                    if (topic.includes('mysql')) {
                        await handleMySQLtoMongo(op, data, topic);
                    } else if (topic.includes('mongo_database')) {
                        await handleMongotoMySQL(op, data, topic);
                    }
                } catch (err) {
                    console.error("❌ JSON Parsing Error:", err);
                }
            },
        });

    } catch (error) {
        console.error('Failed to start consumer:', error);
    }
}

// MySQL → MongoDB Sync
async function handleMySQLtoMongo(op, data, topic) {
    console.log(`[MySQL->MongoDB] Operation: ${op}`);

    try {
        let cleanData;

        if (topic.includes('DATA')) {
            cleanData = {
                id: data.id,
                first_name: data.first_name,
                last_name: data.last_name,
                email: data.email,
                address: data.address,
                address2: data.address2,
                products: data.products,
                car: data.car,
                moviegenre: data.moviegenre
            };
        } else if (topic.includes('Passenger')) {
            cleanData = { id: data.id, name: data.name, email: data.email };
        } else if (topic.includes('Flight')) {
            cleanData = { id: data.id, flight_number: data.flight_number, destination: data.destination };
        } else if (topic.includes('Ticket')) {
            cleanData = { id: data.id, passenger_id: data.passenger_id, flight_id: data.flight_id, seat: data.seat };
        }

        if (op === 'c') {
            if (topic.includes('DATA')) await insertDataToMongo(cleanData);
            else if (topic.includes('Passenger')) await insertPassengerMongo(cleanData);
            else if (topic.includes('Flight')) await insertFlightMongo(cleanData);
            else if (topic.includes('Ticket')) await insertTicketMongo(cleanData);

            console.log(`[MySQL->MongoDB] Inserted ${topic} data with ID ${cleanData.id}`);
        } else if (op === 'u') {
            if (topic.includes('DATA')) await updateDataInMongo(cleanData);

            console.log(`[MySQL->MongoDB] Updated ${topic} data with ID ${cleanData.id}`);
        }
    } catch (err) {
        console.error('[MySQL->MongoDB] Error:', err);
    }
}

// MongoDB → MySQL Sync
async function handleMongotoMySQL(op, data, topic) {
    console.log(`[MongoDB->MySQL] Operation: ${op}`);

    try {
        let afterDoc = {};
        if (data.after) {
            afterDoc = typeof data.after === 'string' ? JSON.parse(data.after) : data.after;
        }

        let resolvedId = afterDoc.id || (afterDoc._id ? afterDoc._id.$oid : null);

        if (!resolvedId) {
            console.warn("[MongoDB->MySQL] ⚠️ No valid ID found");
            return;
        }

        let cleanData;

        if (topic.includes('DATA')) {
            cleanData = {
                id: resolvedId,
                first_name: afterDoc.first_name || null,
                last_name: afterDoc.last_name || null,
                email: afterDoc.email || null,
                address: afterDoc.address || null,
                address2: afterDoc.address2 || null,
                products: afterDoc.products || null,
                car: afterDoc.car || null,
                moviegenre: afterDoc.moviegenre || null
            };
        } else if (topic.includes('Passenger')) {
            cleanData = { id: resolvedId, name: afterDoc.name, email: afterDoc.email };
        } else if (topic.includes('Flight')) {
            cleanData = { id: resolvedId, flight_number: afterDoc.flight_number, destination: afterDoc.destination };
        } else if (topic.includes('Ticket')) {
            cleanData = { id: resolvedId, passenger_id: afterDoc.passenger_id, flight_id: afterDoc.flight_id, seat: afterDoc.seat };
        }

        if (op === 'c') {
            if (topic.includes('DATA')) await insertDataToMySql(cleanData);
            else if (topic.includes('Passenger')) await insertPassengerMySql(cleanData);
            else if (topic.includes('Flight')) await insertFlightMySql(cleanData);
            else if (topic.includes('Ticket')) await insertTicketMySql(cleanData);

            console.log(`[MongoDB->MySQL] Inserted ${topic} data with ID ${cleanData.id}`);
        } else if (op === 'u') {
            if (topic.includes('DATA')) await updateDataInMysql(cleanData);

            console.log(`[MongoDB->MySQL] Updated ${topic} data with ID ${cleanData.id}`);
        }
    } catch (err) {
        console.error('[MongoDB->MySQL] ❌ Error:', err);
    }
}

// Function to check data consistency
async function checkSync() {
    const mysqlCount = await countMySQL("Ticket");
    const mongoCount = await countMongo("Ticket");
    console.log(`🔍 Foreign Key Sync Check: MySQL = ${mysqlCount}, MongoDB = ${mongoCount}`);

    if (mysqlCount !== mongoCount) {
        console.warn("⚠️ Foreign Key Sync Mismatch detected!");
    } else {
        console.log("✅ Foreign Key Data is consistent!");
    }
}

module.exports = {
    startConsumer,
    checkSync
};

// Start the consumer when this file is run directly
if (require.main === module) {
    startConsumer().catch((err) => console.error('Failed to start consumer:', err));
}
