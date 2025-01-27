const {MongoClient} = require('mongodb');

let collection;

async function connectToMongo() {
    const uri = 'mongodb://root:test@mongo-container:27017/?authSource=admin';
    const client = new MongoClient(uri, {useUnifiedTopology: true});
    await client.connect();
    const db = client.db('mongo_database');
    collection = db.collection('DATA');
    console.log("Connected to MongoDB");
    return collection;
}

async function insertDataToMongo(data) {
    await collection.insertOne(data);
}

async function updateDataInMongo(data) {
    const {id, ...fieldsToUpdate} = data;
    await collection.updateOne(
        {id: id},
        {$set: fieldsToUpdate}
    );
}

async function deleteDataInMongo(id) {
    await collection.deleteOne({id: id});
}


module.exports = {
    insertDataToMongo,
    updateDataInMongo,
    deleteDataInMongo,
    connectToMongo,
}