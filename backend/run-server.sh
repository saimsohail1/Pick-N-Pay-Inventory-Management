#!/bin/bash

# Navigate to the backend directory
cd /Users/saimsohail/Documents/PickNPay/backend

# Clean and compile
mvn clean compile

# Run the application using Maven with explicit plugin
mvn org.springframework.boot:spring-boot-maven-plugin:3.2.0:run
