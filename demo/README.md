# Restaurant Inventory System - Admin Login Demo

This demo showcases the admin login functionality for the Restaurant Inventory Management System.

## Features

### Admin Login
- **Username**: `admin`
- **Password**: `admin`
- Separate admin dashboard with different UI/UX
- Role-based authentication and authorization

### Regular User Interface
- Standard inventory management dashboard
- User authentication required
- Role-based access control

## How to Test

### 1. Access the Login Page
Open `login.html` in your web browser to see the login interface.

### 2. Admin Login
1. Click on the "Admin" tab in the login form
2. The form will auto-populate with:
   - Username: `admin`
   - Password: `admin`
3. Click "Sign In"
4. You'll be redirected to the admin dashboard (`admin-dashboard.html`)

### 3. Admin Dashboard Features
- **System Overview**: View system-wide statistics
- **System Management**: Access to restaurant, user, and database management
- **Quick Actions**: View regular dashboard, analytics, data export
- **Recent Activity**: Real-time system activity feed
- **Logout**: Secure logout functionality

### 4. Regular User Dashboard
- From the admin dashboard, click "View Regular Dashboard" to see the standard inventory interface
- Shows inventory items, alerts, and management tools
- Different UI design compared to admin dashboard

## File Structure

```
demo/
├── login.html              # Login page
├── login.js               # Login functionality
├── admin-dashboard.html   # Admin-specific dashboard
├── admin-dashboard.js     # Admin dashboard functionality
├── index.html            # Regular user dashboard (modified)
├── app.js                # Regular dashboard functionality (modified)
└── README.md             # This file
```

## Key Differences: Admin vs Regular User

### Admin Dashboard
- **Purple/gradient theme** with crown icon
- **System-wide statistics** (total restaurants, users, items)
- **Administrative functions** (user management, system settings)
- **System monitoring** (alerts, activity feed)
- **Full system access** across all restaurants

### Regular User Dashboard
- **Blue theme** with utensils icon
- **Restaurant-specific data** (inventory items, stock levels)
- **Operational functions** (add items, manage inventory)
- **Restaurant-focused alerts** (low stock, expiring items)
- **Limited to assigned restaurant**

## Authentication Flow

1. **Login Page** (`login.html`)
   - User selects admin or regular login
   - Credentials are validated
   - JWT token is stored in localStorage

2. **Dashboard Redirect**
   - Admin users → `admin-dashboard.html`
   - Regular users → `index.html`

3. **Session Management**
   - Token expiry checking
   - Automatic logout on token expiration
   - Secure logout functionality

## Technical Implementation

### Backend Changes
- Extended User type to include `admin` role and `passwordHash` field
- Added `getUser` method to DynamoDB service
- Updated auth handler to support admin login with username
- Added admin user initialization functionality

### Frontend Changes
- Created dedicated login interface
- Built separate admin dashboard
- Added authentication checks to existing inventory dashboard
- Implemented role-based UI rendering

## Demo Limitations

- **Mock API**: Login uses simulated API responses for demo purposes
- **Local Storage**: Authentication tokens stored in browser localStorage
- **Static Data**: Dashboard statistics are simulated/randomized
- **No Backend**: Actual API integration would require backend deployment

## Production Considerations

For production deployment:
1. Replace mock API calls with actual backend endpoints
2. Implement proper token refresh mechanism
3. Add HTTPS enforcement for security
4. Implement proper error handling and logging
5. Add input validation and sanitization
6. Configure CORS policies appropriately

## Testing the Demo

1. **Start with Login**: Always begin at `login.html`
2. **Try Admin Login**: Use the provided admin credentials
3. **Explore Admin Features**: Navigate through the admin dashboard
4. **Test Regular View**: Use "View Regular Dashboard" from admin panel
5. **Test Logout**: Verify logout functionality works correctly
6. **Test Session**: Refresh pages to verify authentication persistence

The demo successfully demonstrates the different user experiences for admin vs regular users, showcasing role-based access control and distinct user interfaces.