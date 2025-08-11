// Demo Authentication Tests
// Simple test suite for the admin login functionality

class TestRunner {
    constructor() {
        this.tests = [];
        this.results = [];
    }

    addTest(name, testFn) {
        this.tests.push({ name, testFn });
    }

    async runTests() {
        console.log('🧪 Running Admin Login Tests...\n');
        
        for (const test of this.tests) {
            try {
                await test.testFn();
                this.results.push({ name: test.name, status: 'PASS', error: null });
                console.log(`✅ ${test.name}`);
            } catch (error) {
                this.results.push({ name: test.name, status: 'FAIL', error: error.message });
                console.log(`❌ ${test.name}: ${error.message}`);
            }
        }

        this.printSummary();
    }

    printSummary() {
        const passed = this.results.filter(r => r.status === 'PASS').length;
        const failed = this.results.filter(r => r.status === 'FAIL').length;
        
        console.log('\n📊 Test Summary:');
        console.log(`✅ Passed: ${passed}`);
        console.log(`❌ Failed: ${failed}`);
        console.log(`📈 Total: ${this.results.length}`);
        
        if (failed === 0) {
            console.log('\n🎉 All tests passed!');
        }
    }

    assert(condition, message) {
        if (!condition) {
            throw new Error(message || 'Assertion failed');
        }
    }

    assertEqual(actual, expected, message) {
        if (actual !== expected) {
            throw new Error(message || `Expected ${expected}, got ${actual}`);
        }
    }
}

// Test Suite
const testRunner = new TestRunner();

// Test AuthManager class
testRunner.addTest('AuthManager should initialize correctly', () => {
    const authManager = new AuthManager();
    testRunner.assert(authManager.currentUser === null, 'Current user should be null initially');
    testRunner.assert(authManager.isAuthenticated === false, 'Should not be authenticated initially');
});

testRunner.addTest('AuthManager should authenticate admin user', async () => {
    const authManager = new AuthManager();
    const user = await authManager.authenticate('admin', 'admin');
    
    testRunner.assertEqual(user.username, 'admin', 'Username should be admin');
    testRunner.assertEqual(user.role, 'admin', 'Role should be admin');
    testRunner.assertEqual(user.name, 'Administrator', 'Name should be Administrator');
    testRunner.assert(authManager.isAuthenticated === true, 'Should be authenticated after login');
});

testRunner.addTest('AuthManager should authenticate regular user', async () => {
    const authManager = new AuthManager();
    const user = await authManager.authenticate('user', 'user');
    
    testRunner.assertEqual(user.username, 'user', 'Username should be user');
    testRunner.assertEqual(user.role, 'user', 'Role should be user');
    testRunner.assertEqual(user.name, 'Staff User', 'Name should be Staff User');
    testRunner.assert(authManager.isAuthenticated === true, 'Should be authenticated after login');
});

testRunner.addTest('AuthManager should reject invalid credentials', async () => {
    const authManager = new AuthManager();
    let errorThrown = false;
    
    try {
        await authManager.authenticate('invalid', 'invalid');
    } catch (error) {
        errorThrown = true;
        testRunner.assertEqual(error.message, 'Invalid credentials', 'Should throw invalid credentials error');
    }
    
    testRunner.assert(errorThrown, 'Should throw error for invalid credentials');
    testRunner.assert(authManager.isAuthenticated === false, 'Should not be authenticated after failed login');
});

testRunner.addTest('AuthManager should identify admin users correctly', async () => {
    const authManager = new AuthManager();
    await authManager.authenticate('admin', 'admin');
    
    testRunner.assert(authManager.isAdmin() === true, 'Should identify admin user correctly');
});

testRunner.addTest('AuthManager should identify regular users correctly', async () => {
    const authManager = new AuthManager();
    await authManager.authenticate('user', 'user');
    
    testRunner.assert(authManager.isAdmin() === false, 'Should identify regular user correctly');
});

testRunner.addTest('AuthManager should logout correctly', async () => {
    const authManager = new AuthManager();
    await authManager.authenticate('admin', 'admin');
    
    // Verify logged in
    testRunner.assert(authManager.isAuthenticated === true, 'Should be authenticated before logout');
    
    // Logout
    authManager.logout();
    
    // Verify logged out
    testRunner.assert(authManager.isAuthenticated === false, 'Should not be authenticated after logout');
    testRunner.assert(authManager.currentUser === null, 'Current user should be null after logout');
});

testRunner.addTest('AuthManager should persist session in localStorage', async () => {
    const authManager = new AuthManager();
    await authManager.authenticate('admin', 'admin');
    
    // Check localStorage
    const storedUser = localStorage.getItem('currentUser');
    testRunner.assert(storedUser !== null, 'User data should be stored in localStorage');
    
    const userData = JSON.parse(storedUser);
    testRunner.assertEqual(userData.username, 'admin', 'Stored username should be admin');
    testRunner.assertEqual(userData.role, 'admin', 'Stored role should be admin');
});

testRunner.addTest('AuthManager should restore session from localStorage', async () => {
    // First, authenticate and store in localStorage
    const authManager1 = new AuthManager();
    await authManager1.authenticate('admin', 'admin');
    
    // Create new instance and check if it restores session
    const authManager2 = new AuthManager();
    const restored = authManager2.checkAuthStatus();
    
    testRunner.assert(restored === true, 'Should restore session from localStorage');
    testRunner.assert(authManager2.isAuthenticated === true, 'Should be authenticated after restoration');
    testRunner.assertEqual(authManager2.currentUser.username, 'admin', 'Should restore correct user data');
});

testRunner.addTest('AuthManager should clear localStorage on logout', async () => {
    const authManager = new AuthManager();
    await authManager.authenticate('admin', 'admin');
    
    // Verify data is stored
    testRunner.assert(localStorage.getItem('currentUser') !== null, 'User data should be in localStorage');
    
    // Logout
    authManager.logout();
    
    // Verify data is cleared
    testRunner.assert(localStorage.getItem('currentUser') === null, 'User data should be cleared from localStorage');
});

// DOM-based tests (these would run in browser environment)
testRunner.addTest('Login form should exist in DOM', () => {
    // This test assumes we're running in a browser environment with the HTML loaded
    if (typeof document !== 'undefined') {
        const loginForm = document.getElementById('loginForm');
        testRunner.assert(loginForm !== null, 'Login form should exist in DOM');
        
        const usernameField = document.getElementById('username');
        const passwordField = document.getElementById('password');
        
        testRunner.assert(usernameField !== null, 'Username field should exist');
        testRunner.assert(passwordField !== null, 'Password field should exist');
    } else {
        console.log('⚠️  Skipping DOM test - not in browser environment');
    }
});

// Export for use in browser console or Node.js
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { TestRunner, testRunner };
} else if (typeof window !== 'undefined') {
    window.TestRunner = TestRunner;
    window.testRunner = testRunner;
}

// Auto-run tests if in browser and DOM is ready
if (typeof document !== 'undefined') {
    document.addEventListener('DOMContentLoaded', () => {
        // Add a test button to the page for manual testing
        const testButton = document.createElement('button');
        testButton.textContent = 'Run Tests';
        testButton.className = 'fixed bottom-4 left-4 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 z-50';
        testButton.onclick = () => testRunner.runTests();
        document.body.appendChild(testButton);
    });
}