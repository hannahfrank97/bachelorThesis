const express = require('express');
const {insertDataToMongo, updateDataInMongo, deleteDataInMongo} = require('./services/mongoDBService');
const {insertDataToMySql, updateDataInMysql, deleteDataInMysql} = require('./services/mysqlService');

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

module.exports = app;
