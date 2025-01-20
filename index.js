const http = require('http');
const {connectToMySql} = require('./services/mysqlService');
const {connectToMongo} = require('./services/mongoDBService')

const server = http.createServer((req, res) => {
  res.end('Server is running');
});

async function startApp() {
    await connectToMySql();
    await connectToMongo();
    server.listen(3000, () => {
        console.log('Server is running on port 3000');
    });
}

startApp().then(() => console.log('App started successfully'));
