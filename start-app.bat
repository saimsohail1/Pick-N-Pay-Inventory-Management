@echo off
echo Starting PickNPay Application...
echo Database will be saved to: C:\Users\POS\Database\

REM Create database directory if it doesn't exist
if not exist "C:\Users\POS\Database" mkdir "C:\Users\POS\Database"

REM Start the application with production profile
java -jar PickNPay-Backend.jar --spring.profiles.active=prod

pause

