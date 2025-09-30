#!/bin/bash

# PickNPay Backend Startup Script

echo "Starting PickNPay Backend..."

# Check if Java is installed
if ! command -v java &> /dev/null; then
    echo "Java is not installed. Please install Java 17 or higher."
    exit 1
fi

# Check if Maven is installed
if ! command -v mvn &> /dev/null; then
    echo "Maven is not installed. Please install Maven 3.6 or higher."
    exit 1
fi

# Check if PostgreSQL is running
if ! pg_isready -q; then
    echo "PostgreSQL is not running. Please start PostgreSQL service."
    exit 1
fi

# Navigate to backend directory
cd backend

# Set active profile (default to dev)
PROFILE=${1:-dev}

echo "Starting with profile: $PROFILE"

# Start the Spring Boot application
mvn spring-boot:run -Dspring-boot.run.profiles=$PROFILE
