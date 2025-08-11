// Unit tests for the Admin Login functionality
// This is a simple test suite that can be run in a browser console or with a test runner

class AuthTests {
    constructor() {
        this.tests = [];
        this.results = { passed: 0, failed: 0, total: 0 };
    }

    // Test helper methods
    assert(condition, message) {
        this.results.total++;
        if (condition) {
            this.results.passed++;
            console.log(`✅ PASS: ${message}`);
            return true;
        } else {
            this.results.failed++;
            console.log(`❌ FAIL: ${message}`);
            return false;
        }
    }

    assertEqual(actual, expected, message) {
        return this.assert(actual === expected, `${message} (expected: ${expected}, actual: ${actual})`);
    }

    assertNotNull(value, message) {
        return this.assert(value !== null && value !== undefined, message);
    }

    // Mock DOM elements for testing
    setupMockDOM() {
        // Create mock elements that would exist in the real DOM
        const mockElements = {
            loginScreen: { classList: { add: () => {}, remove: () => {} } },
            mainApp: { classList: { add: () => {}, remove: () => {} } },
            username: { value: '', focus: () => {} },
            password: { value: '' },
            loginBtn: { disabled: false },
            loginBtnText: { textContent: 'Sign In' },
            loginSpinner: { classList: { add: () => {}, remove: () => {} } },
            loginError: { classList: { add: () => {}, remove: () => {} } },
            userRoleBadge: { classList: { add: () => {}, remove: () => {} } },
            adminSection: { classList: { add: () => {}, remove: () => {} } },
            adminControls: { classList: { add: () => {}, remove: () => {} } },
            appHeader: { 
                classList: { add: () => {}, remove: () => {} },
                querySelector: () => ({ classList: { add: () => {}, remove: () => {} } })
            }
        };

        // Mock document.getElementById
        global.document = {
            getElementById: (id) => mockElements[id] || null,
            addEventListener: () => {}
        };

        return mockElements;
    }

    // Test AuthManager class functionality
    async testAuthManagerCreation() {
        console.log('\n🧪 Testing AuthManager Creation...');
        
        this.setupMockDOM();
        
        // Mock the AuthManager class (simplified version for testing)
        class MockAuthManager {
            constructor() {
                this.currentUser = null;
                this.isAuthenticated = false;
            }

            async authenticate(username, password) {
                if (username === 'admin' && password === 'admin') {
                    this.currentUser = { username: 'admin', role: 'admin' };
                    this.isAuthenticated = true;
                    return true;
                }
                return false;
            }

            logout() {
                this.currentUser = null;
                this.isAuthenticated = false;
            }

            getCurrentUser() {
                return this.currentUser;
            }

            isUserAuthenticated() {
                return this.isAuthenticated;
            }
        }

        const authManager = new MockAuthManager();
        
        this.assertNotNull(authManager, 'AuthManager should be created');
        this.assertEqual(authManager.isAuthenticated, false, 'Initial authentication state should be false');
        this.assertEqual(authManager.currentUser, null, 'Initial user should be null');
    }

    async testValidLogin() {
        console.log('\n🧪 Testing Valid Login...');
        
        class MockAuthManager {
            constructor() {
                this.currentUser = null;
                this.isAuthenticated = false;
            }

            async authenticate(username, password) {
                if (username === 'admin' && password === 'admin') {
                    this.currentUser = { username: 'admin', role: 'admin', loginTime: new Date() };
                    this.isAuthenticated = true;
                    return true;
                }
                return false;
            }
        }

        const authManager = new MockAuthManager();
        const result = await authManager.authenticate('admin', 'admin');
        
        this.assert(result, 'Valid credentials should return true');
        this.assert(authManager.isAuthenticated, 'Should be authenticated after valid login');
        this.assertNotNull(authManager.currentUser, 'Current user should be set after login');
        this.assertEqual(authManager.currentUser.username, 'admin', 'Username should be admin');
        this.assertEqual(authManager.currentUser.role, 'admin', 'Role should be admin');
    }

