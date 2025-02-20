db = db.getSiblingDB("mongo_database");

// Collections erstellen
db.createCollection("DATA");
db.createCollection("Passenger");
db.createCollection("Flight");
db.createCollection("Ticket");

// Seeting up Indexes
db.DATA.createIndex({ id: 1 }, { unique: true });
db.Passenger.createIndex({ id: 1 }, { unique: true });
db.Flight.createIndex({ id: 1 }, { unique: true });
db.Ticket.createIndex({ id: 1 }, { unique: true });
db.Ticket.createIndex({ passenger_id: 1 });
db.Ticket.createIndex({ flight_id: 1 });

// ⚠️ Foreign Key Constraints
db.Ticket.createIndex(
    { passenger_id: 1, flight_id: 1 },
    {
        unique: true,
        sparse: true
    }
);

print("✅ MongoDB Schema successfully created!");
