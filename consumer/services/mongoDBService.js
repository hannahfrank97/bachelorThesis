const { MongoClient } = require('mongodb');

let client;
let collections;

async function connectToMongo() {
    if (!client) {
        const uri = 'mongodb://root:test@mongo-container:27017/?authSource=admin';
        client = new MongoClient(uri);
        await client.connect();
        console.log("✅ Connected to MongoDB");
    }

    const db = client.db('mongo_database');

    collections = {
        dataCollection: db.collection('DATA'),
        passengerCollection: db.collection('Passenger'),
        flightCollection: db.collection('Flight'),
        ticketCollection: db.collection('Ticket')
    };

    return collections;
}

async function insertDataToMongo(data) {
    try {
        // Sicherstellen, dass collections existiert
        if (!collections || !collections.dataCollection) {
            console.error("❌ Error: MongoDB 'dataCollection' is not initialized!");
            return;
        }

        const result = await collections.dataCollection.updateOne(
            { id: data.id },
            { $set: data },
            { upsert: true }
        );

        console.log(`✅ [MongoDBService] Data with id ${data.id} inserted/updated successfully.`);
    } catch (err) {
        console.error("❌ Error in insertDataToMongo:", err);
        throw err;
    }
}

async function updateDataInMongo(data) {
    if (!collections || !collections.dataCollection) {
        console.error("❌ Error: MongoDB 'dataCollection' is not initialized!");
        return;
    }

    const { id, _id, ...fieldsToUpdate } = data;
    await collections.dataCollection.updateOne(
        { id: id },
        { $set: fieldsToUpdate }
    );
}

async function deleteDataInMongo(id) {
    if (!collections || !collections.dataCollection) {
        console.error("❌ Error: MongoDB 'dataCollection' is not initialized!");
        return;
    }

    console.log(`🗑️ Deleting from MongoDB: ID ${id}`);
    const result = await collections.dataCollection.deleteOne({ id: id });
    console.log(`Delete result:`, result);
}

async function insertPassengerMongo(passenger) {
    if (!collections || !collections.passengerCollection) {
        console.error("❌ Error: MongoDB 'passengerCollection' is not initialized!");
        return;
    }

    await collections.passengerCollection.insertOne(passenger);
    console.log(`✅ Inserted Passenger ${passenger.id} into MongoDB`);
}

async function insertFlightMongo(flight) {
    if (!collections || !collections.flightCollection) {
        console.error("❌ Error: MongoDB 'flightCollection' is not initialized!");
        return;
    }

    await collections.flightCollection.insertOne(flight);
    console.log(`✅ Inserted Flight ${flight.id} into MongoDB`);
}

async function insertTicketMongo(ticket) {
    if (!collections || !collections.ticketCollection) {
        console.error("❌ Error: MongoDB 'ticketCollection' is not initialized!");
        return;
    }

    const passengerExists = await collections.passengerCollection.findOne({ id: ticket.passenger_id });
    const flightExists = await collections.flightCollection.findOne({ id: ticket.flight_id });

    if (!passengerExists || !flightExists) {
        console.error(`❌ Ticket insert failed: Missing Passenger ${ticket.passenger_id} or Flight ${ticket.flight_id}`);
        return;
    }

    await collections.ticketCollection.insertOne(ticket);
    console.log(`✅ Inserted Ticket ${ticket.id} into MongoDB`);
}

async function countMongo(collectionName) {
    if (!collections) {
        console.error("❌ Error: MongoDB collections are not initialized!");
        return 0;
    }

    let targetCollection;
    if (collectionName === "Passenger") targetCollection = collections.passengerCollection;
    else if (collectionName === "Flight") targetCollection = collections.flightCollection;
    else if (collectionName === "Ticket") targetCollection = collections.ticketCollection;
    else if (collectionName === "DATA") targetCollection = collections.dataCollection;

    if (!targetCollection) {
        console.error(`❌ Error: Unknown collection '${collectionName}'`);
        return 0;
    }

    return await targetCollection.countDocuments();
}

module.exports = {
    insertDataToMongo,
    updateDataInMongo,
    deleteDataInMongo,
    connectToMongo,
    insertPassengerMongo,
    insertFlightMongo,
    insertTicketMongo,
    countMongo
};
