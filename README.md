# PickNPay Inventory Management System

A comprehensive inventory management system built with:
- **Frontend**: Electron.js with React and Material-UI
- **Backend**: Java Spring Boot with JPA/Hibernate
- **Database**: PostgreSQL
- **Features**: Barcode scanning, quick sales, inventory management

## Features
- 🛒 **Quick Sales**: Manual price entry or barcode scanning
- 📱 **Barcode Scanning**: Real-time barcode scanning with camera
- 📦 **Inventory Management**: Add, edit, delete, and track stock levels
- 📊 **Sales Tracking**: Complete sales history and reporting
- 💻 **Desktop App**: Native desktop application with Electron
- 🎨 **Modern UI**: Beautiful Material-UI interface

## Project Structure
```
PickNPay/
├── frontend/                    # Electron.js + React application
│   ├── public/
│   │   ├── electron.js         # Electron main process
│   │   └── index.html
│   ├── src/
│   │   ├── components/         # React components
│   │   ├── pages/             # Application pages
│   │   ├── services/          # API services
│   │   └── App.js
│   └── package.json
├── backend/                     # Spring Boot application
│   ├── src/main/java/com/picknpay/
│   │   ├── controller/        # REST controllers
│   │   ├── service/           # Business logic
│   │   ├── repository/        # Data access layer
│   │   ├── entity/            # JPA entities
│   │   └── dto/               # Data transfer objects
│   ├── src/main/resources/
│   │   ├── application.properties
│   │   ├── application-dev.properties
│   │   └── application-prod.properties
│   └── pom.xml
├── database-setup.sql          # Database setup script
├── start-backend.sh           # Backend startup script
├── start-frontend.sh          # Frontend startup script
├── start-electron.sh          # Electron app startup script
└── README.md
```

## Getting Started

### Prerequisites
- **Node.js** (v16 or higher)
- **Java 17** or higher
- **PostgreSQL 12** or higher
- **Maven 3.6** or higher

### Database Setup
1. Install and start PostgreSQL
2. Run the database setup script:
   ```bash
   psql -U postgres -f database-setup.sql
   ```
3. Update database credentials in `backend/src/main/resources/application.properties` if needed

### Backend Setup
1. Navigate to backend directory:
   ```bash
   cd backend
   ```
2. Install dependencies and start:
   ```bash
   mvn spring-boot:run
   ```
   Or use the startup script:
   ```bash
   ./start-backend.sh
   ```
3. Backend will be available at `http://localhost:8080`

### Frontend Setup (Web Version)
1. Navigate to frontend directory:
   ```bash
   cd frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start development server:
   ```bash
   npm start
   ```
   Or use the startup script:
   ```bash
   ./start-frontend.sh
   ```
4. Web app will be available at `http://localhost:3000`

### Desktop App Setup (Electron)
1. Build and start the Electron app:
   ```bash
   ./start-electron.sh
   ```
   Or manually:
   ```bash
   cd frontend
   npm run build
   npm run electron
   ```

## Usage

### Sales Page
- **Quick Sales**: Add items manually by selecting from dropdown
- **Barcode Scanning**: Click "Scan Barcode" to use camera for item lookup
- **Cart Management**: Adjust quantities, remove items, or modify prices
- **Checkout**: Complete sales with automatic stock updates

### Inventory Management
- **Add Items**: Create new inventory items with barcodes
- **Edit Items**: Update item details, prices, and stock levels
- **Stock Management**: Quick stock adjustments with +/- buttons
- **Low Stock Alerts**: Visual indicators for items running low

### Sales History
- **View All Sales**: Complete transaction history
- **Date Filtering**: Filter sales by date range
- **Sale Details**: Expandable view of individual sale items
- **Sales Summary**: Total sales count and amount

## API Endpoints

### Items
- `GET /api/items` - Get all inventory items
- `POST /api/items` - Create new item
- `GET /api/items/{id}` - Get item by ID
- `PUT /api/items/{id}` - Update item
- `DELETE /api/items/{id}` - Delete item
- `GET /api/items/barcode/{barcode}` - Get item by barcode
- `GET /api/items/search?name={name}` - Search items by name
- `GET /api/items/available` - Get items with stock > 0
- `GET /api/items/low-stock?threshold={n}` - Get low stock items
- `PATCH /api/items/{id}/stock?quantityChange={n}` - Update stock

### Sales
- `GET /api/sales` - Get all sales
- `POST /api/sales` - Create new sale
- `GET /api/sales/{id}` - Get sale by ID
- `GET /api/sales/date-range?startDate={date}&endDate={date}` - Get sales by date range
- `GET /api/sales/total?startDate={date}&endDate={date}` - Get total sales amount

## Development

### Backend Development
- Uses Spring Boot with JPA/Hibernate for ORM
- PostgreSQL for data persistence
- RESTful API design
- Input validation with Bean Validation
- CORS enabled for frontend integration

### Frontend Development
- React with Material-UI components
- React Router for navigation
- React Hook Form for form management
- Axios for API communication
- QuaggaJS for barcode scanning
- Electron for desktop app packaging

## Production Deployment

### Backend
1. Set environment variables:
   ```bash
   export DB_USERNAME=your_db_user
   export DB_PASSWORD=your_db_password
   export PORT=8080
   ```
2. Run with production profile:
   ```bash
   mvn spring-boot:run -Dspring-boot.run.profiles=prod
   ```

### Frontend
1. Build the React app:
   ```bash
   cd frontend
   npm run build
   ```
2. Package Electron app:
   ```bash
   npm run electron-pack
   ```

## Troubleshooting

### Common Issues
1. **Database Connection**: Ensure PostgreSQL is running and credentials are correct
2. **Camera Access**: Grant camera permissions for barcode scanning
3. **CORS Errors**: Backend CORS is configured for all origins in development
4. **Port Conflicts**: Default ports are 3000 (frontend) and 8080 (backend)

### Logs
- Backend logs: Check console output or application logs
- Frontend logs: Check browser developer tools or Electron console
- Database logs: Check PostgreSQL logs for connection issues

## Contributing
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License
This project is licensed under the MIT License.
