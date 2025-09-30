#!/bin/bash

# Get all JAR files from Maven repository
JARS=$(find ~/.m2/repository -name "*.jar" | tr '\n' ':')

# Run the application
java -cp "target/classes:$JARS" com.picknpay.InventoryManagementApplication
