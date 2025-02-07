db = db.getSiblingDB("mongo_database");

db.createCollection("DATA");

db.DATA.createIndex({ id: 1 }, { unique: true });

