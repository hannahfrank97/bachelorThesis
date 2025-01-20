const {Kafka} = require('kafkajs');
const {
    updateDataInMysql,
    inserDataToMySql,
    deleteDataInMysql,
} = require('../services/mysqlService');
const {
    insertDataToMongo,
    updateDataInMongo,
    deleteDataInMongo,
} = require('../services/mongoDBService');

// Configuring Kafka connection

const kafka = new Kafka({
    clientId: 'sync-service',
    brokers: ['kafka:9092'],
});

// Adding Consumer
const consumer = kafka.consumer({groupId: 'sync-group'});

async function startConsumer() {
    await consumer.connect();

    // Subscribing to topics
    await consumer.subscribe({topic: 'mysql.mysql_database.DATA', fromBeginning: true});
    await consumer.subscribe({topic: 'mongo_database.mongo_database.DATA', fromBeginning: true});

    await consumer.run({
        eachMessage: async ({topic, message}) => {
            const msgValue = message.value.toString();

            try {
                const payload = JSON.parse(msgValue);
                const op = payload.op; // Operation-Types: c (create), u (update), d (delete)
                const data = payload.after || payload.before || payload;

                if (topic.includes('mysql')) {
                    await handleMySQLtoMongo(op, data);
                } else if (topic.includes('mongo_database')) {
                    await handleMongotoMySQL(op, data);
                }
            } catch (err) {
                console.error('Error processing Kafka message:', err);
            }
        },
    });
}

// MySQL -> MongoDB
async function handleMySQLtoMongo(op, data) {
    try {
        if (op === 'c') {
            await insertDataToMongo(data);
        } else if (op === 'u') {
            await updateDataInMongo(data.id, data);
        } else if (op === 'd') {
            await deleteDataInMongo(data.id);
        }
    } catch (err) {
        console.error('[MySQL->MongoDB] Error:', err);
    }
}

// MongoDB -> MySQL
async function handleMongotoMySQL(op, data) {
    try {
        if (op === 'c') {
            await inserDataToMySql(data);
        } else if (op === 'u') {
            await updateDataInMysql(data);
        } else if (op === 'd') {
            await deleteDataInMysql(data.id);
        }
    } catch (err) {
        console.error('[MongoDB->MySQL] Error:', err);
    }
}

module.exports = {
    startConsumer,
};
