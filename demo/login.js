// Login functionality for Restaurant Inventory System
class LoginManager {
    constructor() {
        this.isAdminMode = false;
        this.apiBaseUrl = 'https://your-api-gateway-url.com'; // Replace with actual API URL
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.checkExistingSession();
    }

    setupEventListeners() {
        // Tab switching
        document.getElementById('regularLoginTab').addEventListener('click', () => {
            this.switchToRegularLogin();
        });

        document.getElementById('adminLoginTab').addEventListener('click', () => {
            this.switchToAdminLogin();
        });

        // Form submission
        document.getElementById('loginForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleLogin();
        });

        // Enter key handling
        document.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                this.handleLogin();
            }
        });
    }

    switchToRegularLogin() {
        this.isAdminMode = false;
        document.getElementById('regularLoginTab').className = 'flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors bg-white text-blue-600 shadow-sm';
        document.getElementById('adminLoginTab').className = 'flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors text-gray-600 hover:text-gray-800';
        document.getElementById('regularLoginFields').classList.remove('hidden');
        document.getElementById('adminLoginFields').classList.add('hidden');
        this.clearForm();
    }

    switchToAdminLogin() {
        this.isAdminMode = true;
        document.getElementById('adminLoginTab').className = 'flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors bg-white text-blue-600 shadow-sm';
        document.getElementById('regularLoginTab').className = 'flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors text-gray-600 hover:text-gray-800';
        document.getElementById('adminLoginFields').classList.remove('hidden');
        document.getElementById('regularLoginFields').classList.add('hidden');
        this.clearForm();
        
        // Pre-fill admin credentials for demo
        document.getElementById('username').value = 'admin';
        document.getElementById('adminPassword').value = 'admin';
    }

    clearForm() {
        document.getElementById('email').value = '';
        document.getElementById('password').value = '';
        document.getElementById('username').value = '';
        document.getElementById('adminPassword').value = '';
        this.clearAlerts();
    }

    async handleLogin() {
        const loginButton = document.getElementById('loginButton');
        const loginButtonText = document.getElementById('loginButtonText');
        const loginSpinner = document.getElementById('loginSpinner');

        // Show loading state
        loginButton.disabled = true;
        loginButtonText.textContent = 'Signing In...';
        loginSpinner.classList.remove('hidden');

        try {
            let loginData;

            if (this.isAdminMode) {
                const username = document.getElementById('username').value.trim();
                const password = document.getElementById('adminPassword').value;

                if (!username || !password) {
                    throw new Error('Please enter both username and password');
                }

                loginData = { username, password };
            } else {
                const email = document.getElementById('email').value.trim();
                const password = document.getElementById('password').value;

                if (!email || !password) {
                    throw new Error('Please enter both email and password');
                }

                if (!this.isValidEmail(email)) {
                    throw new Error('Please enter a valid email address');
                }

                loginData = { email, password };
            }

            const response = await this.makeLoginRequest(loginData);
            
            if (response.success) {
                this.handleLoginSuccess(response.data);
            } else {
                throw new Error(response.error || 'Login failed');
            }

        } catch (error) {
            this.showAlert(error.message, 'error');
        } finally {
            // Reset loading state
            loginButton.disabled = false;
            loginButtonText.textContent = 'Sign In';
            loginSpinner.classList.add('hidden');
        }
    }

    async makeLoginRequest(loginData) {
        // For demo purposes, simulate API call with mock data
        if (this.isAdminMode && loginData.username === 'admin' && loginData.password === 'admin') {
            // Simulate API delay
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            return {
                success: true,
                data: {
                    accessToken: 'mock-admin-token',
                    refreshToken: 'mock-admin-refresh-token',
                    expiresIn: 3600,
                    user: {
                        id: 'admin-user-id',
                        email: 'admin@system.local',
                        firstName: 'System',
                        lastName: 'Administrator',
                        role: 'admin',
                        restaurantId: null
                    }
                }
            };
        }

        // For regular users, simulate a failed login for demo
        await new Promise(resolve => setTimeout(resolve, 1000));
        return {
            success: false,
            error: 'Regular user login not implemented in demo'
        };

        // Uncomment and modify this for actual API integration:
        /*
        const response = await fetch(`${this.apiBaseUrl}/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(loginData)
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        return await response.json();
        */
    }

    handleLoginSuccess(data) {
        // Store authentication data
        localStorage.setItem('accessToken', data.accessToken);
        localStorage.setItem('refreshToken', data.refreshToken);
        localStorage.setItem('user', JSON.stringify(data.user));
        localStorage.setItem('tokenExpiry', Date.now() + (data.expiresIn * 1000));

        this.showAlert('Login successful! Redirecting...', 'success');

        // Redirect based on user role
        setTimeout(() => {
            if (data.user.role === 'admin') {
                window.location.href = 'admin-dashboard.html';
            } else {
                window.location.href = 'index.html';
            }
        }, 1500);
    }

    checkExistingSession() {
        const token = localStorage.getItem('accessToken');
        const tokenExpiry = localStorage.getItem('tokenExpiry');
        const user = localStorage.getItem('user');

        if (token && tokenExpiry && user && Date.now() < parseInt(tokenExpiry)) {
            const userData = JSON.parse(user);
            // User is already logged in, redirect to appropriate dashboard
            if (userData.role === 'admin') {
                window.location.href = 'admin-dashboard.html';
            } else {
                window.location.href = 'index.html';
            }
        }
    }

    isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    showAlert(message, type = 'info') {
        const alertContainer = document.getElementById('alertContainer');
        const alertClass = type === 'error' ? 'bg-red-100 border-red-400 text-red-700' : 
                          type === 'success' ? 'bg-green-100 border-green-400 text-green-700' :
                          'bg-blue-100 border-blue-400 text-blue-700';

        const alertIcon = type === 'error' ? 'fa-exclamation-circle' :
                         type === 'success' ? 'fa-check-circle' :
                         'fa-info-circle';

        const alertHtml = `
            <div class="alert border-l-4 p-4 rounded ${alertClass}">
                <div class="flex items-center">
                    <i class="fas ${alertIcon} mr-3"></i>
                    <span>${message}</span>
                    <button onclick="this.parentElement.parentElement.remove()" class="ml-auto text-current opacity-70 hover:opacity-100">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
            </div>
        `;

        alertContainer.innerHTML = alertHtml;

        // Auto-remove success messages
        if (type === 'success') {
            setTimeout(() => {
                const alert = alertContainer.querySelector('.alert');
                if (alert) {
                    alert.remove();
                }
            }, 3000);
        }
    }

    clearAlerts() {
        document.getElementById('alertContainer').innerHTML = '';
    }
}

// Initialize login manager when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.loginManager = new LoginManager();
});