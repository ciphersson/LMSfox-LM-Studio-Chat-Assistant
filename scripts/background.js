// Background script for LM Studio Chat Assistant - Full Browser Control
console.log('LM Studio Chat Assistant background script loaded with full browser control');

// Core extension functionality - removed non-existent imports

// Enhanced browser control state
const browserState = {
    activeTabs: new Map(),
    interactions: [],
    automationTasks: [],
    monitoredSites: []
};

// Core extension state
let extensionState = { initialized: false };

// Context menu setup with enhanced options
browser.runtime.onInstalled.addListener(() => {
    browser.contextMenus.create({
        id: 'askLMStudio',
        title: 'Ask LM Studio about "%s"',
        contexts: ['selection']
    });
    
    browser.contextMenus.create({
        id: 'askLMStudioPage',
        title: 'Ask LM Studio about this page',
        contexts: ['page']
    });
    
    browser.contextMenus.create({
        id: 'automateTask',
        title: 'Automate this task with LM Studio',
        contexts: ['page']
    });
    
    browser.contextMenus.create({
        id: 'extractData',
        title: 'Extract page data for LM Studio',
        contexts: ['page']
    });
    
    browser.contextMenus.create({
        id: 'highlightPage',
        title: 'Smart highlight important sections',
        contexts: ['page']
    });
    
    browser.contextMenus.create({
        id: 'clearHighlights',
        title: 'Clear all highlights',
        contexts: ['page']
    });
    
    browser.contextMenus.create({
        id: 'monitorSite',
        title: 'Monitor this site with LM Studio',
        contexts: ['page']
    });
});

// Enhanced context menu handler
browser.contextMenus.onClicked.addListener((info, tab) => {
    switch(info.menuItemId) {
        case 'askLMStudio':
            const query = `Explain this: "${info.selectionText}"`;
            
            // Highlight the selected text on the current page
            browser.tabs.sendMessage(tab.id, {
                action: 'highlightSelection'
            });
            
            // Open chat.html in new tab with the query
            const chatUrl = browser.runtime.getURL('chat.html');
            browser.tabs.create({ url: chatUrl }).then((newTab) => {
                // Store the query for the new tab to pick up
                browser.storage.local.set({ 
                    pendingQuery: query,
                    targetTabId: newTab.id,
                    autoSend: true
                });
            });
            break;
            
        case 'askLMStudioPage':
            browser.tabs.sendMessage(tab.id, { action: 'getPageContent' }, (response) => {
                if (response) {
                    const query = `Analyze this webpage: ${response.title}\nURL: ${response.url}\nContent: ${response.content}`;
                    browser.storage.local.set({ pendingQuery: query });
                    browser.browserAction.openPopup();
                }
            });
            break;
            
        case 'automateTask':
            browser.tabs.sendMessage(tab.id, { action: 'extractData' });
            browser.storage.local.set({ 
                pendingQuery: `Help me automate tasks on this page: ${tab.url}` 
            });
            browser.browserAction.openPopup();
            break;
            
        case 'extractData':
            browser.tabs.sendMessage(tab.id, { action: 'extractData' });
            break;
            
        case 'highlightPage':
            browser.tabs.sendMessage(tab.id, { action: 'highlightPage' });
            break;
            
        case 'clearHighlights':
            browser.tabs.sendMessage(tab.id, { action: 'clearHighlights' });
            break;
            
        case 'monitorSite':
            browserState.monitoredSites.push({
                url: tab.url,
                title: tab.title,
                timestamp: Date.now()
            });
            browser.storage.local.set({ 
                pendingQuery: `I want to monitor changes on this site: ${tab.url}` 
            });
            browser.browserAction.openPopup();
            break;
    }
});

