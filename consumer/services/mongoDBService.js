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



module.exports = {
    insertDataToMongo,
    updateDataInMongo,
    deleteDataInMongo,
    connectToMongo,
}