// LM Studio Chat Assistant - Popup Interface
class LMStudioChat {
    constructor() {
        this.apiUrl = 'http://localhost:1234/v1';
        this.isConnected = false;
        this.currentModel = null;
        this.chatHistory = [];
        this.searchEnabled = false;
        
        this.elements = {
            messagesContainer: document.getElementById('chat-messages'),
            messageInput: document.getElementById('message-input'),
            sendBtn: document.getElementById('send-btn'),
            clearBtn: document.getElementById('clear-btn'),
            statusIndicator: document.getElementById('status-indicator'),
            statusText: document.getElementById('status-text'),
            modelName: document.getElementById('model-name'),
            searchToggle: document.getElementById('search-toggle'),
            expandBtn: document.getElementById('expand-btn'),
            settingsBtn: document.getElementById('settings-btn')
        };
        
        this.init();
    }
    
    async init() {
        this.setupEventListeners();
        await this.loadSettings();
        await this.loadChatHistory();
        await this.checkConnection();
        this.addWelcomeMessage();
        
        // Check for pending query from context menu
        const result = await browser.storage.local.get(['pendingQuery']);
        if (result.pendingQuery) {
            this.elements.messageInput.value = result.pendingQuery;
            browser.storage.local.remove(['pendingQuery']);
            this.elements.messageInput.focus();
        }
    }
    
