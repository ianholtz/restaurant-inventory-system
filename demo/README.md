# Restaurant Inventory Management System - Demo

This demo showcases a restaurant inventory management system with role-based authentication and different user interfaces for admin and staff users.

## Features

### Authentication System
- **Login Page**: Secure login with username/password authentication
- **Role-Based Access**: Different interfaces for admin and staff users
- **Session Management**: Persistent login sessions with localStorage
- **Logout Functionality**: Secure logout with session cleanup

### Admin Features
- **Admin Dashboard**: Special analytics section with system metrics
- **User Management**: View, edit, and delete users
- **Advanced Analytics**: Detailed charts and reports
- **Bulk Actions**: Perform operations on multiple inventory items
- **Data Export**: Export inventory data to CSV format
- **System Settings**: Access to system configuration

### Staff Features
- **Inventory Management**: View and manage inventory items
- **Basic Analytics**: Essential inventory statistics
- **Item Operations**: Add, edit, and adjust inventory quantities
- **Alerts System**: Low stock and expiration warnings

## Demo Credentials

### Admin Access
- **Username**: `admin`
- **Password**: `admin`
- **Permissions**: Full system access including user management and analytics

### Staff Access
- **Username**: `staff`
- **Password**: `staff`
- **Permissions**: Basic inventory management only

## File Structure

```
demo/
├── index.html          # Main dashboard (requires authentication)
├── login.html          # Login page
├── app.js             # Main application logic with authentication
├── test-admin-login.html # Testing utility for authentication
└── README.md          # This documentation
```

## Getting Started

1. **Open the Demo**: Navigate to `login.html` in your web browser
2. **Login**: Use either admin or staff credentials
3. **Explore**: Different features will be available based on your role

### Admin Experience
- Purple "ADMIN" badge in header
- Crown icon for user avatar
- Admin Analytics dashboard section
- User Management and Analytics options in user menu
- Bulk Actions and Export buttons in toolbar

### Staff Experience
- Blue "STAFF" badge in header
- Standard user icon
- Basic inventory management only
- Limited menu options

## Testing

Use `test-admin-login.html` to:
- Test admin and staff login functionality
- View current authentication status
- Clear authentication data
- Debug authentication issues

## Technical Implementation

### Authentication Flow
1. User enters credentials on login page
2. Credentials are validated against mock user database
3. User data and token are stored in localStorage
4. Dashboard checks authentication on load
5. UI is customized based on user role

### Role-Based UI
- Admin users see additional dashboard sections
- Menu items are conditionally displayed
- Different color schemes and icons for roles
- Feature access is controlled by role permissions

### Security Features
- Session validation on page load
- Automatic redirect to login if not authenticated
- Secure logout with data cleanup
- Token-based authentication simulation

## Mock Data

The demo includes sample data for:
- **Inventory Items**: Various restaurant ingredients and supplies
- **Users**: Admin, staff, and manager accounts
- **Analytics**: Revenue, orders, and efficiency metrics

## Browser Compatibility

- Modern browsers with localStorage support
- JavaScript enabled
- No server-side dependencies (pure client-side demo)

## Future Enhancements

- Real backend integration
- JWT token authentication
- Password hashing and security
- Multi-restaurant support
- Advanced reporting features
- Mobile responsive design improvements

## Troubleshooting

### Login Issues
- Ensure JavaScript is enabled
- Check browser console for errors
- Use test page to verify authentication state

### UI Issues
- Clear browser cache and localStorage
- Verify all CSS and JS files are loading
- Check for JavaScript errors in console

### Authentication Problems
- Use `test-admin-login.html` to debug
- Clear localStorage data and try again
- Verify credentials match exactly (case-sensitive)

## Support

This is a demonstration prototype. For production use, implement proper:
- Server-side authentication
- Database integration
- Security measures
- Error handling
- Input validation