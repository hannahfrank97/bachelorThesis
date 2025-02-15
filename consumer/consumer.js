const { Kafka } = require('kafkajs');
const {
    updateDataInMysql,
    insertDataToMySql,
    deleteDataInMysql,
    connectToMySql,
} = require('./services/mysqlService');
const {
    insertDataToMongo,
    updateDataInMongo,
    deleteDataInMongo,
    connectToMongo,
} = require('./services/mongoDBService');

// Configuring Kafka connection
const kafka = new Kafka({
    clientId: 'sync-service',
    brokers: ['kafka:9092'],
});

// Adding Consumer
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
        // Initialize connections first
        await initialize();

        console.log('Starting Kafka Consumer...');
        await consumer.connect();
        console.log('Kafka Consumer connected.');

        // Subscribing to topics with explicit topic assignments
        await consumer.subscribe({
            topics: [
                'mysql.mysql_database.DATA',
                'mongodb.mongo_database.DATA'
            ],
            fromBeginning: true
        });

        console.log('Subscribed to topics:', [
            'mysql.mysql_database.DATA',
            'mongodb.mongo_database.DATA'
        ]);

        await consumer.run({
            eachMessage: async ({ topic, partition, message }) => {
                console.log(`📩 Received Kafka message from ${topic}, partition ${partition}`);

                if (!message || !message.value) {
                    console.error("❌ Error: Received null message or missing value.");
                    return;
                }

                let msgValue;
                try {
                    msgValue = message.value.toString();
                } catch (err) {
                    console.error("❌ Error converting message.value to string:", err);
                    console.error("❌ Message received:", message);
                    return;
                }

                console.log(`✅ Raw Kafka message value: ${msgValue}`);

                try {
                    const data = JSON.parse(msgValue);
                    console.log("✅ Parsed Kafka message:", data);

                    const op = data.op || data.__op || '';
                    console.log("✅ Operation:", op);

                    if (topic.includes('mysql')) {
                        await handleMySQLtoMongo(op, data);
                    } else if (topic.includes('mongo_database')) {
                        await handleMongotoMySQL(op, data);
                    }
                } catch (err) {
                    console.error("❌ JSON Parsing Error:", err);
                    console.error("❌ Message content:", msgValue);
                }
            },
        });

    } catch (error) {
        console.error('Failed to start consumer:', error);
    }

    }

// MySQL -> MongoDB
async function handleMySQLtoMongo(op, data) {
    console.log(`[MySQL->MongoDB] Raw operation: ${op}`);
    console.log(`[MySQL->MongoDB] Raw data:`, data);

    try {
        // Clean up the MySQL data before sending to MongoDB
        const cleanData = {
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

        console.log(`[MySQL->MongoDB] Cleaned data:`, cleanData);

        if (op === 'c') {
            await insertDataToMongo(cleanData);
            console.log(`[MySQL->MongoDB] Successfully inserted data with id ${cleanData.id}`);
        } else if (op === 'u') {
            await updateDataInMongo(cleanData);
            console.log(`[MySQL->MongoDB] Successfully updated data with id ${cleanData.id}`);
        } else if (op === 'd') {
            await deleteDataInMongo(cleanData.id);
            console.log(`[MySQL->MongoDB] Successfully deleted data with id ${cleanData.id}`);
        }
    } catch (err) {
        console.error('[MySQL->MongoDB] Error:', err);
    }
}

// MongoDB -> MySQL
async function handleMongotoMySQL(op, data) {
    console.log(`[MongoDB->MySQL] Operation: ${op}, Data:`, data);

    try {
        let afterDoc = {};
        if (data.after) {
            try {
                afterDoc = typeof data.after === 'string' ? JSON.parse(data.after) : data.after;
            } catch (parseError) {
                console.error('[MongoDB->MySQL] Error parsing data.after:', parseError);
                throw parseError;
            }
        }
        console.log('[MongoDB->MySQL] Parsed afterDoc:', afterDoc);

        let resolvedId = null;

        if (afterDoc.hasOwnProperty('id')) {
            resolvedId = afterDoc.id;
            console.log(`[MongoDB->MySQL] ✅ Found id directly in afterDoc:`, resolvedId, `(Type: ${typeof resolvedId})`);
        }

        if (!resolvedId && afterDoc._id && afterDoc._id.$oid) {
            resolvedId = afterDoc._id.$oid;
            console.warn('[MongoDB->MySQL] ⚠️ Using _id.$oid as fallback ID:', resolvedId);
        }

        if (resolvedId !== null) {
            console.log(`[MongoDB->MySQL] ✅ Final resolvedId:`, resolvedId, `(Type: ${typeof resolvedId})`);
        } else {
            console.warn(`[MongoDB->MySQL] ⚠️ No valid ID could be resolved`);
        }

        const cleanData = {
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

        console.log('[MongoDB->MySQL] ✅ Clean data:', cleanData);
        console.log('[MongoDB->MySQL] ✅ cleanData.id:', cleanData.id, `(Type: ${typeof cleanData.id})`);

        if (!cleanData.id || (typeof cleanData.id === 'number' && isNaN(cleanData.id))) {
            console.error(`[MongoDB->MySQL] ❌ Invalid ID detected:`, cleanData.id);
            throw new Error('Invalid or missing ID in data: ' + JSON.stringify(cleanData));
        }

        if (op === 'c') {
            await insertDataToMySql(cleanData);
        } else if (op === 'u') {
            await updateDataInMysql(cleanData);
        } else if (op === 'd') {
            console.log(`[MongoDB->MySQL] Received DELETE request for ID: ${data.id}`);
            await deleteDataInMysql(cleanData.id);
        }
    } catch (err) {
        console.error('[MongoDB->MySQL] ❌ Error:', err);
    }
}

module.exports = {
    startConsumer,
};

// Starting the consumer only when this file is run directly
if (require.main === module) {
    startConsumer().catch((err) => console.error('Failed to start consumer:', err));
}
