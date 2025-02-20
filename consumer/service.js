const express = require('express');
const {
    insertPassengerMongo, insertFlightMongo, insertTicketMongo,
    deleteDataInMongo, updateDataInMongo, insertDataToMongo
} = require('./services/mongoDBService');
const {
    insertPassengerMySql, insertFlightMySql, insertTicketMySql,
    deleteDataInMysql, updateDataInMysql, insertDataToMySql
} = require('./services/mysqlService');

const app = express();
app.use(express.json());

//Adding new Data
app.post('/data', async (req, res) => {
    try {
        const data = req.body;
        await insertDataToMySql(data);
        await insertDataToMongo(data);
        res.status(201).json({message: 'Data added successfully'});
    } catch (err) {
        console.error('Error inserting data:', err);
        res.status(500).json({message: 'Error inserting data'});
    }
});

//Updating Data
app.put('/data/:id', async (req, res) => {
        try {
            const id = req.params.id;
            const data = req.body;
            data.id = id;
            await updateDataInMysql(id, data);
            await updateDataInMongo(id, data);
            res.status(200).json({message: 'Data updated successfully'});
        } catch (err) {
            console.error('Error updating data:', err);
            res.status(500).json({message: 'Error updating data'});
        }
    });

//Deleting Data
app.delete('/data/:id', async (req, res) => {
    try {
        const id = req.params.id;
        await deleteDataInMysql(id);
        await deleteDataInMongo(id);
        res.status(200).json({message: 'Data deleted successfully'});
    } catch (err) {
        console.error('Error deleting data:', err);
        res.status(500).json({message: 'Error deleting data'});
    }
});

// 🔹 Adding new Passenger
app.post('/passenger', async (req, res) => {
    try {
        const passenger = req.body;
        await insertPassengerMySql(passenger);
        await insertPassengerMongo(passenger);
        res.status(201).json({ message: 'Passenger added successfully' });
    } catch (err) {
        console.error('Error inserting passenger:', err);
        res.status(500).json({ message: 'Error inserting passenger' });
    }
});

// 🔹 Adding new Flight
app.post('/flight', async (req, res) => {
    try {
        const flight = req.body;
        await insertFlightMySql(flight);
        await insertFlightMongo(flight);
        res.status(201).json({ message: 'Flight added successfully' });
    } catch (err) {
        console.error('Error inserting flight:', err);
        res.status(500).json({ message: 'Error inserting flight' });
    }
});

// 🔹 Adding new Ticket (with foreign key constraints)
app.post('/ticket', async (req, res) => {
    try {
        const ticket = req.body;
        await insertTicketMySql(ticket);
        await insertTicketMongo(ticket);
        res.status(201).json({ message: 'Ticket added successfully' });
    } catch (err) {
        console.error('Error inserting ticket:', err);
        res.status(500).json({ message: 'Error inserting ticket' });
    }
});

module.exports = app;