// Enhanced message handler with full browser control
browser.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log('Background received message:', request);
    
    switch(request.action) {
        case 'textSelected':
            browser.storage.local.set({ lastSelectedText: request.text });
            break;
            
        case 'pageDataExtracted':
            console.log('Page data extracted:', request.data);
            // Send to LM Studio for analysis
            browser.storage.local.set({ 
                extractedPageData: request.data,
                pendingQuery: `Analyze this extracted page data: ${JSON.stringify(request.data, null, 2)}` 
            });
            break;
            
        // Core extension message handlers
        case 'GET_EXTENSION_STATUS':
            sendResponse({ success: true, status: extensionState });
            break;





            
        case 'navigation':
            console.log('Navigation detected from:', request.from);
            break;
            
        case 'pageChanged':
            console.log('Page changed:', request.mutations, 'mutations on', request.url);
            break;
            
        case 'executeOnTab':
            // Execute script on specific tab
            browser.tabs.sendMessage(request.tabId, {
                action: 'executeScript',
                script: request.script
            }, sendResponse);
            return true;
            
        case 'modifyTabContent':
            // Modify content on specific tab
            browser.tabs.sendMessage(request.tabId, {
                action: 'modifyPage',
                selector: request.selector,
                content: request.content
            }, sendResponse);
            return true;
            
        case 'automateTab':
            // Automate actions on tab
            browser.tabs.sendMessage(request.tabId, {
                action: 'clickElement',
                selector: request.selector
            }, sendResponse);
            return true;
            
        case 'fillTabForm':
            // Fill form on tab
            browser.tabs.sendMessage(request.tabId, {
                action: 'fillForm',
                data: request.data
            }, sendResponse);
            return true;
            
        case 'navigateTab':
            // Navigate tab to URL
            browser.tabs.update(request.tabId, { url: request.url });
            break;
            
        case 'getBrowserState':
            sendResponse({
                activeTabs: Array.from(browserState.activeTabs.entries()),
                interactions: browserState.interactions.slice(-50), // Last 50 interactions
                monitoredSites: browserState.monitoredSites
            });
            break;
    }
    
    return true;
});

// Tab monitoring
browser.tabs.onActivated.addListener((activeInfo) => {
    browser.tabs.get(activeInfo.tabId, (tab) => {
        browserState.activeTabs.set(activeInfo.tabId, {
            url: tab.url,
            title: tab.title,
            timestamp: Date.now()
        });
    });
});

browser.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status === 'complete') {
        browserState.activeTabs.set(tabId, {
            url: tab.url,
            title: tab.title,
            timestamp: Date.now()
        });
    }
});

browser.tabs.onRemoved.addListener((tabId) => {
    browserState.activeTabs.delete(tabId);
});

// Web request monitoring
browser.webRequest.onBeforeRequest.addListener(
    (details) => {
        console.log('Web request:', details.url);
        // Log all web requests for AI analysis
        browserState.interactions.push({
            type: 'webRequest',
            url: details.url,
            method: details.method,
            timestamp: Date.now(),
            tabId: details.tabId
        });
    },
    { urls: ["<all_urls>"] },
    ["requestBody"]
);

// Cookie monitoring
browser.cookies.onChanged.addListener((changeInfo) => {
    console.log('Cookie changed:', changeInfo);
});

// Download monitoring
browser.downloads.onCreated.addListener((downloadItem) => {
    console.log('Download started:', downloadItem.filename);
    browserState.interactions.push({
        type: 'download',
        filename: downloadItem.filename,
        url: downloadItem.url,
        timestamp: Date.now()
    });
});

// Bookmark monitoring
browser.bookmarks.onCreated.addListener((id, bookmark) => {
    console.log('Bookmark created:', bookmark.title);
});

// History monitoring
browser.history.onVisited.addListener((historyItem) => {
    console.log('Page visited:', historyItem.url);
});

// Initialize core extension on startup
browser.runtime.onStartup.addListener(() => {
    extensionState.initialized = true;
    console.log('LM Studio extension started');
});

// Initialize on install as well
browser.runtime.onInstalled.addListener(() => {
    console.log('Extension installed/updated');
    // Basic initialization without importing non-existent modules
});

console.log('LM Studio Background Script initialized with full browser control');
