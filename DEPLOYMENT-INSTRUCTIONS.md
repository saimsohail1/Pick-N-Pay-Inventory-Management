# PickNPay Deployment Instructions

## Database Configuration

The application now supports H2 file-based database for portable deployment.

### Database Location
- **Path**: `C:\Users\POS\Database\`
- **Database Name**: `picknpay`
- **Files Created**: 
  - `picknpay.mv.db` (main database file)
  - `picknpay.trace.db` (trace log file)

### Running the Application

#### Option 1: Using the Batch Script (Recommended)
1. Double-click `start-app.bat`
2. The script will:
   - Create the database directory if it doesn't exist
   - Start the backend with production profile
   - Database will be saved automatically

#### Option 2: Manual Command
```bash
java -jar PickNPay-Backend.jar --spring.profiles.active=prod
```

### Important Notes

1. **Database Persistence**: 
   - Data is automatically saved to `C:\Users\POS\Database\picknpay.mv.db`
   - The database persists between application restarts
   - No need for external PostgreSQL installation

2. **First Run**:
   - The application will create the database file automatically
   - Initial admin user will be created (check database-setup.sql for credentials)
   - All tables will be created automatically

3. **Backup**:
   - To backup data, copy the entire `C:\Users\POS\Database\` folder
   - To restore, replace the folder with your backup

4. **Database Configuration**:
   - Production config: `application-prod.properties`
   - Development config: `application.properties` (uses PostgreSQL)

### Troubleshooting

**Issue**: Data not saving
- **Solution**: Ensure the application has write permissions to `C:\Users\POS\Database\`
- **Solution**: Check that you're running with `--spring.profiles.active=prod`

**Issue**: Database file not found
- **Solution**: The batch script creates the directory automatically
- **Solution**: Manually create `C:\Users\POS\Database\` folder

**Issue**: Application won't start
- **Solution**: Ensure Java 17 or higher is installed
- **Solution**: Check that port 8080 is not in use

### Development vs Production

- **Development** (default): Uses PostgreSQL at localhost:5432
- **Production** (--spring.profiles.active=prod): Uses H2 file database at C:\Users\POS\Database\

### Database Settings

```properties
# H2 Database URL
jdbc:h2:file:C:/Users/POS/Database/picknpay

# Settings
- AUTO_SERVER=TRUE (allows multiple connections)
- DB_CLOSE_ON_EXIT=FALSE (keeps database open)
- DB_CLOSE_DELAY=-1 (prevents auto-close)
```

### Security Notes

- Default username: `sa`
- Default password: (empty)
- H2 Console is disabled in production for security
- Change credentials in `application-prod.properties` if needed

