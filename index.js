const {connectToMySql} = require('./services/mysqlService');
const {connectToMongo} = require('./services/mongodbService');
const {startConsumer} = require("./consumer/consumer");

const app = require('./consumer/service');

async function startApp() {
    await connectToMySql();
    await connectToMongo();
    await startConsumer();
    app.listen(3000, () => {
        console.log('Server is running on port 3000');
    });
}

startApp().then(() => console.log('App started successfully'));
