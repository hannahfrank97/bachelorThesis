#!/bin/bash
set -e

echo "Waiting for Zookeeper..."
while ! timeout 1 bash -c "echo > /dev/tcp/zookeeper/2181" 2>/dev/null; do
    echo "Zookeeper is not ready yet, retrying..."
    sleep 5
done

echo "Waiting for Kafka..."
while ! timeout 1 bash -c "echo > /dev/tcp/kafka/9092" 2>/dev/null; do
    echo "Kafka is not ready yet, retrying..."
    sleep 5
done

echo "Waiting for MongoDB..."
while ! timeout 1 bash -c "echo > /dev/tcp/mongo/27017" 2>/dev/null; do
    echo "MongoDB is not ready yet, retrying..."
    sleep 5
done

# Create log directory
mkdir -p /var/log/kafka

# Start Kafka Connect in the background
/docker-entrypoint.sh start &

# Wait longer for initial startup and plugin loading
echo "Waiting for Kafka Connect to start and load plugins..."
sleep 60

echo "Checking Kafka Connect status..."
max_retries=30
retry_count=0

while ! curl -s -o /dev/null -w "%{http_code}" http://localhost:8083/ | grep -q "200"; do
    retry_count=$((retry_count+1))
    if [ $retry_count -eq $max_retries ]; then
        echo "Failed to connect to Kafka Connect after $max_retries attempts"
        exit 1
    fi
    echo "Kafka Connect is not ready yet, retrying... ($retry_count/$max_retries)"
    sleep 5
done

echo "Kafka Connect is ready. Registering connectors..."

# First check if MongoDB connector exists
echo "Checking if MongoDB connector exists..."
if curl -s -f http://localhost:8083/connector-plugins | grep -q "io.debezium.connector.mongodb.MongoDbConnector"; then
    echo "MongoDB connector plugin found. Proceeding with registration..."
else
    echo "MongoDB connector plugin not found. Waiting additional time..."
    sleep 30
fi

echo "Registering MongoDB connector..."
curl -X POST \
     -H "Content-Type: application/json" \
     -H "Accept: application/json" \
     --data-binary @/config/mongodb-connector.json \
     http://localhost:8083/connectors

sleep 10  # Wait between connector registrations

echo "Registering MySQL connector..."
curl -X POST \
     -H "Content-Type: application/json" \
     -H "Accept: application/json" \
     --data-binary @/config/mysql-connector.json \
     http://localhost:8083/connectors

echo "Connectors registered successfully!"

# Keep the container running by following stdout instead of a log file
tail -f /proc/1/fd/1