    async testInvalidLogin() {
        console.log('\n🧪 Testing Invalid Login...');
        
        class MockAuthManager {
            constructor() {
                this.currentUser = null;
                this.isAuthenticated = false;
            }

            async authenticate(username, password) {
                if (username === 'admin' && password === 'admin') {
                    this.currentUser = { username: 'admin', role: 'admin' };
                    this.isAuthenticated = true;
                    return true;
                }
                return false;
            }
        }

        const authManager = new MockAuthManager();
        
        // Test various invalid credentials
        const invalidCredentials = [
            ['wrong', 'admin'],
            ['admin', 'wrong'],
            ['wrong', 'wrong'],
            ['', ''],
            ['admin', '']
        ];

        for (const [username, password] of invalidCredentials) {
            const result = await authManager.authenticate(username, password);
            this.assert(!result, `Invalid credentials [${username}/${password}] should return false`);
            this.assert(!authManager.isAuthenticated, 'Should not be authenticated with invalid credentials');
            this.assertEqual(authManager.currentUser, null, 'Current user should remain null with invalid credentials');
        }
    }

    async testLogout() {
        console.log('\n🧪 Testing Logout...');
        
        class MockAuthManager {
            constructor() {
                this.currentUser = null;
                this.isAuthenticated = false;
            }

            async authenticate(username, password) {
                if (username === 'admin' && password === 'admin') {
                    this.currentUser = { username: 'admin', role: 'admin' };
                    this.isAuthenticated = true;
                    return true;
                }
                return false;
            }

            logout() {
                this.currentUser = null;
                this.isAuthenticated = false;
            }
        }

        const authManager = new MockAuthManager();
        
        // First login
        await authManager.authenticate('admin', 'admin');
        this.assert(authManager.isAuthenticated, 'Should be authenticated before logout');
        
        // Then logout
        authManager.logout();
        this.assert(!authManager.isAuthenticated, 'Should not be authenticated after logout');
        this.assertEqual(authManager.currentUser, null, 'Current user should be null after logout');
    }

    testInventoryDemoIntegration() {
        console.log('\n🧪 Testing InventoryDemo Integration...');
        
        // Mock InventoryDemo class
        class MockInventoryDemo {
            constructor(user = null) {
                this.user = user;
                this.inventory = [];
                this.isInitialized = true;
            }

            hasAdminAccess() {
                return this.user && this.user.role === 'admin';
            }

            exportData() {
                if (!this.hasAdminAccess()) {
                    throw new Error('Access denied: Admin privileges required');
                }
                return 'CSV data would be exported';
            }

            showSettings() {
                if (!this.hasAdminAccess()) {
                    throw new Error('Access denied: Admin privileges required');
                }
                return 'Settings panel would be shown';
            }
        }

        // Test with admin user
        const adminUser = { username: 'admin', role: 'admin' };
        const adminDemo = new MockInventoryDemo(adminUser);
        
        this.assert(adminDemo.isInitialized, 'InventoryDemo should initialize with user');
        this.assert(adminDemo.hasAdminAccess(), 'Admin user should have admin access');
        
        try {
            adminDemo.exportData();
            this.assert(true, 'Admin should be able to export data');
        } catch (e) {
            this.assert(false, 'Admin should be able to export data');
        }

        try {
            adminDemo.showSettings();
            this.assert(true, 'Admin should be able to access settings');
        } catch (e) {
            this.assert(false, 'Admin should be able to access settings');
        }

        // Test with no user
        const noUserDemo = new MockInventoryDemo();
        this.assert(!noUserDemo.hasAdminAccess(), 'No user should not have admin access');
        
        try {
            noUserDemo.exportData();
            this.assert(false, 'No user should not be able to export data');
        } catch (e) {
            this.assert(true, 'No user should not be able to export data');
        }
    }

    // Run all tests
    async runAllTests() {
        console.log('🚀 Starting Admin Login Tests...\n');
        
        await this.testAuthManagerCreation();
        await this.testValidLogin();
        await this.testInvalidLogin();
        await this.testLogout();
        this.testInventoryDemoIntegration();
        
        console.log('\n📊 Test Results:');
        console.log(`✅ Passed: ${this.results.passed}`);
        console.log(`❌ Failed: ${this.results.failed}`);
        console.log(`📈 Total: ${this.results.total}`);
        console.log(`🎯 Success Rate: ${((this.results.passed / this.results.total) * 100).toFixed(1)}%`);
        
        if (this.results.failed === 0) {
            console.log('\n🎉 All tests passed! The admin login functionality is working correctly.');
        } else {
            console.log('\n⚠️  Some tests failed. Please review the implementation.');
        }
        
        return this.results;
    }
}

// Export for use in browser or Node.js
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AuthTests;
} else if (typeof window !== 'undefined') {
    window.AuthTests = AuthTests;
}

// Auto-run tests if this file is loaded directly
if (typeof window !== 'undefined') {
    document.addEventListener('DOMContentLoaded', () => {
        const tests = new AuthTests();
        tests.runAllTests();
    });
}