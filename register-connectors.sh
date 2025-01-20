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

# Start Kafka Connect in the background
/docker-entrypoint.sh &

echo "Waiting for Kafka Connect..."
while ! curl -s http://localhost:8083/connectors >/dev/null 2>&1; do
    echo "Kafka Connect is not ready yet, retrying..."
    sleep 5
done

echo "Registering MongoDB connector..."
curl -X POST -H "Content-Type: application/json" \
     -H "Accept: application/json" \
     --data-binary @/config/mongodb-connector.json \
     http://localhost:8083/connectors

sleep 10  # Wait between connector registrations

echo "Registering MySQL connector..."
curl -X POST -H "Content-Type: application/json" \
     -H "Accept: application/json" \
     --data-binary @/config/mysql-connector.json \
     http://localhost:8083/connectors

echo "Connectors registered successfully!"

# Keep the script running
wait
