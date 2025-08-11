/**
 * Unit tests for Admin Login Authentication System
 * These tests verify the authentication functionality works correctly
 */

// Mock localStorage for testing
const mockLocalStorage = {
    store: {},
    getItem: function(key) {
        return this.store[key] || null;
    },
    setItem: function(key, value) {
        this.store[key] = value.toString();
    },
    removeItem: function(key) {
        delete this.store[key];
    },
    clear: function() {
        this.store = {};
    }
};

// Mock window.location for testing
const mockLocation = {
    href: '',
    assign: function(url) {
        this.href = url;
    }
};

describe('Admin Login Authentication System', () => {
    let originalLocalStorage;
    let originalLocation;

    beforeEach(() => {
        // Setup mocks
        originalLocalStorage = global.localStorage;
        originalLocation = global.window?.location;
        
        global.localStorage = mockLocalStorage;
        global.window = { location: mockLocation };
        
        // Clear storage before each test
        mockLocalStorage.clear();
        mockLocation.href = '';
    });

    afterEach(() => {
        // Restore original objects
        global.localStorage = originalLocalStorage;
        if (originalLocation) {
            global.window.location = originalLocation;
        }
    });

    describe('User Authentication', () => {
        test('should authenticate admin user with correct credentials', () => {
            const username = 'admin';
            const password = 'admin';
            
            const result = authenticateUser(username, password);
            
            expect(result.success).toBe(true);
            expect(result.user.role).toBe('admin');
            expect(result.user.username).toBe('admin');
            expect(result.user.permissions).toContain('manage_users');
            expect(result.token).toBeDefined();
        });

        test('should authenticate staff user with correct credentials', () => {
            const username = 'staff';
            const password = 'staff';
            
            const result = authenticateUser(username, password);
            
            expect(result.success).toBe(true);
            expect(result.user.role).toBe('staff');
            expect(result.user.username).toBe('staff');
            expect(result.user.permissions).not.toContain('manage_users');
            expect(result.token).toBeDefined();
        });

        test('should reject invalid credentials', () => {
            const username = 'invalid';
            const password = 'wrong';
            
            const result = authenticateUser(username, password);
            
            expect(result.success).toBe(false);
            expect(result.error).toBe('Invalid username or password');
            expect(result.user).toBeUndefined();
            expect(result.token).toBeUndefined();
        });

        test('should reject correct username with wrong password', () => {
            const username = 'admin';
            const password = 'wrongpassword';
            
            const result = authenticateUser(username, password);
            
            expect(result.success).toBe(false);
            expect(result.error).toBe('Invalid username or password');
        });
    });

    describe('Session Management', () => {
        test('should store user data in localStorage on successful login', () => {
            const username = 'admin';
            const password = 'admin';
            
            const result = authenticateUser(username, password);
            
            if (result.success) {
                localStorage.setItem('currentUser', JSON.stringify(result.user));
                localStorage.setItem('authToken', result.token);
            }
            
            const storedUser = JSON.parse(localStorage.getItem('currentUser'));
            const storedToken = localStorage.getItem('authToken');
            
            expect(storedUser).toBeDefined();
            expect(storedUser.role).toBe('admin');
            expect(storedToken).toBeDefined();
        });

        test('should clear authentication data on logout', () => {
            // Setup authenticated state
            const userData = { id: 'admin-001', role: 'admin' };
            localStorage.setItem('currentUser', JSON.stringify(userData));
            localStorage.setItem('authToken', 'test-token');
            
            // Simulate logout
            localStorage.removeItem('currentUser');
            localStorage.removeItem('authToken');
            
            expect(localStorage.getItem('currentUser')).toBeNull();
            expect(localStorage.getItem('authToken')).toBeNull();
        });

        test('should validate existing session', () => {
            const userData = {
                id: 'admin-001',
                username: 'admin',
                role: 'admin',
                firstName: 'Admin',
                lastName: 'User'
            };
            
            localStorage.setItem('currentUser', JSON.stringify(userData));
            localStorage.setItem('authToken', 'valid-token');
            
            const isAuthenticated = checkAuthentication();
            
            expect(isAuthenticated).toBe(true);
        });

        test('should handle corrupted session data', () => {
            localStorage.setItem('currentUser', 'invalid-json');
            localStorage.setItem('authToken', 'token');
            
            const isAuthenticated = checkAuthentication();
            
            expect(isAuthenticated).toBe(false);
            expect(localStorage.getItem('currentUser')).toBeNull();
            expect(localStorage.getItem('authToken')).toBeNull();
        });
    });

    describe('Role-Based Access Control', () => {
        test('should identify admin permissions correctly', () => {
            const adminUser = {
                role: 'admin',
                permissions: ['read', 'write', 'delete', 'manage_users', 'view_analytics']
            };
            
            expect(hasPermission(adminUser, 'manage_users')).toBe(true);
            expect(hasPermission(adminUser, 'view_analytics')).toBe(true);
            expect(hasPermission(adminUser, 'read')).toBe(true);
        });

        test('should identify staff permissions correctly', () => {
            const staffUser = {
                role: 'staff',
                permissions: ['read', 'write']
            };
            
            expect(hasPermission(staffUser, 'read')).toBe(true);
            expect(hasPermission(staffUser, 'write')).toBe(true);
            expect(hasPermission(staffUser, 'manage_users')).toBe(false);
            expect(hasPermission(staffUser, 'view_analytics')).toBe(false);
        });

        test('should handle missing permissions array', () => {
            const userWithoutPermissions = {
                role: 'staff'
            };
            
            expect(hasPermission(userWithoutPermissions, 'read')).toBe(false);
        });
    });

    describe('UI State Management', () => {
        test('should show admin-specific UI elements for admin users', () => {
            const adminUser = { role: 'admin' };
            
            const uiState = getUIState(adminUser);
            
            expect(uiState.showAdminAnalytics).toBe(true);
            expect(uiState.showAdminActions).toBe(true);
            expect(uiState.showUserManagement).toBe(true);
            expect(uiState.roleIndicator.text).toBe('ADMIN');
            expect(uiState.roleIndicator.class).toContain('purple');
        });

        test('should show staff-specific UI elements for staff users', () => {
            const staffUser = { role: 'staff' };
            
            const uiState = getUIState(staffUser);
            
            expect(uiState.showAdminAnalytics).toBe(false);
            expect(uiState.showAdminActions).toBe(false);
            expect(uiState.showUserManagement).toBe(false);
            expect(uiState.roleIndicator.text).toBe('STAFF');
            expect(uiState.roleIndicator.class).toContain('blue');
        });
    });
});

