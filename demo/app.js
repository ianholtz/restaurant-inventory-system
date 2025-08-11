// Restaurant Inventory Management Demo
class InventoryDemo {
    constructor() {
        this.inventory = [];
        this.filteredInventory = [];
        this.isOnline = navigator.onLine;
        this.wsConnected = false;
        this.user = null;
        this.init();
    }

    init() {
        this.checkAuthentication();
        this.loadSampleData();
        this.setupEventListeners();
        this.simulateWebSocketConnection();
        this.updateUI();
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
        this.updateUserInfo();
    }

    updateUserInfo() {
        const userInfoElement = document.getElementById('userInfo');
        if (userInfoElement && this.user) {
            const roleDisplay = this.user.role === 'admin' ? 'Administrator' : 
                               this.user.role.charAt(0).toUpperCase() + this.user.role.slice(1);
            
            userInfoElement.innerHTML = `
                <div class="font-medium">${this.user.firstName} ${this.user.lastName}</div>
                <div class="text-gray-500">${roleDisplay}</div>
            `;
        }
    }

    redirectToLogin() {
        window.location.href = 'login.html';
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

    loadSampleData() {
        this.inventory = [
            {
                id: '1',
                name: 'Roma Tomatoes',
                category: 'produce',
                quantity: 15,
                unit: 'kg',
                costPerUnit: 2.50,
                supplier: 'Fresh Produce Co',
                expirationDate: this.getDateString(3),
                minimumStock: 10
            },
            {
                id: '2',
                name: 'Ground Beef',
                category: 'meat',
                quantity: 8,
                unit: 'kg',
                costPerUnit: 12.00,
                supplier: 'Quality Meats Ltd',
                expirationDate: this.getDateString(2),
                minimumStock: 5
            },
            {
                id: '3',
                name: 'Whole Milk',
                category: 'dairy',
                quantity: 25,
                unit: 'liters',
                costPerUnit: 1.20,
                supplier: 'Dairy Fresh',
                expirationDate: this.getDateString(5),
                minimumStock: 15
            },
            {
                id: '4',
                name: 'Pasta',
                category: 'dry_goods',
                quantity: 50,
                unit: 'kg',
                costPerUnit: 1.80,
                supplier: 'Italian Foods Inc',
                expirationDate: this.getDateString(180),
                minimumStock: 20
            },
            {
                id: '5',
                name: 'Orange Juice',
                category: 'beverages',
                quantity: 12,
                unit: 'liters',
                costPerUnit: 3.50,
                supplier: 'Citrus Co',
                expirationDate: this.getDateString(7),
                minimumStock: 10
            },
            {
                id: '6',
                name: 'Lettuce',
                category: 'produce',
                quantity: 3,
                unit: 'kg',
                costPerUnit: 2.00,
                supplier: 'Green Gardens',
                expirationDate: this.getDateString(1),
                minimumStock: 8
            }
        ];
        this.filteredInventory = [...this.inventory];
    }

    getDateString(daysFromNow) {
        const date = new Date();
        date.setDate(date.getDate() + daysFromNow);
        return date.toISOString().split('T')[0];
    }

    setupEventListeners() {
        // Refresh button
        document.getElementById('refreshBtn').addEventListener('click', () => {
            this.refreshData();
        });

        // Logout button
        document.getElementById('logoutBtn').addEventListener('click', () => {
            this.logout();
        });

        // Add item button and modal
        document.getElementById('addItemBtn').addEventListener('click', () => {
            this.showAddItemModal();
        });

        document.getElementById('closeModal').addEventListener('click', () => {
            this.hideAddItemModal();
        });

        document.getElementById('cancelBtn').addEventListener('click', () => {
            this.hideAddItemModal();
        });

        // Add item form
        document.getElementById('addItemForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.addNewItem();
        });

        // Filters
        document.getElementById('categoryFilter').addEventListener('change', () => {
            this.applyFilters();
        });

        document.getElementById('statusFilter').addEventListener('change', () => {
            this.applyFilters();
        });

        // Network status
        window.addEventListener('online', () => {
            this.isOnline = true;
            this.updateConnectionStatus();
        });

        window.addEventListener('offline', () => {
            this.isOnline = false;
            this.updateConnectionStatus();
        });
    }

    simulateWebSocketConnection() {
        // Simulate connection process
        setTimeout(() => {
            this.wsConnected = true;
            this.updateConnectionStatus();
        }, 2000);
    }

    startRealTimeUpdates() {
        // Simulate real-time inventory updates
        setInterval(() => {
            if (this.wsConnected && Math.random() < 0.3) {
                this.simulateInventoryUpdate();
            }
        }, 5000);

        // Simulate alerts
        setInterval(() => {
            if (this.wsConnected && Math.random() < 0.2) {
                this.showRandomAlert();
            }
        }, 15000);
    }

    simulateInventoryUpdate() {
        const randomItem = this.inventory[Math.floor(Math.random() * this.inventory.length)];
        const change = Math.floor(Math.random() * 10) - 5; // -5 to +5
        randomItem.quantity = Math.max(0, randomItem.quantity + change);
        
        this.applyFilters();
        this.updateUI();
        
        // Show notification
        this.showNotification(`${randomItem.name} quantity updated to ${randomItem.quantity} ${randomItem.unit}`);
    }

