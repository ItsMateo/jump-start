#!/bin/bash

# Script to start containers using docker-compose
# This script is mounted into the container for flexibility

set -e

echo "Starting containers with docker-compose..."
echo "Target compose file: /app/target-compose.yml"
echo "Working directory: $(pwd)"

# Check if target compose file exists
if [ ! -f "/app/target-compose.yml" ]; then
    echo "ERROR: Target compose file not found at /app/target-compose.yml"
    exit 1
fi

# Validate the compose file
echo "Validating compose file..."
if ! docker-compose -f /app/target-compose.yml config > /dev/null 2>&1; then
    echo "ERROR: Invalid docker-compose.yml file"
    docker-compose -f /app/target-compose.yml config
    exit 1
fi

# Start the containers
echo "Starting containers..."
cd /app
export COMPOSE_PROJECT_NAME="target-services"
docker-compose -f /app/target-compose.yml up -d

echo "Containers started successfully!"
