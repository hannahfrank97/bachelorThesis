# Bachelorthesis
## Data Synchronization between MySQL and MongoDB

### Project Setup

#### Running the project
Navigate to the project root directory and run the following command:
```
docker-compose up
```

#### MongoDB Replica Set Setup (first time only)
After starting the containers the first time, you need to initialize the MongoDB Replica Set. 
Follow these steps:
1. Access the MongoDB container:
```
docker exec -it mongo-container bash
```

2. Connect to the MongoDB shell:
```
mongosh --username root --password test --authenticationDatabase admin
```

3. Switch to your desired database (in our case: "mongo_database"):
```
use mongo_database
```

4. Initialize the Replica Set:
```
rs.initiate({
  _id: "rs0",
  members: [{ _id: 0, host: "mongo-container:27017" }]
})
```

5. Restart all the containers:
```
docker-compose restart
```





