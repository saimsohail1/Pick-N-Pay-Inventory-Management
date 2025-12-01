# PickNPay Point of Sale System

A complete Point of Sale (POS) and inventory management system for retail businesses. Built with modern web technologies and packaged as a desktop application.

## Tech Stack

- **Frontend**: React with Bootstrap 5, packaged with Electron for desktop use
- **Backend**: Java Spring Boot with JPA/Hibernate
- **Database**: PostgreSQL

## Features

**Sales & Checkout**
- Process sales with barcode scanning or manual entry
- Support for cash and card payments
- Hold and resume transactions
- Apply discounts (percentage or fixed amount)
- Print receipts with barcode labels
- Real-time cart management

**Inventory Management**
- Add, edit, and delete products
- Track stock levels with low stock alerts
- Organize items by categories
- Generate and print barcode labels
- Quick stock adjustments

**Categories & Organization**
- Create and manage product categories
- Set VAT rates per category
- View items by category

**Sales Reports**
- Complete sales history with date filtering
- Daily sales reports
- User-specific performance reports
- Admin-level comprehensive reporting

**User Management**
- Create and manage user accounts
- Role-based access (Admin, Cashier, Manager)
- Activate/deactivate users

**Attendance Tracking**
- Employee time-in/time-out
- Daily and weekly attendance reports
- Individual employee attendance history

**Company Settings**
- Customize company name and address
- Configure system-wide settings

**Customer Display**
- Separate customer-facing display screen

## Getting Started

### Prerequisites

- Node.js v16 or higher
- Java 17 or higher
- PostgreSQL 12 or higher
- Maven 3.6 or higher

### Database Setup

1. Install and start PostgreSQL
2. Run the database setup script:
   ```bash
   psql -U postgres -f database-setup.sql
   ```
3. Update database credentials in `backend/src/main/resources/application.properties` if needed

### Backend Setup

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Start the backend server:
   ```bash
   mvn spring-boot:run
   ```
   
   Or use the startup script:
   ```bash
   ./start-backend.sh
   ```

3. Backend will be available at `http://localhost:8080`

### Frontend Setup (Web Version)

1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
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

## Project Structure

```
PickNPay/
├── frontend/                    # React + Electron application
│   ├── public/
│   │   └── index.html
│   ├── src/
│   │   ├── components/         # React components
│   │   ├── pages/             # Application pages
│   │   ├── services/          # API services
│   │   ├── contexts/          # React contexts
│   │   ├── hooks/             # Custom hooks
│   │   ├── utils/             # Utility functions
│   │   └── App.js
│   ├── main.js                # Electron main process
│   ├── preload.js             # Electron preload script
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

## API Endpoints

### Items
- `GET /api/items` - Get all inventory items
- `POST /api/items` - Create new item
- `GET /api/items/{id}` - Get item by ID
- `PUT /api/items/{id}` - Update item
- `DELETE /api/items/{id}` - Delete item
- `GET /api/items/barcode/{barcode}` - Get item by barcode
- `GET /api/items/category/{categoryId}` - Get items by category
- `GET /api/items/search?name={name}` - Search items by name
- `GET /api/items/available` - Get items with stock > 0
- `GET /api/items/low-stock?threshold={n}` - Get low stock items
- `PATCH /api/items/{id}/stock?quantityChange={n}` - Update stock

### Sales
- `GET /api/sales` - Get all sales
- `POST /api/sales` - Create new sale
- `GET /api/sales/{id}` - Get sale by ID
- `PUT /api/sales/{id}` - Update sale
- `DELETE /api/sales/{id}` - Delete sale
- `GET /api/sales/today?userId={id}&isAdmin={bool}` - Get today's sales
- `GET /api/sales/user/{userId}` - Get sales by user
- `GET /api/sales/user/{userId}/date-range` - Get sales by user and date range
- `GET /api/sales/admin/date-range` - Get sales by date range (admin)
- `GET /api/sales/date-range?startDate={date}&endDate={date}` - Get sales by date range
- `GET /api/sales/daily-report?date={date}` - Get daily sales report
- `GET /api/sales/daily-report/user?date={date}&userId={id}` - Get daily report by user
- `GET /api/sales/daily-report/user/date-range` - Get daily report by user and date range
- `GET /api/sales/daily-report/admin/date-range` - Get admin daily report by date range
- `GET /api/sales/total?startDate={date}&endDate={date}` - Get total sales amount

### Categories
- `GET /api/categories` - Get all active categories
- `GET /api/categories/all` - Get all categories (including inactive)
- `GET /api/categories/{id}` - Get category by ID
- `POST /api/categories` - Create new category
- `PUT /api/categories/{id}` - Update category
- `DELETE /api/categories/{id}` - Delete category

### Users
- `GET /api/users` - Get all users
- `GET /api/users/{id}` - Get user by ID
- `GET /api/users/username/{username}` - Get user by username
- `GET /api/users/role/{role}` - Get users by role
- `GET /api/users/active` - Get active users
- `POST /api/users` - Create new user
- `PUT /api/users/{id}` - Update user
- `DELETE /api/users/{id}` - Delete user
- `PATCH /api/users/{id}/toggle-status` - Toggle user active status
- `POST /api/users/initialize` - Initialize default admin user
- `GET /api/users/roles` - Get available roles

### Attendance
- `POST /api/attendances/time-in` - Mark time in
- `POST /api/attendances/time-out` - Mark time out
- `GET /api/attendances/user/{userId}/date/{date}` - Get attendance by user and date
- `GET /api/attendances/user/{userId}/date-range` - Get attendance by user and date range
- `GET /api/attendances/date/{date}` - Get attendance by date
- `GET /api/attendances/date-range` - Get attendance by date range
- `GET /api/attendances/weekly-report/user/{userId}` - Get weekly report for user
- `GET /api/attendances/employee-report` - Get employee report by date range
- `GET /api/attendances/weekly-report` - Get weekly report for all users
- `GET /api/attendances/week-start` - Get week start date

### Company Settings
- `GET /api/company-settings` - Get company settings
- `PUT /api/company-settings` - Update company settings

### Authentication
- `POST /api/auth/login` - User login

## Development

### Backend
- Spring Boot with JPA/Hibernate for ORM
- PostgreSQL for data persistence
- RESTful API design
- Input validation with Bean Validation
- CORS enabled for frontend integration

### Frontend
- React with Bootstrap 5 and React-Bootstrap
- React Router for navigation
- React Hook Form for form management
- Axios for API communication
- QuaggaJS for barcode scanning
- JsBarcode for barcode generation
- Electron for desktop app packaging
- Bootstrap Icons for icons

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
   npm run dist
   ```
   
   For Windows:
   ```bash
   npm run dist:win
   ```

## Troubleshooting

**Database Connection Issues**
- Ensure PostgreSQL is running
- Verify credentials in `application.properties`

**Camera Access**
- Grant camera permissions for barcode scanning functionality

**CORS Errors**
- Backend CORS is configured for all origins in development mode

**Port Conflicts**
- Default ports: 3000 (frontend) and 8080 (backend)
- Change ports in configuration files if needed

**Logs**
- Backend: Check console output or application logs
- Frontend: Check browser developer tools or Electron console
- Database: Check PostgreSQL logs for connection issues

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is licensed under the MIT License.
