#!/bin/bash

# Set the classpath
CLASSPATH="target/classes"

# Add all JAR files from Maven repository
for jar in $(find ~/.m2/repository -name "*.jar" | head -100); do
    CLASSPATH="$CLASSPATH:$jar"
done

# Run the application
java -cp "$CLASSPATH" com.picknpay.InventoryManagementApplication