    setupEventListeners() {
        this.elements.sendBtn.addEventListener('click', () => this.sendMessage());
        this.elements.messageInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage();
            }
        });
        this.elements.messageInput.addEventListener('input', () => this.autoResizeTextarea());
        this.elements.clearBtn.addEventListener('click', () => this.clearChat());
        this.elements.searchToggle.addEventListener('click', () => this.toggleSearch());
        this.elements.expandBtn.addEventListener('click', () => this.openFullInterface());
        this.elements.settingsBtn.addEventListener('click', () => this.openSettings());
    }
    
    addWelcomeMessage() {
        const welcomeText = this.isConnected ? 
            `🤖 Connected to LM Studio! ${this.currentModel ? `Using: ${this.currentModel}` : 'No model loaded'}` :
            '❌ Not connected to LM Studio. Please start LM Studio and load a model.';
        this.addMessage(welcomeText, 'system');
    }
    
    async checkConnection() {
        try {
            const response = await fetch(`${this.apiUrl}/models`);
            if (response.ok) {
                const data = await response.json();
                this.isConnected = true;
                this.updateModelList(data.data || []);
                this.updateStatus('connected');
            } else {
                throw new Error('Connection failed');
            }
        } catch (error) {
            this.isConnected = false;
            this.updateStatus('disconnected');
            console.error('Connection error:', error);
        }
    }
    
    updateModelList(models) {
        this.elements.modelSelect.innerHTML = '<option value="">Select Model</option>';
        models.forEach(model => {
            const option = document.createElement('option');
            option.value = model.id;
            option.textContent = model.id;
            this.elements.modelSelect.appendChild(option);
        });
        
        if (models.length > 0 && !this.currentModel) {
            this.currentModel = models[0].id;
            this.elements.modelSelect.value = this.currentModel;
        }
    }
    
    updateStatus(status) {
        this.elements.statusIndicator.className = `status ${status}`;
        this.elements.statusIndicator.textContent = status === 'connected' ? '🟢 Connected' : '🔴 Disconnected';
    }
    
    toggleSearch() {
        this.searchEnabled = !this.searchEnabled;
        this.elements.searchToggle.classList.toggle('active', this.searchEnabled);
        this.elements.searchToggle.title = this.searchEnabled ? 'Disable internet search' : 'Enable internet search';
        browser.storage.local.set({ searchEnabled: this.searchEnabled });
    }
    
    autoResizeTextarea() {
        const textarea = this.elements.messageInput;
        textarea.style.height = 'auto';
        textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px';
    }
    
    async sendMessage() {
        const message = this.elements.messageInput.value.trim();
        if (!message || !this.isConnected) return;
        
        // Clear input and add user message
        this.elements.messageInput.value = '';
        this.autoResizeTextarea();
        this.addMessage(message, 'user');
        
        // Disable send button
        this.elements.sendBtn.disabled = true;
        
        try {
            let finalMessage = message;
            let searchResults = [];
            
            // Intelligent search detection - automatically search for certain query types
            const shouldAutoSearch = this.shouldAutoSearch(message);
            const searchEnabled = this.searchEnabled || shouldAutoSearch;
            
            // Search the internet if enabled or auto-detected
            if (searchEnabled) {
                // Update UI to show auto-search status
                if (shouldAutoSearch && !this.searchEnabled) {
                    this.elements.searchToggle.classList.add('auto-search');
                    this.elements.searchToggle.title = 'Auto-search activated for this query';
                }
                
                this.addLoadingMessage('🔍 Searching the internet for current information...');
                try {
                    searchResults = await this.searchInternet(message);
                    console.log('Search results:', searchResults); // Debug log
                } catch (searchError) {
                    console.error('Search failed:', searchError);
                    this.addMessage(`⚠️ Search failed: ${searchError.message}. Using model knowledge only.`, 'system');
                    searchResults = []; // Ensure empty array
                }
                this.removeLoadingMessage();
                
                if (searchResults.length > 0) {
                    this.addSearchResults(searchResults);
                    finalMessage = this.enhanceMessageWithSearch(message, searchResults);
                } else if (shouldAutoSearch) {
                    this.addMessage('No current information found, using model knowledge only.', 'system');
                }
                
                // Reset auto-search visual indicator after a delay
                if (shouldAutoSearch && !this.searchEnabled) {
                    setTimeout(() => {
                        this.elements.searchToggle.classList.remove('auto-search');
                        this.elements.searchToggle.title = 'Enable internet search';
                    }, 3000);
                }
            }
            
            // Add loading message for AI response
            this.addLoadingMessage('🤖 Processing with ' + (searchResults.length > 0 ? 'internet-enhanced' : 'local') + ' knowledge...');
            
            // Send to LM Studio with enhanced context
            const response = await this.callLMStudio(finalMessage);
            this.removeLoadingMessage();
            this.addMessage(response, 'assistant');
            
        } catch (error) {
            this.removeLoadingMessage();
            this.addMessage(`Error: ${error.message}`, 'system');
        } finally {
            this.elements.sendBtn.disabled = false;
            this.elements.messageInput.focus();
        }
    }
    
    shouldAutoSearch(message) {
        const searchTriggers = [
            // Current events and news
            /\b(latest|recent|current|today|this week|this month|2024|2025)\b/i,
            /\b(news|breaking|update|announcement)\b/i,
            
            // Factual queries that might need current data
            /\b(price|cost|stock|market|weather|temperature)\b/i,
            /\b(when did|when was|what happened|who won|results)\b/i,
            
            // Technology and software versions
            /\b(version|release|update|download|install)\b/i,
            /\b(github|npm|python|node|javascript|react|vue)\b/i,
            
            // Questions that likely need current info
            /^(what is|what are|who is|where is|how much|how many)/i,
            /\b(compare|vs|versus|difference between)\b/i,
            
            // Specific domains that change frequently
            /\b(cryptocurrency|bitcoin|ethereum|AI|artificial intelligence)\b/i,
            /\b(covid|pandemic|vaccine|health|medicine)\b/i
        ];
        
        return searchTriggers.some(pattern => pattern.test(message));
    }
    
    async searchInternet(query) {
        const results = [];
        
        try {
            console.log('🔍 Starting internet search for:', query);
            
            // Try Wikipedia first (more reliable API)
            const wikiResults = await this.searchWikipedia(query);
            if (wikiResults.length > 0) {
                results.push(...wikiResults);
                console.log('✅ Wikipedia search successful:', wikiResults.length, 'results');
            }
            
            // Try DuckDuckGo as secondary source
            try {
                const ddgResults = await this.searchDuckDuckGo(query);
                if (ddgResults.length > 0) {
                    results.push(...ddgResults);
                    console.log('✅ DuckDuckGo search successful:', ddgResults.length, 'results');
                }
            } catch (ddgError) {
                console.warn('⚠️ DuckDuckGo search failed:', ddgError);
            }
            
            console.log('📊 Total search results:', results.length);
            return results.slice(0, 5); // Limit to 5 results
        } catch (error) {
            console.error('❌ Search error:', error);
            throw new Error(`Search failed: ${error.message}`);
        }
    }
    
    async searchWikipedia(query) {
        try {
            console.log('Attempting Wikipedia search for:', query);
            // Use Wikipedia search API with CORS support
            const searchApiUrl = `https://en.wikipedia.org/w/api.php?action=opensearch&search=${encodeURIComponent(query)}&limit=3&format=json&origin=*`;
            console.log('Wikipedia URL:', searchApiUrl);
            
            const searchResponse = await fetch(searchApiUrl);
            console.log('Wikipedia response status:', searchResponse.status);
            
            if (!searchResponse.ok) {
                throw new Error(`Wikipedia API error: ${searchResponse.status}`);
            }
            
            const searchData = await searchResponse.json();
            console.log('Wikipedia data:', searchData);
            
            const results = [];
            
            if (searchData[1] && searchData[2] && searchData[3]) {
                for (let i = 0; i < Math.min(3, searchData[1].length); i++) {
                    if (searchData[1][i] && searchData[2][i]) {
                        results.push({
                            title: `Wikipedia: ${searchData[1][i]}`,
                            snippet: searchData[2][i] || 'Wikipedia article',
                            url: searchData[3][i] || '',
                            source: 'Wikipedia'
                        });
                    }
                }
            }
            
            console.log('Wikipedia results:', results);
            return results;
        } catch (error) {
            console.error('Wikipedia search error:', error);
            return [];
        }
    }
    
    async searchDuckDuckGo(query) {
        try {
            console.log('Attempting DuckDuckGo search for:', query);
            // DuckDuckGo Instant Answer API
            const url = `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1&skip_disambig=1`;
            console.log('DuckDuckGo URL:', url);
            
            const response = await fetch(url);
            console.log('DuckDuckGo response status:', response.status);
            
            if (!response.ok) {
                throw new Error(`DuckDuckGo API error: ${response.status}`);
            }
            
            const data = await response.json();
            console.log('DuckDuckGo data:', data);
            
            const results = [];
            
            // Add instant answer if available
            if (data.AbstractText) {
                results.push({
                    title: data.AbstractSource || 'DuckDuckGo',
                    snippet: data.AbstractText,
                    url: data.AbstractURL || '',
                    source: 'DuckDuckGo'
                });
            }
            
            // Add related topics
            if (data.RelatedTopics && data.RelatedTopics.length > 0) {
                data.RelatedTopics.slice(0, 2).forEach(topic => {
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
            
            console.log('DuckDuckGo results:', results);
            return results;
        } catch (error) {
            console.error('DuckDuckGo search error:', error);
            return [];
        }
    }
    
    enhanceMessageWithSearch(originalMessage, searchResults) {
        let context = "INTERNET SEARCH RESULTS (Current Information):\n";
        context += "=".repeat(50) + "\n\n";
        
        searchResults.forEach((result, index) => {
            context += `${index + 1}. SOURCE: ${result.title}\n`;
            context += `   CONTENT: ${result.snippet}\n`;
            if (result.url) context += `   URL: ${result.url}\n`;
            context += "\n";
        });
        
        context += "=".repeat(50) + "\n\n";
        context += "INSTRUCTIONS: You are an AI assistant with access to current internet information above. ";
        context += "Use this current data to enhance your response. If the search results are relevant, ";
        context += "incorporate them naturally into your answer. If they're not relevant, rely on your training data. ";
        context += "Always be helpful and accurate.\n\n";
        context += `USER QUESTION: ${originalMessage}`;
        
        return context;
    }
    
    async callLMStudio(message) {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout
            
            const response = await fetch(`${this.apiUrl}/chat/completions`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    model: this.currentModel || 'local-model',
                    messages: [
                        ...this.chatHistory,
                        { role: 'user', content: message }
                    ],
                    temperature: 0.7,
                    max_tokens: 1000,
                    stream: false
                }),
                signal: controller.signal
            });
            
            clearTimeout(timeoutId);
            
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`LM Studio API error (${response.status}): ${errorText || 'Unknown error'}`);
            }
            
            const data = await response.json();
            
            if (!data.choices || !data.choices[0] || !data.choices[0].message) {
                throw new Error('Invalid response format from LM Studio');
            }
            
            const assistantMessage = data.choices[0].message.content;
            
            // Update chat history
            this.chatHistory.push(
                { role: 'user', content: message },
                { role: 'assistant', content: assistantMessage }
            );
            
            // Keep history manageable
            if (this.chatHistory.length > 20) {
                this.chatHistory = this.chatHistory.slice(-20);
            }
            
            this.saveChatHistory();
            return assistantMessage;
            
        } catch (error) {
            if (error.name === 'AbortError') {
                throw new Error('Request timed out. Please try again.');
            }
            throw error;
        }
    }
    
    addMessage(content, type) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${type}`;
        messageDiv.textContent = content;
        
        this.elements.messagesContainer.appendChild(messageDiv);
        this.scrollToBottom();
    }
    
    addLoadingMessage(text) {
        const messageDiv = document.createElement('div');
        messageDiv.className = 'message loading';
        messageDiv.innerHTML = `
            <span>${text}</span>
            <div class="typing-indicator">
                <div class="typing-dot"></div>
                <div class="typing-dot"></div>
                <div class="typing-dot"></div>
            </div>
        `;
        messageDiv.id = 'loading-message';
        
        this.elements.messagesContainer.appendChild(messageDiv);
        this.scrollToBottom();
    }
    
    removeLoadingMessage() {
        const loadingMessage = document.getElementById('loading-message');
        if (loadingMessage) {
            loadingMessage.remove();
        }
    }
    
    addSearchResults(results) {
        const resultsDiv = document.createElement('div');
        resultsDiv.className = 'message system';
        
        let html = '<strong>🔍 Search Results:</strong><br>';
        results.forEach((result, index) => {
            html += `
                <div class="search-result">
                    <div class="search-result-title">${result.title}</div>
                    <div class="search-result-snippet">${result.snippet}</div>
                </div>
            `;
        });
        
        resultsDiv.innerHTML = html;
        this.elements.messagesContainer.appendChild(resultsDiv);
        this.scrollToBottom();
    }
    
    scrollToBottom() {
        this.elements.messagesContainer.scrollTop = this.elements.messagesContainer.scrollHeight;
    }
    
    clearChat() {
        // Remove all messages except welcome
        const messages = this.elements.messagesContainer.querySelectorAll('.message');
        messages.forEach(msg => msg.remove());
        
        // Clear history
        this.chatHistory = [];
        this.saveChatHistory();
    }
    
    async loadSettings() {
        try {
            const result = await browser.storage.local.get(['apiUrl', 'searchEnabled']);
            if (result.apiUrl) {
                this.apiUrl = result.apiUrl;
            }
            if (result.searchEnabled !== undefined) {
                this.searchEnabled = result.searchEnabled;
                this.elements.searchToggle.classList.toggle('active', this.searchEnabled);
            }
        } catch (error) {
            console.error('Failed to load settings:', error);
        }
    }

    async loadChatHistory() {
        try {
            const result = await browser.storage.local.get(['chatHistory']);
            if (result.chatHistory) {
                this.chatHistory = result.chatHistory;
            }
        } catch (error) {
            console.error('Failed to load chat history:', error);
        }
    }
    
    async saveChatHistory() {
        try {
            await browser.storage.local.set({ chatHistory: this.chatHistory });
        } catch (error) {
            console.error('Failed to save chat history:', error);
        }
    }
    
    openFullInterface() {
        browser.tabs.create({ url: browser.runtime.getURL('chat.html') });
    }
    
    openSettings() {
        // Create a simple settings modal
        const modal = document.createElement('div');
        modal.className = 'settings-modal';
        modal.innerHTML = `
            <div class="settings-content">
                <div class="settings-header">
                    <h3>Settings</h3>
                    <button class="close-btn" onclick="this.closest('.settings-modal').remove()">×</button>
                </div>
                <div class="settings-body">
                    <div class="setting-item">
                        <label>
                            <input type="text" id="api-url" value="${this.apiUrl}" placeholder="LM Studio API URL">
                            <span>API URL</span>
                        </label>
                    </div>
                    <div class="setting-item">
                        <label>
                            <input type="checkbox" id="auto-search" ${this.searchEnabled ? 'checked' : ''}>
                            <span>Enable internet search by default</span>
                        </label>
                    </div>
                    <div class="setting-item">
                        <button id="test-connection" class="test-btn">Test Connection</button>
                        <span id="connection-result"></span>
                    </div>
                </div>
                <div class="settings-footer">
                    <button onclick="this.closest('.settings-modal').remove()">Cancel</button>
                    <button id="save-settings" class="primary-btn">Save</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Add event listeners for settings
        modal.querySelector('#save-settings').addEventListener('click', () => {
            const newApiUrl = modal.querySelector('#api-url').value;
            const autoSearch = modal.querySelector('#auto-search').checked;
            
            this.apiUrl = newApiUrl;
            this.searchEnabled = autoSearch;
            
            browser.storage.local.set({ 
                apiUrl: this.apiUrl,
                searchEnabled: this.searchEnabled 
            });
            
            this.elements.searchToggle.classList.toggle('active', this.searchEnabled);
            modal.remove();
            this.checkConnection();
        });
        
        modal.querySelector('#test-connection').addEventListener('click', async () => {
            const testUrl = modal.querySelector('#api-url').value;
            const resultSpan = modal.querySelector('#connection-result');
            
            try {
                const response = await fetch(`${testUrl}/models`);
                if (response.ok) {
                    resultSpan.textContent = '✅ Connected';
                    resultSpan.style.color = 'green';
                } else {
                    resultSpan.textContent = '❌ Failed';
                    resultSpan.style.color = 'red';
                }
            } catch (error) {
                resultSpan.textContent = '❌ Error';
                resultSpan.style.color = 'red';
            }
        });
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new LMStudioChat();
});