    showRandomAlert() {
        const alerts = [
            'Low stock alert: Lettuce is running low',
            'Expiration warning: Ground Beef expires in 2 days',
            'New delivery: Fresh produce shipment arrived'
        ];
        
        const randomAlert = alerts[Math.floor(Math.random() * alerts.length)];
        this.showNotification(randomAlert, 'warning');
    }

    showNotification(message, type = 'info') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `fixed top-4 right-4 p-4 rounded-lg shadow-lg z-50 ${
            type === 'warning' ? 'bg-yellow-100 text-yellow-800 border border-yellow-300' : 
            'bg-blue-100 text-blue-800 border border-blue-300'
        }`;
        notification.innerHTML = `
            <div class="flex items-center">
                <i class="fas ${type === 'warning' ? 'fa-exclamation-triangle' : 'fa-info-circle'} mr-2"></i>
                <span>${message}</span>
                <button class="ml-4 text-gray-500 hover:text-gray-700" onclick="this.parentElement.parentElement.remove()">
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

    updateConnectionStatus() {
        const statusElement = document.getElementById('connectionStatus');
        const dot = statusElement.querySelector('div');
        const text = statusElement.querySelector('span');

        if (!this.isOnline) {
            dot.className = 'w-3 h-3 rounded-full status-offline mr-2';
            text.textContent = 'Offline';
        } else if (this.wsConnected) {
            dot.className = 'w-3 h-3 rounded-full status-online mr-2';
            text.textContent = 'Live';
        } else {
            dot.className = 'w-3 h-3 rounded-full status-connecting mr-2 pulse';
            text.textContent = 'Connecting...';
        }
    }

    refreshData() {
        const spinner = document.getElementById('loadingSpinner');
        const grid = document.getElementById('inventoryGrid');
        
        spinner.classList.remove('hidden');
        grid.classList.add('hidden');
        
        // Simulate API call delay
        setTimeout(() => {
            this.updateUI();
            spinner.classList.add('hidden');
            grid.classList.remove('hidden');
            this.showNotification('Inventory data refreshed');
        }, 1000);
    }

    applyFilters() {
        const categoryFilter = document.getElementById('categoryFilter').value;
        const statusFilter = document.getElementById('statusFilter').value;

        this.filteredInventory = this.inventory.filter(item => {
            // Category filter
            if (categoryFilter && item.category !== categoryFilter) {
                return false;
            }

            // Status filter
            if (statusFilter === 'low_stock' && item.quantity > item.minimumStock) {
                return false;
            }
            if (statusFilter === 'expiring') {
                const daysUntilExpiry = this.getDaysUntilExpiry(item.expirationDate);
                if (daysUntilExpiry > 7) {
                    return false;
                }
            }

            return true;
        });

        this.updateInventoryGrid();
    }

    getDaysUntilExpiry(expirationDate) {
        const today = new Date();
        const expiry = new Date(expirationDate);
        const diffTime = expiry - today;
        return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    }

    updateUI() {
        this.updateStats();
        this.updateAlerts();
        this.updateInventoryGrid();
        this.updateConnectionStatus();
    }

    updateStats() {
        const totalItems = this.inventory.length;
        const lowStockItems = this.inventory.filter(item => item.quantity <= item.minimumStock).length;
        const expiringSoonItems = this.inventory.filter(item => this.getDaysUntilExpiry(item.expirationDate) <= 7).length;
        const totalValue = this.inventory.reduce((sum, item) => sum + (item.quantity * item.costPerUnit), 0);

        document.getElementById('totalItems').textContent = totalItems;
        document.getElementById('lowStockCount').textContent = lowStockItems;
        document.getElementById('expiringSoonCount').textContent = expiringSoonItems;
        document.getElementById('totalValue').textContent = `$${totalValue.toFixed(2)}`;
    }

    updateAlerts() {
        const alertsSection = document.getElementById('alertsSection');
        const alertsList = document.getElementById('alertsList');
        
        const alerts = [];
        
        // Low stock alerts
        this.inventory.forEach(item => {
            if (item.quantity <= item.minimumStock) {
                alerts.push({
                    type: 'critical',
                    message: `${item.name} is low in stock (${item.quantity} ${item.unit} remaining)`
                });
            }
        });

        // Expiring soon alerts
        this.inventory.forEach(item => {
            const daysUntilExpiry = this.getDaysUntilExpiry(item.expirationDate);
            if (daysUntilExpiry <= 2 && daysUntilExpiry > 0) {
                alerts.push({
                    type: 'critical',
                    message: `${item.name} expires in ${daysUntilExpiry} day${daysUntilExpiry === 1 ? '' : 's'}`
                });
            } else if (daysUntilExpiry <= 7 && daysUntilExpiry > 2) {
                alerts.push({
                    type: 'warning',
                    message: `${item.name} expires in ${daysUntilExpiry} days`
                });
            }
        });

        if (alerts.length > 0) {
            alertsSection.classList.remove('hidden');
            alertsList.innerHTML = alerts.map(alert => `
                <div class="border-l-4 p-4 ${alert.type === 'critical' ? 'alert-critical' : 'alert-warning'}">
                    <div class="flex">
                        <div class="flex-shrink-0">
                            <i class="fas ${alert.type === 'critical' ? 'fa-exclamation-circle' : 'fa-exclamation-triangle'}"></i>
                        </div>
                        <div class="ml-3">
                            <p class="text-sm">${alert.message}</p>
                        </div>
                    </div>
                </div>
            `).join('');
        } else {
            alertsSection.classList.add('hidden');
        }
    }

    updateInventoryGrid() {
        const grid = document.getElementById('inventoryGrid');
        const emptyState = document.getElementById('emptyState');
        const loadingSpinner = document.getElementById('loadingSpinner');

        loadingSpinner.classList.add('hidden');

        if (this.filteredInventory.length === 0) {
            grid.classList.add('hidden');
            emptyState.classList.remove('hidden');
            return;
        }

        emptyState.classList.add('hidden');
        grid.classList.remove('hidden');

        grid.innerHTML = this.filteredInventory.map(item => {
            const isLowStock = item.quantity <= item.minimumStock;
            const daysUntilExpiry = this.getDaysUntilExpiry(item.expirationDate);
            const isExpiringSoon = daysUntilExpiry <= 7;
            const totalValue = item.quantity * item.costPerUnit;

            return `
                <div class="bg-white border border-gray-200 rounded-lg p-6 card-hover transition-all duration-200">
                    <div class="flex justify-between items-start mb-4">
                        <h3 class="text-lg font-semibold text-gray-900">${item.name}</h3>
                        <div class="flex flex-col space-y-1">
                            ${isLowStock ? '<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">Low Stock</span>' : ''}
                            ${isExpiringSoon ? '<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">Expiring Soon</span>' : ''}
                        </div>
                    </div>
                    
