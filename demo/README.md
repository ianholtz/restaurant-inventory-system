# Restaurant Inventory Management Demo - Admin Login

This demo showcases a restaurant inventory management system with admin authentication and role-based interface differentiation.

## Features

### Authentication System
- **Login Screen**: Purple gradient login interface that appears on page load
- **Admin Credentials**: Username: `admin`, Password: `admin`
- **Session Management**: Maintains login state until logout
- **Error Handling**: Shows error messages for invalid credentials

### Admin Interface Features
- **Visual Distinction**: Purple gradient header theme for admin users
- **Admin Badge**: "Admin" badge displayed next to the title
- **Admin Dashboard**: Special admin section with system status and user information
- **Enhanced Controls**: Additional admin-only buttons (Export Data, Settings)
- **Full Functionality**: Access to all inventory management features

### Inventory Management
- **Real-time Updates**: Simulated live inventory updates
- **Filtering**: Filter by category and status (low stock, expiring)
- **Item Management**: Add, modify, and track inventory items
- **Alerts System**: Notifications for low stock and expiring items
- **Statistics Dashboard**: Overview of total items, low stock, expiring items, and total value

## How to Use

1. **Access the Demo**:
   - Open `index.html` in a web browser
   - The login screen will appear automatically

2. **Login as Admin**:
   - Enter username: `admin`
   - Enter password: `admin`
   - Click "Sign In"

3. **Admin Features**:
   - Notice the purple gradient header (admin theme)
   - See the "Admin" badge next to the title
   - View the admin dashboard section
   - Use the "Export Data" button to download inventory as CSV
   - Click "Settings" to see admin-only functionality
   - Use "Logout" to return to login screen

4. **Inventory Management**:
   - View inventory items in the grid layout
   - Use filters to find specific items
   - Add new items using the "Add Item" button
   - Adjust quantities using the +/- buttons on each item
   - Monitor alerts for low stock and expiring items

## File Structure

```
demo/
├── index.html          # Main demo page with login and inventory interface
├── app.js             # JavaScript with AuthManager and InventoryDemo classes
├── test.html          # Basic validation tests
└── README.md          # This documentation
```

## Technical Implementation

### Authentication (AuthManager class)
- Handles login/logout functionality
- Manages user session state
- Controls interface switching between login and main app
- Updates UI based on user role

### Inventory Management (InventoryDemo class)
- Manages inventory data and operations
- Handles real-time updates and notifications
- Provides filtering and search functionality
- Includes admin-specific features (export, settings)

### Role-Based UI
- **Admin Users**: Full interface with enhanced styling and additional controls
- **Future Enhancement**: Regular users could have limited functionality

## Demo Credentials

| Role  | Username | Password |
|-------|----------|----------|
| Admin | admin    | admin    |

## Browser Compatibility

This demo uses modern web technologies and should work in:
- Chrome 60+
- Firefox 55+
- Safari 12+
- Edge 79+

## Testing

Run `test.html` to perform basic validation of the implementation, or follow the manual testing instructions provided in the test file.

## Future Enhancements

- Multiple user roles (manager, staff, viewer)
- Persistent session storage
- Real backend integration
- Advanced admin features (user management, system settings)
- Mobile-responsive design improvements