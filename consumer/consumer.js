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
    } catch (error) {
        console.error('Failed to initialize MySQL connection:', error);
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
                const msgValue = message.value.toString();
                console.log(`Received message: ${msgValue} on topic ${topic}, partition ${partition}`);

                try {
                    const data = JSON.parse(msgValue);
                    const op = data.op || data.__op || '';
                    
                    console.log('Parsed data:', data);
                    console.log('Operation:', op);

                    if (topic.includes('mysql')) {
                        await handleMySQLtoMongo(op, data);
                    } else if (topic.includes('mongo_database')) {
                        await handleMongotoMySQL(op, data);
                    }
                } catch (err) {
                    console.error('Error processing Kafka message:', err);
                    console.error('Message content:', msgValue);
                }
            },
        });
    } catch (error) {
        console.error('Error during startup:', error);
        throw error;
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
            moviegenre: data.moviegenre,
            slogan: data.slogan
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
        // Clean up the MongoDB data before sending to MySQL
        const cleanData = {
            // Ensure we get the id, with a fallback chain
            id: data.id || (data._id ? parseInt(data._id.toString(), 10) : null),
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

        // Only proceed if we have a valid ID
        if (!cleanData.id) {
            throw new Error('Invalid or missing ID in data');
        }

        if (op === 'c') {
            await insertDataToMySql(cleanData);
        } else if (op === 'u') {
            await updateDataInMysql(cleanData);
        } else if (op === 'd') {
            await deleteDataInMysql(cleanData.id);
        }
    } catch (err) {
        console.error('[MongoDB->MySQL] Error:', err);
    }
}

module.exports = {
    startConsumer,
};

// Starting the consumer only when this file is run directly
if (require.main === module) {
    startConsumer().catch((err) => console.error('Failed to start consumer:', err));
}