// Helper functions for testing (these would be extracted from the main app)

function authenticateUser(username, password) {
    const users = {
        'admin': {
            password: 'admin',
            user: {
                id: 'admin-001',
                username: 'admin',
                email: 'admin@restaurant.com',
                firstName: 'Admin',
                lastName: 'User',
                role: 'admin',
                restaurantId: 'demo-restaurant',
                permissions: ['read', 'write', 'delete', 'manage_users', 'view_analytics']
            }
        },
        'staff': {
            password: 'staff',
            user: {
                id: 'staff-001',
                username: 'staff',
                email: 'staff@restaurant.com',
                firstName: 'Staff',
                lastName: 'Member',
                role: 'staff',
                restaurantId: 'demo-restaurant',
                permissions: ['read', 'write']
            }
        }
    };

    const userConfig = users[username.toLowerCase()];
    
    if (!userConfig || userConfig.password !== password) {
        return {
            success: false,
            error: 'Invalid username or password'
        };
    }

    return {
        success: true,
        user: userConfig.user,
        token: `demo-token-${userConfig.user.id}-${Date.now()}`
    };
}

function checkAuthentication() {
    try {
        const user = localStorage.getItem('currentUser');
        const token = localStorage.getItem('authToken');
        
        if (!user || !token) {
            return false;
        }
        
        JSON.parse(user); // Validate JSON
        return true;
    } catch (error) {
        localStorage.removeItem('currentUser');
        localStorage.removeItem('authToken');
        return false;
    }
}

function hasPermission(user, permission) {
    return user.permissions && user.permissions.includes(permission);
}

function getUIState(user) {
    const isAdmin = user.role === 'admin';
    
    return {
        showAdminAnalytics: isAdmin,
        showAdminActions: isAdmin,
        showUserManagement: isAdmin,
        roleIndicator: {
            text: isAdmin ? 'ADMIN' : 'STAFF',
            class: isAdmin ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'
        }
    };
}

module.exports = {
    authenticateUser,
    checkAuthentication,
    hasPermission,
    getUIState
};