                    <div class="space-y-2 text-sm text-gray-600">
                        <div class="flex justify-between">
                            <span>Category:</span>
                            <span class="font-medium capitalize">${item.category.replace('_', ' ')}</span>
                        </div>
                        <div class="flex justify-between">
                            <span>Quantity:</span>
                            <span class="font-medium">${item.quantity} ${item.unit}</span>
                        </div>
                        <div class="flex justify-between">
                            <span>Expires:</span>
                            <span class="font-medium">${new Date(item.expirationDate).toLocaleDateString()}</span>
                        </div>
                        <div class="flex justify-between">
                            <span>Supplier:</span>
                            <span class="font-medium">${item.supplier}</span>
                        </div>
                        <div class="flex justify-between">
                            <span>Total Value:</span>
                            <span class="font-medium text-green-600">$${totalValue.toFixed(2)}</span>
                        </div>
                    </div>
                    
                    <div class="mt-4 flex space-x-2">
                        <button onclick="inventoryDemo.adjustQuantity('${item.id}', -1)" class="flex-1 bg-red-50 text-red-600 px-3 py-2 rounded-md text-sm hover:bg-red-100 transition-colors">
                            <i class="fas fa-minus mr-1"></i>Remove
                        </button>
                        <button onclick="inventoryDemo.adjustQuantity('${item.id}', 1)" class="flex-1 bg-green-50 text-green-600 px-3 py-2 rounded-md text-sm hover:bg-green-100 transition-colors">
                            <i class="fas fa-plus mr-1"></i>Add
                        </button>
                    </div>
                </div>
            `;
        }).join('');
    }

    adjustQuantity(itemId, change) {
        const item = this.inventory.find(i => i.id === itemId);
        if (item) {
            item.quantity = Math.max(0, item.quantity + change);
            this.applyFilters();
            this.updateUI();
            this.showNotification(`${item.name} quantity ${change > 0 ? 'increased' : 'decreased'} to ${item.quantity} ${item.unit}`);
        }
    }

    showAddItemModal() {
        document.getElementById('addItemModal').classList.remove('hidden');
        // Set default expiration date to 7 days from now
        document.getElementById('itemExpiration').value = this.getDateString(7);
    }

    hideAddItemModal() {
        document.getElementById('addItemModal').classList.add('hidden');
        document.getElementById('addItemForm').reset();
    }

    addNewItem() {
        const formData = {
            id: Date.now().toString(),
            name: document.getElementById('itemName').value,
            category: document.getElementById('itemCategory').value,
            quantity: parseFloat(document.getElementById('itemQuantity').value),
            unit: document.getElementById('itemUnit').value,
            costPerUnit: Math.random() * 10 + 1, // Random cost for demo
            supplier: 'Demo Supplier',
            expirationDate: document.getElementById('itemExpiration').value,
            minimumStock: Math.floor(Math.random() * 10) + 5 // Random minimum stock
        };

        this.inventory.push(formData);
        this.applyFilters();
        this.updateUI();
        this.hideAddItemModal();
        this.showNotification(`${formData.name} added to inventory`);
    }
}

// Initialize the demo when the page loads
document.addEventListener('DOMContentLoaded', () => {
    window.inventoryDemo = new InventoryDemo();
});