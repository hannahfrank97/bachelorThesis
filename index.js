const http = require('http');
const {connectToMySql} = require('./services/mysqlService');
const {connectToMongo} = require('./services/mongoDBService')
const {startConsumer} = require("./kafka/consumer");

const server = http.createServer((req, res) => {
  res.end('Server is running');
});

async function startApp() {
    await connectToMySql();
    await connectToMongo();
    await startConsumer();
    server.listen(3000, () => {
        console.log('Server is running on port 3000');
    });
}

startApp().then(() => console.log('App started successfully'));
