const { MongoClient } = require('mongodb');

let client;
let collection;
let collectionPassenger;
let collectionFlight;
let collectionTicket;

async function connectToMongo() {
    if (!client) {
        const uri = 'mongodb://root:test@mongo-container:27017/?authSource=admin';
        client = new MongoClient(uri, { useUnifiedTopology: true });
        await client.connect();
        console.log("✅ Connected to MongoDB");
    }

    const db = client.db('mongo_database');
    collection = db.collection('DATA');
    collectionPassenger = db.collection('Passenger');
    collectionFlight = db.collection('Flight');
    collectionTicket = db.collection('Ticket');

    return { collection, collectionPassenger, collectionFlight, collectionTicket };
}


async function insertDataToMongo(data) {
    try {
        const result = await collection.updateOne(
            { id: data.id }, // does the id exist?
            { $set: data },  // if so -> update
            { upsert: true } // if no -> insert
        );
        console.log(`✅ [MongoDBService] Data with id ${data.id} inserted/updated successfully.`);
    } catch (err) {
        console.error("❌ Error in insertDataToMongo:", err);
        throw err;
    }
}


async function updateDataInMongo(data) {
    const {id, _id, ...fieldsToUpdate} = data;
    await collection.updateOne(
        {id: id},
        {$set: fieldsToUpdate}
    );
}

async function deleteDataInMongo(id) {
    console.log(`🗑️ Deleting from MongoDB: ID ${id}`);
    const result = await collection.deleteOne({ id: id });
    console.log(`Delete result:`, result);
}


async function insertPassengerMongo(passenger) {
    await collectionPassenger.insertOne(passenger);
    console.log(`✅ Inserted Passenger ${passenger.id} into MongoDB`);
}

async function insertFlightMongo(flight) {
    await collectionFlight.insertOne(flight);
    console.log(`✅ Inserted Flight ${flight.id} into MongoDB`);
}

async function insertTicketMongo(ticket) {
    const passengerExists = await collectionPassenger.findOne({ id: ticket.passenger_id });
    const flightExists = await collectionFlight.findOne({ id: ticket.flight_id });

    if (!passengerExists || !flightExists) {
        console.error(`❌ Ticket insert failed: Missing Passenger ${ticket.passenger_id} or Flight ${ticket.flight_id}`);
        return;
    }

    await collectionTicket.insertOne(ticket);
    console.log(`✅ Inserted Ticket ${ticket.id} into MongoDB`);
}

async function countMongo(collectionName) {
    let collection;
    if (collectionName === "Passenger") collection = collectionPassenger;
    if (collectionName === "Flight") collection = collectionFlight;
    if (collectionName === "Ticket") collection = collectionTicket;
    return await collection.countDocuments();
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
}