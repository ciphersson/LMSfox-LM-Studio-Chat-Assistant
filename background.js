// Background script for LM Studio Firefox Extension

class BackgroundService {
    constructor() {
        this.setupContextMenus();
        this.setupMessageHandlers();
        this.setupTabListeners();
    }
    
    setupContextMenus() {
        // Create context menu for selected text
        browser.contextMenus.create({
            id: "ask-lm-studio",
            title: "Ask LM Studio about this",
            contexts: ["selection"]
        });
        
        browser.contextMenus.create({
            id: "summarize-page",
            title: "Summarize this page with LM Studio",
            contexts: ["page"]
        });
        
        browser.contextMenus.create({
            id: "explain-code",
            title: "Explain this code with LM Studio",
            contexts: ["selection"]
        });
    }
    
    setupMessageHandlers() {
        browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
            switch (message.type) {
                case 'GET_PAGE_CONTENT':
                    this.getPageContent(sender.tab.id).then(sendResponse);
                    return true; // Async response
                    
                case 'SEARCH_WEB':
                    this.searchWeb(message.query).then(sendResponse);
                    return true;
                    
                case 'CHECK_LM_STUDIO':
                    this.checkLMStudioConnection().then(sendResponse);
                    return true;
                    
                default:
                    sendResponse({ error: 'Unknown message type' });
            }
        });
        
        // Handle context menu clicks
        browser.contextMenus.onClicked.addListener((info, tab) => {
            this.handleContextMenuClick(info, tab);
        });
    }
    
    setupTabListeners() {
        // Listen for tab updates to inject content script if needed
        browser.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
            if (changeInfo.status === 'complete' && tab.url && !tab.url.startsWith('moz-extension://')) {
                // Inject content script if not already present
                browser.tabs.executeScript(tabId, {
                    code: 'typeof window.lmStudioExtensionInjected === "undefined"'
                }).then(results => {
                    if (results[0]) {
                        browser.tabs.executeScript(tabId, { file: 'content.js' });
                    }
                }).catch(() => {
                    // Ignore errors for restricted pages
                });
            }
        });
    }
    
    async handleContextMenuClick(info, tab) {
        const selectedText = info.selectionText || '';
        
        switch (info.menuItemId) {
            case 'ask-lm-studio':
                await this.openChatWithQuery(`Please explain or answer questions about: "${selectedText}"`);
                break;
                
            case 'summarize-page':
                const pageContent = await this.getPageContent(tab.id);
                await this.openChatWithQuery(`Please summarize this webpage: ${pageContent.title}\n\n${pageContent.content}`);
                break;
                
            case 'explain-code':
                await this.openChatWithQuery(`Please explain this code:\n\n\`\`\`\n${selectedText}\n\`\`\``);
                break;
        }
    }
    
    async openChatWithQuery(query) {
        // Store the query for the popup to pick up
        await browser.storage.local.set({ pendingQuery: query });
        
        // Open the extension popup or new tab
        const windows = await browser.windows.getAll();
        if (windows.length > 0) {
            browser.browserAction.openPopup();
        } else {
            browser.tabs.create({ url: browser.runtime.getURL('chat.html') });
        }
    }
    
    async getPageContent(tabId) {
        try {
            const results = await browser.tabs.executeScript(tabId, {
                code: `
                    ({
                        title: document.title,
                        content: document.body.innerText.substring(0, 2000),
                        url: window.location.href
                    })
                `
            });
            return results[0];
        } catch (error) {
            return { title: 'Unknown', content: 'Could not access page content', url: '' };
        }
    }
    
    async searchWeb(query) {
        try {
            // Enhanced web search using multiple sources
            const searches = await Promise.allSettled([
                this.searchDuckDuckGo(query),
                this.searchWikipedia(query)
            ]);
            
            const results = [];
            searches.forEach(search => {
                if (search.status === 'fulfilled' && search.value) {
                    results.push(...search.value);
                }
            });
            
            return results.slice(0, 5); // Limit to 5 results
        } catch (error) {
            console.error('Web search error:', error);
            return [];
        }
    }
    
    async searchDuckDuckGo(query) {
        try {
            const response = await fetch(`https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1&skip_disambig=1`);
            const data = await response.json();
            
            const results = [];
            
            if (data.AbstractText) {
                results.push({
                    title: data.AbstractSource || 'DuckDuckGo',
                    snippet: data.AbstractText,
                    url: data.AbstractURL || '',
                    source: 'DuckDuckGo'
                });
            }
            
            if (data.RelatedTopics) {
                data.RelatedTopics.slice(0, 3).forEach(topic => {
                    if (topic.Text) {
                        results.push({
                            title: topic.FirstURL ? new URL(topic.FirstURL).hostname : 'Related',
                            snippet: topic.Text,
                            url: topic.FirstURL || '',
                            source: 'DuckDuckGo'
                        });
                    }
                });
            }
            
            return results;
        } catch (error) {
            console.error('DuckDuckGo search error:', error);
            return [];
        }
    }
    
    async searchWikipedia(query) {
        try {
            const searchResponse = await fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(query)}`);
            
            if (searchResponse.ok) {
                const data = await searchResponse.json();
                return [{
                    title: data.title,
                    snippet: data.extract,
                    url: data.content_urls?.desktop?.page || '',
                    source: 'Wikipedia'
                }];
            }
            return [];
        } catch (error) {
            console.error('Wikipedia search error:', error);
            return [];
        }
    }
    
    async checkLMStudioConnection() {
        try {
            const response = await fetch('http://localhost:1234/v1/models');
            return {
                connected: response.ok,
                models: response.ok ? await response.json() : null
            };
        } catch (error) {
            return { connected: false, error: error.message };
        }
    }
}

// Initialize background service
new BackgroundService();
