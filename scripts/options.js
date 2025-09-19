class SettingsManager {
    constructor() {
        this.defaultSettings = {
            apiUrl: 'http://localhost:1234/v1',
            connectionTimeout: 10,
            searchEnabled: false,
            searchResultsCount: 5,
            searchWikipedia: true,
            defaultTemperature: 0.7,
            maxTokens: 2000,
            saveHistory: true,
            historyLimit: 25,
            theme: 'dark',
            floatingButton: true,
            contextMenu: true,
            quickActions: true,
            analyticsEnabled: false
        };
        
        this.initializeElements();
        this.setupEventListeners();
        this.loadSettings();
        this.testConnection();
    }
    
    initializeElements() {
        this.elements = {
            apiUrl: document.getElementById('api-url'),
            connectionTimeout: document.getElementById('connection-timeout'),
            connectionIndicator: document.getElementById('connection-indicator'),
            connectionText: document.getElementById('connection-text'),
            testConnection: document.getElementById('test-connection'),
            searchEnabled: document.getElementById('search-enabled'),
            searchResultsCount: document.getElementById('search-results-count'),
            searchWikipedia: document.getElementById('search-wikipedia'),
            defaultTemperature: document.getElementById('default-temperature'),
            temperatureValue: document.getElementById('temperature-value'),
            maxTokens: document.getElementById('max-tokens'),
            saveHistory: document.getElementById('save-history'),
            historyLimit: document.getElementById('history-limit'),
            theme: document.getElementById('theme'),
            floatingButton: document.getElementById('floating-button'),
            contextMenu: document.getElementById('context-menu'),
            quickActions: document.getElementById('quick-actions'),
            analyticsEnabled: document.getElementById('analytics-enabled'),
            clearData: document.getElementById('clear-data'),
            exportData: document.getElementById('export-data'),
            importData: document.getElementById('import-data'),
            importFile: document.getElementById('import-file'),
            resetDefaults: document.getElementById('reset-defaults'),
            saveSettings: document.getElementById('save-settings'),
            notification: document.getElementById('notification')
        };
    }
    
    setupEventListeners() {
        // Connection testing
        this.elements.testConnection.addEventListener('click', () => {
            this.testConnection();
        });
        
        // Temperature slider
        this.elements.defaultTemperature.addEventListener('input', (e) => {
            this.elements.temperatureValue.textContent = e.target.value;
        });
        
        // Data management
        this.elements.clearData.addEventListener('click', () => {
            this.clearAllData();
        });
        
        this.elements.exportData.addEventListener('click', () => {
            this.exportData();
        });
        
        this.elements.importData.addEventListener('click', () => {
            this.elements.importFile.click();
        });
        
        this.elements.importFile.addEventListener('change', (e) => {
            this.importData(e.target.files[0]);
        });
        
        // Settings actions
        this.elements.resetDefaults.addEventListener('click', () => {
            this.resetToDefaults();
        });
        
        this.elements.saveSettings.addEventListener('click', () => {
            this.saveSettings();
        });
        
        // Auto-save on change
        Object.values(this.elements).forEach(element => {
            if (element && (element.type === 'checkbox' || element.type === 'range' || element.tagName === 'SELECT')) {
                element.addEventListener('change', () => {
                    this.saveSettings(false); // Silent save
                });
            }
        });
    }
    
    async testConnection() {
        const apiUrl = this.elements.apiUrl.value;
        this.elements.connectionText.textContent = 'Testing connection...';
        this.elements.connectionIndicator.className = 'status-disconnected';
        
        try {
            const response = await fetch(`${apiUrl}/models`, {
                method: 'GET',
                timeout: this.elements.connectionTimeout.value * 1000
            });
            
            if (response.ok) {
                const data = await response.json();
                this.elements.connectionText.textContent = `Connected! Found ${data.data?.length || 0} models`;
                this.elements.connectionIndicator.className = 'status-connected';
            } else {
                throw new Error(`HTTP ${response.status}`);
            }
        } catch (error) {
            this.elements.connectionText.textContent = `Connection failed: ${error.message}`;
            this.elements.connectionIndicator.className = 'status-disconnected';
        }
    }
    
    async loadSettings() {
        try {
            const result = await browser.storage.local.get(Object.keys(this.defaultSettings));
            
            // Apply loaded settings or defaults
            Object.keys(this.defaultSettings).forEach(key => {
                const value = result[key] !== undefined ? result[key] : this.defaultSettings[key];
                this.setElementValue(key, value);
            });
            
            // Update temperature display
            this.elements.temperatureValue.textContent = this.elements.defaultTemperature.value;
            
        } catch (error) {
            console.error('Failed to load settings:', error);
            this.showNotification('Failed to load settings', 'error');
        }
    }
    
    async saveSettings(showNotification = true) {
        try {
            const settings = {};
            
            Object.keys(this.defaultSettings).forEach(key => {
                settings[key] = this.getElementValue(key);
            });
            
            await browser.storage.local.set(settings);
            
            if (showNotification) {
                this.showNotification('Settings saved successfully!', 'success');
            }
        } catch (error) {
            console.error('Failed to save settings:', error);
            this.showNotification('Failed to save settings', 'error');
        }
    }
    
    setElementValue(key, value) {
        const element = this.elements[this.camelToKebab(key)];
        if (!element) return;
        
        if (element.type === 'checkbox') {
            element.checked = value;
        } else if (element.type === 'range') {
            element.value = value;
        } else {
            element.value = value;
        }
    }
    
    getElementValue(key) {
        const element = this.elements[this.camelToKebab(key)];
        if (!element) return this.defaultSettings[key];
        
        if (element.type === 'checkbox') {
            return element.checked;
        } else if (element.type === 'number' || element.type === 'range') {
            return parseFloat(element.value);
        } else {
            return element.value;
        }
    }
    
    camelToKebab(str) {
        return str.replace(/([A-Z])/g, '-$1').toLowerCase();
    }
    
    async resetToDefaults() {
        if (confirm('Are you sure you want to reset all settings to defaults? This cannot be undone.')) {
            try {
                await browser.storage.local.clear();
                Object.keys(this.defaultSettings).forEach(key => {
                    this.setElementValue(key, this.defaultSettings[key]);
                });
                this.elements.temperatureValue.textContent = this.defaultSettings.defaultTemperature;
                this.showNotification('Settings reset to defaults', 'info');
            } catch (error) {
                console.error('Failed to reset settings:', error);
                this.showNotification('Failed to reset settings', 'error');
            }
        }
    }
    
    async clearAllData() {
        if (confirm('Are you sure you want to clear ALL data including chat history? This cannot be undone.')) {
            try {
                await browser.storage.local.clear();
                this.showNotification('All data cleared successfully', 'info');
            } catch (error) {
                console.error('Failed to clear data:', error);
                this.showNotification('Failed to clear data', 'error');
            }
        }
    }
    
    async exportData() {
        try {
            const allData = await browser.storage.local.get(null);
            const exportData = {
                version: '1.0.0',
                timestamp: new Date().toISOString(),
                data: allData
            };
            
            const blob = new Blob([JSON.stringify(exportData, null, 2)], { 
                type: 'application/json' 
            });
            const url = URL.createObjectURL(blob);
            
            const a = document.createElement('a');
            a.href = url;
            a.download = `lm-studio-extension-backup-${new Date().toISOString().split('T')[0]}.json`;
            a.click();
            
            URL.revokeObjectURL(url);
            this.showNotification('Data exported successfully', 'success');
        } catch (error) {
            console.error('Failed to export data:', error);
            this.showNotification('Failed to export data', 'error');
        }
    }
    
    async importData(file) {
        if (!file) return;
        
        try {
            const text = await file.text();
            const importData = JSON.parse(text);
            
            if (!importData.data || !importData.version) {
                throw new Error('Invalid backup file format');
            }
            
            if (confirm('This will overwrite all current data. Are you sure you want to continue?')) {
                await browser.storage.local.clear();
                await browser.storage.local.set(importData.data);
                
                // Reload settings
                await this.loadSettings();
                
                this.showNotification('Data imported successfully', 'success');
            }
        } catch (error) {
            console.error('Failed to import data:', error);
            this.showNotification('Failed to import data: ' + error.message, 'error');
        }
    }
    
    showNotification(message, type = 'info') {
        this.elements.notification.textContent = message;
        this.elements.notification.className = `notification ${type}`;
        this.elements.notification.classList.add('show');
        
        setTimeout(() => {
            this.elements.notification.classList.remove('show');
        }, 3000);
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new SettingsManager();
});
