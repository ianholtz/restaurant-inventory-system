// Admin Dashboard functionality
class AdminDashboard {
    constructor() {
        this.user = null;
        this.init();
    }

    init() {
        this.checkAuthentication();
        this.setupEventListeners();
        this.loadDashboardData();
        this.startRealTimeUpdates();
    }

    checkAuthentication() {
        const token = localStorage.getItem('accessToken');
        const tokenExpiry = localStorage.getItem('tokenExpiry');
        const userStr = localStorage.getItem('user');

        if (!token || !tokenExpiry || !userStr || Date.now() >= parseInt(tokenExpiry)) {
            // Token expired or missing, redirect to login
            this.redirectToLogin();
            return;
        }

        this.user = JSON.parse(userStr);

        // Check if user is admin
        if (this.user.role !== 'admin') {
            alert('Access denied. Admin privileges required.');
            this.redirectToLogin();
            return;
        }

        this.updateUserInfo();
    }

    updateUserInfo() {
        const userInfoElement = document.getElementById('userInfo');
        if (userInfoElement && this.user) {
            userInfoElement.innerHTML = `
                <div class="font-medium">${this.user.firstName} ${this.user.lastName}</div>
                <div class="text-blue-100">${this.user.email}</div>
            `;
        }
    }

    setupEventListeners() {
        // Logout button
        document.getElementById('logoutBtn').addEventListener('click', () => {
            this.logout();
        });

        // View regular dashboard button
        document.getElementById('viewRegularDashboard').addEventListener('click', () => {
            window.open('index.html', '_blank');
        });

        // Add click handlers for management buttons (placeholder functionality)
        const managementButtons = document.querySelectorAll('button[class*="w-full text-left"]');
        managementButtons.forEach(button => {
            if (button.id !== 'viewRegularDashboard') {
                button.addEventListener('click', () => {
                    const buttonText = button.querySelector('span').textContent;
                    this.showNotification(`${buttonText} feature coming soon!`, 'info');
                });
            }
        });
    }

    loadDashboardData() {
        // Simulate loading dashboard data
        this.updateSystemStats();
        this.loadRecentActivity();
    }

    updateSystemStats() {
        // Simulate real-time stats updates
        const stats = {
            totalRestaurants: Math.floor(Math.random() * 20) + 10,
            activeUsers: Math.floor(Math.random() * 100) + 30,
            totalSystemItems: Math.floor(Math.random() * 2000) + 1000,
            systemAlerts: Math.floor(Math.random() * 10)
        };

        document.getElementById('totalRestaurants').textContent = stats.totalRestaurants;
        document.getElementById('activeUsers').textContent = stats.activeUsers;
        document.getElementById('totalSystemItems').textContent = stats.totalSystemItems.toLocaleString();
        document.getElementById('systemAlerts').textContent = stats.systemAlerts;

        // Add pulse animation to alerts if there are any
        const alertsElement = document.getElementById('systemAlerts');
        if (stats.systemAlerts > 0) {
            alertsElement.parentElement.parentElement.classList.add('pulse');
        } else {
            alertsElement.parentElement.parentElement.classList.remove('pulse');
        }
    }

    loadRecentActivity() {
        // This would typically load from an API
        // For demo purposes, the activity is already in the HTML
        console.log('Recent activity loaded');
    }

    startRealTimeUpdates() {
        // Update stats every 30 seconds
        setInterval(() => {
            this.updateSystemStats();
        }, 30000);

        // Simulate new activity notifications
        setInterval(() => {
            if (Math.random() < 0.3) {
                this.simulateNewActivity();
            }
        }, 45000);
    }

    simulateNewActivity() {
        const activities = [
            {
                icon: 'fa-user-plus',
                iconColor: 'green',
                title: 'New user registered',
                description: 'A new user joined the system',
                time: 'Just now'
            },
            {
                icon: 'fa-exclamation-triangle',
                iconColor: 'yellow',
                title: 'System alert',
                description: 'Low stock alert from a restaurant',
                time: 'Just now'
            },
            {
                icon: 'fa-building',
                iconColor: 'blue',
                title: 'Restaurant updated',
                description: 'A restaurant updated their information',
                time: 'Just now'
            }
        ];

        const randomActivity = activities[Math.floor(Math.random() * activities.length)];
        this.showNotification(`${randomActivity.title}: ${randomActivity.description}`, 'info');
    }

    logout() {
        // Clear all stored authentication data
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('user');
        localStorage.removeItem('tokenExpiry');

        this.showNotification('Logged out successfully', 'success');
        
        // Redirect to login page after a short delay
        setTimeout(() => {
            this.redirectToLogin();
        }, 1000);
    }

    redirectToLogin() {
        window.location.href = 'login.html';
    }

    showNotification(message, type = 'info') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `fixed top-4 right-4 p-4 rounded-lg shadow-lg z-50 ${
            type === 'success' ? 'bg-green-100 text-green-800 border border-green-300' :
            type === 'error' ? 'bg-red-100 text-red-800 border border-red-300' :
            'bg-blue-100 text-blue-800 border border-blue-300'
        }`;
        
        notification.innerHTML = `
            <div class="flex items-center">
                <i class="fas ${
                    type === 'success' ? 'fa-check-circle' :
                    type === 'error' ? 'fa-exclamation-circle' :
                    'fa-info-circle'
                } mr-2"></i>
                <span>${message}</span>
                <button class="ml-4 text-current opacity-70 hover:opacity-100" onclick="this.parentElement.parentElement.remove()">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `;

        document.body.appendChild(notification);

        // Auto remove after 5 seconds
        setTimeout(() => {
            if (notification.parentElement) {
                notification.remove();
            }
        }, 5000);
    }

    // Method to handle API calls with authentication
    async makeAuthenticatedRequest(url, options = {}) {
        const token = localStorage.getItem('accessToken');
        
        const defaultOptions = {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
                ...options.headers
            }
        };

        const response = await fetch(url, { ...options, ...defaultOptions });

        if (response.status === 401) {
            // Token expired, redirect to login
            this.redirectToLogin();
            return null;
        }

        return response;
    }
}

// Initialize admin dashboard when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.adminDashboard = new AdminDashboard();
});