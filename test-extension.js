// Test script for LM Studio Firefox Extension
// Run this in Firefox console to test functionality

class ExtensionTester {
    constructor() {
        this.apiUrl = 'http://localhost:1234/v1';
        this.tests = [];
        this.results = [];
    }
    
    async runAllTests() {
        console.log('🧪 Starting LM Studio Extension Tests...\n');
        
        this.tests = [
            { name: 'LM Studio Connection', test: () => this.testLMStudioConnection() },
            { name: 'Search API', test: () => this.testSearchAPI() },
            { name: 'Storage API', test: () => this.testStorageAPI() },
            { name: 'Content Script Injection', test: () => this.testContentScript() },
            { name: 'Context Menu', test: () => this.testContextMenu() },
            { name: 'Extension Manifest', test: () => this.testManifest() }
        ];
        
        for (const test of this.tests) {
            try {
                console.log(`Testing: ${test.name}...`);
                const result = await test.test();
                this.results.push({ name: test.name, status: 'PASS', result });
                console.log(`✅ ${test.name}: PASS`);
            } catch (error) {
                this.results.push({ name: test.name, status: 'FAIL', error: error.message });
                console.log(`❌ ${test.name}: FAIL - ${error.message}`);
            }
        }
        
        this.printSummary();
    }
    
    async testLMStudioConnection() {
        const response = await fetch(`${this.apiUrl}/models`);
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        return {
            connected: true,
            models: data.data?.length || 0,
            endpoint: this.apiUrl
        };
    }
    
    async testSearchAPI() {
        const testQuery = 'test search';
        const response = await fetch(`https://api.duckduckgo.com/?q=${encodeURIComponent(testQuery)}&format=json&no_html=1&skip_disambig=1`);
        
        if (!response.ok) {
            throw new Error(`Search API failed: ${response.status}`);
        }
        
        const data = await response.json();
        return {
            searchWorking: true,
            hasResults: !!(data.AbstractText || data.RelatedTopics?.length)
        };
    }
    
    async testStorageAPI() {
        const testData = { test: 'extension-test', timestamp: Date.now() };
        
        // Test write
        await browser.storage.local.set(testData);
        
        // Test read
        const result = await browser.storage.local.get('test');
        
        if (result.test !== testData.test) {
            throw new Error('Storage read/write mismatch');
        }
        
        // Cleanup
        await browser.storage.local.remove('test');
        
        return { storageWorking: true };
    }
    
    async testContentScript() {
        try {
            const tabs = await browser.tabs.query({ active: true, currentWindow: true });
            if (tabs[0]) {
                const response = await browser.tabs.sendMessage(tabs[0].id, { type: 'GET_PAGE_INFO' });
                return { contentScriptWorking: true, pageInfo: response };
            }
        } catch (error) {
            throw new Error('Content script not responding');
        }
    }
    
    async testContextMenu() {
        try {
            const menus = await browser.contextMenus.removeAll();
            await browser.contextMenus.create({
                id: 'test-menu',
                title: 'Test Menu',
                contexts: ['selection']
            });
            await browser.contextMenus.remove('test-menu');
            return { contextMenuWorking: true };
        } catch (error) {
            throw new Error('Context menu API failed');
        }
    }
    
    async testManifest() {
        const manifest = browser.runtime.getManifest();
        
        const required = ['name', 'version', 'description', 'permissions'];
        for (const field of required) {
            if (!manifest[field]) {
                throw new Error(`Missing required field: ${field}`);
            }
        }
        
        return {
            manifestValid: true,
            name: manifest.name,
            version: manifest.version,
            permissions: manifest.permissions.length
        };
    }
    
    printSummary() {
        console.log('\n📊 Test Summary:');
        console.log('================');
        
        const passed = this.results.filter(r => r.status === 'PASS').length;
        const failed = this.results.filter(r => r.status === 'FAIL').length;
        
        console.log(`Total Tests: ${this.results.length}`);
        console.log(`Passed: ${passed}`);
        console.log(`Failed: ${failed}`);
        console.log(`Success Rate: ${Math.round((passed / this.results.length) * 100)}%\n`);
        
        if (failed > 0) {
            console.log('❌ Failed Tests:');
            this.results.filter(r => r.status === 'FAIL').forEach(test => {
                console.log(`  - ${test.name}: ${test.error}`);
            });
        }
        
        if (passed === this.results.length) {
            console.log('🎉 All tests passed! Extension is ready to use.');
        } else {
            console.log('⚠️ Some tests failed. Please check the issues above.');
        }
    }
}

// Auto-run tests if in extension context
if (typeof browser !== 'undefined') {
    new ExtensionTester().runAllTests();
} else {
    console.log('Run this script in Firefox extension context');
}
