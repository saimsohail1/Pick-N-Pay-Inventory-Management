#!/bin/bash

# PickNPay System Test Script

echo "🧪 Testing PickNPay Inventory Management System"
echo "=============================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    if [ $1 -eq 0 ]; then
        echo -e "${GREEN}✅ $2${NC}"
    else
        echo -e "${RED}❌ $2${NC}"
    fi
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

# Test 1: Check if PostgreSQL is running
echo "1. Checking PostgreSQL..."
if pg_isready -q; then
    print_status 0 "PostgreSQL is running"
else
    print_status 1 "PostgreSQL is not running"
    print_warning "Please start PostgreSQL before running the application"
fi

# Test 2: Check if Java is installed
echo "2. Checking Java installation..."
if command -v java &> /dev/null; then
    JAVA_VERSION=$(java -version 2>&1 | head -n 1 | cut -d'"' -f2)
    print_status 0 "Java is installed (Version: $JAVA_VERSION)"
else
    print_status 1 "Java is not installed"
fi

# Test 3: Check if Maven is installed
echo "3. Checking Maven installation..."
if command -v mvn &> /dev/null; then
    MAVEN_VERSION=$(mvn -version | head -n 1 | cut -d' ' -f3)
    print_status 0 "Maven is installed (Version: $MAVEN_VERSION)"
else
    print_status 1 "Maven is not installed"
fi

# Test 4: Check if Node.js is installed
echo "4. Checking Node.js installation..."
if command -v node &> /dev/null; then
    NODE_VERSION=$(node --version)
    print_status 0 "Node.js is installed (Version: $NODE_VERSION)"
else
    print_status 1 "Node.js is not installed"
fi

# Test 5: Check if npm is installed
echo "5. Checking npm installation..."
if command -v npm &> /dev/null; then
    NPM_VERSION=$(npm --version)
    print_status 0 "npm is installed (Version: $NPM_VERSION)"
else
    print_status 1 "npm is not installed"
fi

# Test 6: Check if database exists
echo "6. Checking database setup..."
if psql -U postgres -lqt | cut -d \| -f 1 | grep -qw picknpay_inventory; then
    print_status 0 "Database 'picknpay_inventory' exists"
else
    print_status 1 "Database 'picknpay_inventory' does not exist"
    print_warning "Run: psql -U postgres -f database-setup.sql"
fi

# Test 7: Check backend dependencies
echo "7. Checking backend dependencies..."
if [ -f "backend/pom.xml" ]; then
    print_status 0 "Backend pom.xml found"
else
    print_status 1 "Backend pom.xml not found"
fi

# Test 8: Check frontend dependencies
echo "8. Checking frontend dependencies..."
if [ -f "frontend/package.json" ]; then
    print_status 0 "Frontend package.json found"
else
    print_status 1 "Frontend package.json not found"
fi

# Test 9: Check if startup scripts are executable
echo "9. Checking startup scripts..."
if [ -x "start-backend.sh" ]; then
    print_status 0 "Backend startup script is executable"
else
    print_status 1 "Backend startup script is not executable"
fi

if [ -x "start-frontend.sh" ]; then
    print_status 0 "Frontend startup script is executable"
else
    print_status 1 "Frontend startup script is not executable"
fi

if [ -x "start-electron.sh" ]; then
    print_status 0 "Electron startup script is executable"
else
    print_status 1 "Electron startup script is not executable"
fi

echo ""
echo "🎯 Quick Start Commands:"
echo "======================="
echo "1. Start Backend:  ./start-backend.sh"
echo "2. Start Frontend: ./start-frontend.sh"
echo "3. Start Electron: ./start-electron.sh"
echo ""
echo "📚 For detailed setup instructions, see README.md"
echo ""
echo "✨ Happy coding with PickNPay!"
