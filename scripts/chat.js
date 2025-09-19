class LMStudioChatApp {
    constructor() {
        this.apiUrl = 'http://localhost:1234/v1';
        this.isConnected = false;
        this.searchEnabled = false;
        this.contextEnabled = false;
        this.autoSearchEnabled = false; // Default disabled for speed
        this.advancedMode = false;
        this.currentModel = null;
        this.chatHistory = [];
        this.chatSessions = [];
        this.currentSessionId = null;
        
        this.initializeElements();
        this.setupEventListeners();
        this.setupNavigationListeners();
        this.checkConnection();
        this.loadData();
        this.checkPendingQuery();
    }
    
    initializeElements() {
        this.elements = {
            messagesContainer: document.getElementById('chat-messages'),
            messageInput: document.getElementById('message-input'),
            sendBtn: document.getElementById('send-btn'),
            searchToggle: document.getElementById('search-toggle'),
            contextToggle: document.getElementById('context-toggle'),
            autoSearchToggle: document.getElementById('auto-search-toggle'),
            advancedModeToggle: document.getElementById('advanced-mode-toggle'),
            statusIndicator: document.getElementById('statusIndicator'),
            statusText: document.getElementById('statusText'),
            modelSelect: document.getElementById('model-select'),
            settingsBtn: document.getElementById('settings-btn'),
            exportBtn: document.getElementById('export-btn'),
            clearBtn: document.getElementById('clear-btn'),
            newChatBtn: document.getElementById('new-chat-btn'),
            refreshBtn: document.getElementById('refreshConnection'),
            chatSessions: document.getElementById('chat-sessions'),
            charCount: document.getElementById('char-count'),
            attachBtn: document.getElementById('attach-btn'),
            voiceBtn: document.getElementById('voice-btn'),
            fileModal: document.getElementById('file-modal'),
            fileInput: document.getElementById('file-input'),
            uploadArea: document.getElementById('upload-area'),
            pasteContent: document.getElementById('paste-content'),
            attachConfirm: document.getElementById('attach-confirm'),
            attachCancel: document.getElementById('attach-cancel')
        };
    }
    
    setupEventListeners() {
        // Input handling
        this.elements.messageInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage();
            }
        });
        
        this.elements.messageInput.addEventListener('input', () => {
            this.autoResizeTextarea();
            this.updateCharCount();
        });
        
        // Button events
        this.elements.sendBtn.addEventListener('click', () => this.sendMessage());
        this.elements.clearBtn.addEventListener('click', () => this.clearCurrentChat());
        this.elements.exportBtn.addEventListener('click', () => this.exportChat());
        this.elements.settingsBtn.addEventListener('click', () => this.openSettings());
        this.elements.newChatBtn.addEventListener('click', () => this.startNewChat());
        this.elements.refreshBtn.addEventListener('click', () => this.forceRefreshConnection());
        
        // Toggle events
        this.elements.searchToggle.addEventListener('change', (e) => {
            this.searchEnabled = e.target.checked;
            this.saveSettings();
        });
        
        this.elements.contextToggle.addEventListener('change', (e) => {
            this.contextEnabled = e.target.checked;
            this.saveSettings();
        });
        
        this.elements.autoSearchToggle.addEventListener('change', (e) => {
            this.autoSearchEnabled = e.target.checked;
            this.saveSettings();
        });
        
        this.elements.advancedModeToggle.addEventListener('change', (e) => {
            this.advancedMode = e.target.checked;
            this.saveSettings();
        });
        
        // File upload events
        this.elements.attachBtn.addEventListener('click', () => this.showFileModal());
        this.elements.fileInput.addEventListener('change', (e) => this.handleFileSelect(e));
        this.elements.attachConfirm.addEventListener('click', () => this.confirmAttachment());
        this.elements.attachCancel.addEventListener('click', () => this.hideFileModal());
        
        // Modal events
        this.elements.fileModal.addEventListener('click', (e) => {
            if (e.target === this.elements.fileModal) {
                this.hideFileModal();
            }
        });
        
        // Quick prompt events
        document.querySelectorAll('.prompt-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const prompt = e.target.dataset.prompt;
                this.elements.messageInput.value = prompt + ' ';
                this.elements.messageInput.focus();
                this.autoResizeTextarea();
                this.updateCharCount();
            });
        });
        window.addEventListener('click', (e) => {
            if (e.target === this.elements.fileModal) {
                this.elements.fileModal.style.display = 'none';
            }
        });
    }
    
    setupNavigationListeners() {
        // Navigation button events for agentic features
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const uiPage = e.target.dataset.ui || e.target.closest('.nav-btn').dataset.ui;
                if (uiPage) {
                    this.openAgenticUI(uiPage);
                }
            });
        });
    }
    
    openAgenticUI(uiPage) {
        try {
            const url = browser.runtime.getURL(uiPage);
            browser.tabs.create({ url: url });
        } catch (error) {
            console.error('Failed to open agentic UI:', error);
            // Fallback for environments where browser API might not be available
            window.open(uiPage, '_blank');
        }
    }
    
    setupDragAndDrop() {
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            this.elements.uploadArea.addEventListener(eventName, (e) => {
                e.preventDefault();
                e.stopPropagation();
            });
        });
        
        ['dragenter', 'dragover'].forEach(eventName => {
            this.elements.uploadArea.addEventListener(eventName, () => {
                this.elements.uploadArea.classList.add('dragover');
            });
        });
        
        ['dragleave', 'drop'].forEach(eventName => {
            this.elements.uploadArea.addEventListener(eventName, () => {
                this.elements.uploadArea.classList.remove('dragover');
            });
        });
        
        this.elements.uploadArea.addEventListener('drop', (e) => {
            const files = e.dataTransfer.files;
            this.handleFileSelect(files);
        });
    }
    
    async checkConnection() {
        try {
            console.log('🔍 Checking LM Studio connection at:', `${this.apiUrl}/models`);
            console.log('🔧 Current API URL:', this.apiUrl);
            
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
        
            const response = await fetch(`${this.apiUrl}/models`, {
                signal: controller.signal,
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            
            clearTimeout(timeoutId);
            
            console.log('📡 Response status:', response.status);
            console.log('📡 Response headers:', Object.fromEntries(response.headers.entries()));
            
            if (response.ok) {
                const data = await response.json();
                console.log('✅ LM Studio models response:', data);
                console.log('🤖 Available models:', data.data?.map(m => m.id) || 'No models found');
                
                this.isConnected = true;
                this.updateConnectionStatus('Connected', true);
                this.updateModelList(data.data || []);
                
                // Show model count in status
                const modelCount = data.data?.length || 0;
                if (modelCount > 0) {
                    this.updateConnectionStatus(`Connected (${modelCount} models)`, true);
                } else {
                    this.updateConnectionStatus('Connected - No models loaded', true);
                }
                
                return true;
            } else {
                const errorText = await response.text();
                console.error('❌ LM Studio API returned error:', response.status, response.statusText, errorText);
                throw new Error(`API returned ${response.status}: ${response.statusText} - ${errorText}`);
            }
        } catch (error) {
            console.error('❌ Connection check failed:', error);
            console.error('🔧 Error details:', {
                name: error.name,
                message: error.message,
                stack: error.stack
            });
            
            // Check if we already got models successfully before the timeout
            if (error.name === 'AbortError' && this.elements.modelSelect && this.elements.modelSelect.children.length > 1) {
                console.log('⚠️ Timeout occurred but models were already loaded - keeping connected status');
                this.isConnected = true;
                this.updateConnectionStatus('Connected (timeout after success)', true);
                return true;
            }
            
            this.isConnected = false;
            
            // More specific error handling
            if (error.name === 'AbortError') {
                this.updateConnectionStatus('⏱️ Timeout - Is LM Studio running?', false);
                console.log('💡 Troubleshooting: Make sure LM Studio is running and the local server is enabled');
            } else if (error.name === 'TypeError' && error.message.includes('fetch')) {
                this.updateConnectionStatus('🚫 Cannot reach localhost:1234', false);
                console.log('💡 Troubleshooting: Check if LM Studio local server is enabled in settings');
            } else if (error.message.includes('NetworkError')) {
                this.updateConnectionStatus('🌐 Network error - Check firewall', false);
            } else {
                this.updateConnectionStatus('❌ Connection failed', false);
                console.log('💡 Troubleshooting: Ensure LM Studio is running with local server enabled');
            }
            
            this.updateModelList([]);
            return false;
        }
    }
    
    updateConnectionStatus(text, connected) {
        if (this.elements.statusText) {
            this.elements.statusText.textContent = text;
        }
        if (this.elements.statusIndicator) {
            this.elements.statusIndicator.className = connected ? 'status-connected' : 'status-disconnected';
        }
    }
    
    async forceRefreshConnection() {
        console.log('🔄 Force refreshing connection...');
        this.updateConnectionStatus('Refreshing...', false);
        this.isConnected = false;
        
        // Clear current model selection
        this.currentModel = null;
        this.elements.modelSelect.innerHTML = '<option value="">Select Model...</option>';
        
        // Force a fresh connection check
        await this.checkConnection();
    }
    
    updateModelList(models) {
        this.elements.modelSelect.innerHTML = '<option value="">Select Model...</option>';
        models.forEach(model => {
            const option = document.createElement('option');
            option.value = model.id;
            option.textContent = model.id;
            this.elements.modelSelect.appendChild(option);
        });
        
        if (this.currentModel && models.find(m => m.id === this.currentModel)) {
            this.elements.modelSelect.value = this.currentModel;
        } else if (models.length > 0) {
            this.currentModel = models[0].id;
            this.elements.modelSelect.value = this.currentModel;
        }
    }
    
    autoResizeTextarea() {
        const textarea = this.elements.messageInput;
        textarea.style.height = 'auto';
        textarea.style.height = Math.min(textarea.scrollHeight, 200) + 'px';
    }
    
    updateCharCount() {
        const count = this.elements.messageInput.value.length;
        this.elements.charCount.textContent = count;
        this.elements.charCount.style.color = count > 3500 ? '#ff4444' : '#888';
    }
    
    openSettings() {
        // Open settings page in new tab
        try {
            const url = browser.runtime.getURL('options.html');
            browser.tabs.create({ url: url });
        } catch (error) {
            console.error('Failed to open settings:', error);
            // Fallback
            window.open('options.html', '_blank');
        }
    }
    
    async checkPendingQuery() {
        try {
            const result = await browser.storage.local.get(['pendingQuery', 'forceSearch', 'autoSend', 'targetTabId']);
            if (result.pendingQuery) {
                this.elements.messageInput.value = result.pendingQuery;
                if (result.forceSearch) {
                    this.elements.searchToggle.checked = true;
                    this.searchEnabled = true;
                }
                this.autoResizeTextarea();
                this.updateCharCount();
                
                // If autoSend is true, automatically send the message
                if (result.autoSend) {
                    // Small delay to ensure UI is ready
                    setTimeout(() => {
                        this.sendMessage();
                    }, 500);
                }
                
                // Clear the pending query
                browser.storage.local.remove(['pendingQuery', 'forceSearch', 'autoSend', 'targetTabId']);
            }
        } catch (error) {
            console.error('Error checking pending query:', error);
        }
    }
    
    async sendMessage() {
        const message = this.elements.messageInput.value.trim();
        console.log('🚀 sendMessage called with:', message);
        console.log('🔗 isConnected:', this.isConnected);
        
        if (!message) {
            console.log('❌ No message provided');
            return;
        }
        
        if (!this.isConnected) {
            console.log('❌ Not connected to LM Studio');
            this.addMessage('❌ Not connected to LM Studio. Please check connection.', 'system');
            return;
        }
        
        // Clear input and add user message
        this.elements.messageInput.value = '';
        this.autoResizeTextarea();
        this.updateCharCount();
        
        this.addMessage(message, 'user');
        this.elements.sendBtn.disabled = true;
        
        try {
            let finalMessage = message;
            let searchResults = [];
            
            // Get page context if enabled
            console.log('🔍 Checking page context - contextEnabled:', this.contextEnabled);
            if (this.contextEnabled) {
                console.log('📄 Page context is enabled, fetching...');
                const pageContext = await this.getPageContext();
                if (pageContext) {
                    finalMessage = `Page Context: ${pageContext.title}\n${pageContext.content}\n\nUser Question: ${message}`;
                    console.log('📄 Page context added to message');
                } else {
                    console.log('📄 No page context retrieved');
                }
            } else {
                console.log('📄 Page context disabled, skipping');
            }
            
            // Intelligent search detection - only if auto-search is enabled
            const shouldAutoSearch = this.autoSearchEnabled && this.shouldAutoSearch(message);
            const searchEnabled = this.searchEnabled || shouldAutoSearch;
            
            // Search the internet if enabled or auto-detected
            console.log('🔍 Search check - searchEnabled:', this.searchEnabled, 'autoSearchEnabled:', this.autoSearchEnabled, 'shouldAutoSearch:', shouldAutoSearch, 'finalSearchEnabled:', searchEnabled);
            if (searchEnabled) {
                console.log('🔍 Starting web search...');
                // Update UI to show auto-search status
                if (shouldAutoSearch && !this.searchEnabled) {
                    this.elements.searchToggle.classList.add('auto-search');
                    this.elements.searchToggle.parentElement.querySelector('span').textContent = '🔍 Auto-Search Active';
                }
                
                this.addLoadingMessage('🔍 Searching the internet for current information...');
                searchResults = await this.searchInternet(message);
                this.removeLoadingMessage();
                console.log('🔍 Web search completed, results:', searchResults.length);
                
                if (searchResults.length > 0) {
                    this.addSearchResults(searchResults);
                    finalMessage = this.enhanceMessageWithSearch(finalMessage, searchResults);
                } else if (shouldAutoSearch) {
                    this.addMessage('No current information found, using model knowledge only.', 'system');
                }
                
                // Reset auto-search visual indicator after a delay
                if (shouldAutoSearch && !this.searchEnabled) {
                    setTimeout(() => {
                        this.elements.searchToggle.classList.remove('auto-search');
                        this.elements.searchToggle.parentElement.querySelector('span').textContent = '🔍 Internet Search';
                    }, 3000);
                }
            }
            
            // Add loading message for AI response
            this.addLoadingMessage('🤖 Processing with ' + (searchResults.length > 0 ? 'internet-enhanced' : 'local') + ' knowledge...');
            
            // Send to LM Studio with enhanced context
            const response = await this.callLMStudio(finalMessage);
            this.removeLoadingMessage();
            this.addMessage(response, 'assistant');
            
            // Update session
            this.updateCurrentSession(message, response);
            
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
    
    async getPageContext() {
        try {
            console.log('🔍 Attempting to get page context - contextEnabled:', this.contextEnabled);
            if (!this.contextEnabled) {
                console.log('📄 Page context disabled, skipping');
                return null;
            }
            
            const tabs = await browser.tabs.query({ active: true, currentWindow: true });
            if (tabs[0]) {
                const response = await browser.tabs.sendMessage(tabs[0].id, { action: 'getPageContent' });
                console.log('📄 Page context retrieved:', response);
                return response;
            }
        } catch (error) {
            console.error('Failed to get page context:', error);
        }
        return null;
    }
    
    async searchInternet(query) {
        const results = [];
        
        try {
            // Try Wikipedia first (more reliable API)
            const wikiResults = await this.searchWikipedia(query);
            results.push(...wikiResults);
            
            // Try DuckDuckGo as secondary source
            try {
                const ddgResults = await this.searchDuckDuckGo(query);
                results.push(...ddgResults);
            } catch (ddgError) {
                console.warn('DuckDuckGo search failed:', ddgError);
            }
            
            return results.slice(0, 5); // Limit to 5 results
        } catch (error) {
            console.error('Search error:', error);
            return [];
        }
    }
    
    async searchWikipedia(query) {
        try {
            const searchUrl = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(query)}`;
            const response = await fetch(searchUrl);
            
            if (!response.ok) {
                // Try search API if direct page lookup fails
                const searchApiUrl = `https://en.wikipedia.org/w/api.php?action=opensearch&search=${encodeURIComponent(query)}&limit=3&format=json&origin=*`;
                const searchResponse = await fetch(searchApiUrl);
                const searchData = await searchResponse.json();
                
                const results = [];
                if (searchData[1] && searchData[2] && searchData[3]) {
                    for (let i = 0; i < Math.min(3, searchData[1].length); i++) {
                        results.push({
                            title: `Wikipedia: ${searchData[1][i]}`,
                            snippet: searchData[2][i] || 'Wikipedia article',
                            url: searchData[3][i] || '',
                            source: 'Wikipedia'
                        });
                    }
                }
                return results;
            }
            
            const data = await response.json();
            return [{
                title: `Wikipedia: ${data.title}`,
                snippet: data.extract || data.description || 'Wikipedia article',
                url: data.content_urls?.desktop?.page || '',
                source: 'Wikipedia'
            }];
        } catch (error) {
            console.error('Wikipedia search error:', error);
            return [];
        }
    }
    
    async searchDuckDuckGo(query) {
        try {
            // DuckDuckGo Instant Answer API
            const response = await fetch(`https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1&skip_disambig=1`);
            const data = await response.json();
            
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
            if (data.RelatedTopics) {
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
            // First check if LM Studio is running
            await this.checkConnection();
            if (!this.isConnected) {
                throw new Error('LM Studio is not running. Please start LM Studio and enable the local server.');
            }
            
            console.log('🚀 Sending message to LM Studio:', message.substring(0, 100) + '...');
            console.log('🤖 Using model:', this.currentModel || 'default');
            console.log('📝 Chat history length:', this.chatHistory.length);
            
            const requestPayload = {
                model: this.currentModel || 'default',
                messages: [
                    ...this.chatHistory.slice(-10), // Include recent history for context
                    { role: 'user', content: message }
                ],
                max_tokens: 4000,
                temperature: 0.7,
                stream: true
            };
            
            console.log('📤 Request payload:', {
                ...requestPayload,
                messages: requestPayload.messages.map(m => ({ role: m.role, content: m.content.substring(0, 50) + '...' }))
            });
            
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 120000); // 2 minutes timeout
            
            const response = await fetch(`${this.apiUrl}/chat/completions`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify(requestPayload),
                signal: controller.signal
            });
            
            clearTimeout(timeoutId);
            
            console.log('📡 LM Studio response status:', response.status);
            console.log('📡 Response headers:', Object.fromEntries(response.headers.entries()));
            
            if (!response.ok) {
                const errorText = await response.text();
                console.error('LM Studio API error response:', errorText);
                throw new Error(`LM Studio API error (${response.status}): ${errorText || 'Unknown error'}`);
            }
            
            // Handle streaming response
            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let assistantMessage = '';
            let messageDiv = null;
            
            // Create streaming message element
            messageDiv = document.createElement('div');
            messageDiv.className = 'message assistant streaming';
            const messageContent = document.createElement('div');
            messageContent.className = 'message-content';
            messageDiv.appendChild(messageContent);
            this.elements.messagesContainer.appendChild(messageDiv);
            this.scrollToBottom();
            
            try {
                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;
                    
                    const chunk = decoder.decode(value);
                    const lines = chunk.split('\n');
                    
                    for (const line of lines) {
                        if (line.startsWith('data: ')) {
                            const data = line.slice(6);
                            if (data === '[DONE]') continue;
                            
                            try {
                                const parsed = JSON.parse(data);
                                if (parsed.choices && parsed.choices[0] && parsed.choices[0].delta && parsed.choices[0].delta.content) {
                                    const content = parsed.choices[0].delta.content;
                                    assistantMessage += content;
                                    messageContent.textContent = assistantMessage;
                                    this.scrollToBottom();
                                }
                            } catch (e) {
                                // Skip invalid JSON chunks
                            }
                        }
                    }
                }
            } finally {
                reader.releaseLock();
            }
            
            // Remove streaming class and finalize message
            messageDiv.classList.remove('streaming');
            
            if (this.advancedMode) {
                console.log('✅ Streaming response completed');
                this.addAdvancedDebugInfo({ content: assistantMessage }, requestPayload);
            } else {
                console.log('✅ Streaming response completed');
            }
            
            console.log('Assistant message received:', assistantMessage.substring(0, 100) + '...');
            
            // Update chat history
            this.chatHistory.push(
                { role: 'user', content: message },
                { role: 'assistant', content: assistantMessage }
            );
            
            // Keep history manageable
            if (this.chatHistory.length > 30) {
                this.chatHistory = this.chatHistory.slice(-30);
            }
            
            return assistantMessage;
            
        } catch (error) {
            if (error.name === 'AbortError') {
                throw new Error('Request timed out after 2 minutes. The model may be generating a very long response.');
            }
            console.error('LM Studio API call failed:', error);
            throw error;
        }
    }
    
    addMessage(content, type) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${type}`;
        
        const messageContent = document.createElement('div');
        messageContent.textContent = content;
        messageDiv.appendChild(messageContent);
        
        const messageTime = document.createElement('div');
        messageTime.className = 'message-time';
        messageTime.textContent = new Date().toLocaleTimeString();
        messageDiv.appendChild(messageTime);
        
        if (type === 'assistant') {
            const actions = document.createElement('div');
            actions.className = 'message-actions';
            actions.innerHTML = `
                <button class="message-action-btn" onclick="this.copyToClipboard('${content.replace(/'/g, "\\'")}')">📋</button>
                <button class="message-action-btn" onclick="this.regenerateResponse()">🔄</button>
            `;
            messageDiv.appendChild(actions);
        }
        
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
                <div style="background: #1a3a5c; border: 1px solid #2d5a8d; border-radius: 6px; padding: 8px; margin: 6px 0;">
                    <div style="font-weight: 600; color: #4da6ff; margin-bottom: 4px;">${result.title}</div>
                    <div style="color: #ccc; font-size: 12px;">${result.snippet}</div>
                    ${result.url ? `<div style="color: #888; font-size: 10px; margin-top: 4px;">${result.url}</div>` : ''}
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
    
    startNewChat() {
        this.currentSessionId = Date.now().toString();
        this.chatHistory = [];
        this.clearMessages();
        this.addWelcomeMessage();
        this.updateChatSessions();
    }
    
    clearCurrentChat() {
        this.chatHistory = [];
        this.clearMessages();
        this.addWelcomeMessage();
        if (this.currentSessionId) {
            this.updateCurrentSession('', '');
        }
    }
    
    clearMessages() {
        this.elements.messagesContainer.innerHTML = '';
    }
    
    addWelcomeMessage() {
        this.elements.messagesContainer.innerHTML = `
            <div class="welcome-message">
                <div class="welcome-icon">🤖</div>
                <h2>Welcome to LM Studio Chat Assistant!</h2>
                <p>I'm your AI assistant powered by LM Studio. I can help you with:</p>
                <ul>
                    <li>🔍 Answer questions with internet search</li>
                    <li>💻 Write and debug code</li>
                    <li>📚 Explain complex concepts</li>
                    <li>📝 Summarize content</li>
                    <li>🌐 Analyze web pages</li>
                </ul>
                <p>Start by typing a message below or use the quick prompts on the left!</p>
            </div>
        `;
    }
    
    updateCurrentSession(userMessage, assistantMessage) {
        if (!this.currentSessionId) {
            this.currentSessionId = Date.now().toString();
        }
        
        const existingSession = this.chatSessions.find(s => s.id === this.currentSessionId);
        if (existingSession) {
            existingSession.lastMessage = userMessage;
            existingSession.timestamp = new Date();
        } else {
            this.chatSessions.unshift({
                id: this.currentSessionId,
                title: userMessage.substring(0, 50) + (userMessage.length > 50 ? '...' : ''),
                lastMessage: userMessage,
                timestamp: new Date(),
                messageCount: 1
            });
        }
        
        this.updateChatSessions();
        this.saveData();
    }
    
    updateChatSessions() {
        this.elements.chatSessions.innerHTML = '';
        this.chatSessions.forEach(session => {
            const sessionDiv = document.createElement('div');
            sessionDiv.className = `chat-session ${session.id === this.currentSessionId ? 'active' : ''}`;
            sessionDiv.innerHTML = `
                <div class="session-title">${session.title}</div>
                <div class="session-preview">${session.lastMessage}</div>
                <div class="session-time">${session.timestamp.toLocaleDateString()}</div>
            `;
            sessionDiv.addEventListener('click', () => this.loadSession(session.id));
            this.elements.chatSessions.appendChild(sessionDiv);
        });
    }
    
    loadSession(sessionId) {
        // This is a simplified version - in a full implementation,
        // you'd store and restore the full chat history for each session
        this.currentSessionId = sessionId;
        this.updateChatSessions();
    }
    
    handleFileSelect(files) {
        Array.from(files).forEach(file => {
            if (file.size > 1024 * 1024) { // 1MB limit
                alert('File too large. Please select files under 1MB.');
                return;
            }
            
            const reader = new FileReader();
            reader.onload = (e) => {
                const content = e.target.result;
                this.elements.pasteContent.value += `\n\n--- ${file.name} ---\n${content}`;
            };
            reader.readAsText(file);
        });
    }
    
    confirmAttachment() {
        const content = this.elements.pasteContent.value.trim();
        if (content) {
            this.elements.messageInput.value += `\n\n${content}`;
            this.autoResizeTextarea();
            this.updateCharCount();
        }
        this.elements.pasteContent.value = '';
        this.elements.fileModal.style.display = 'none';
    }
    
    exportChat() {
        const chatData = {
            timestamp: new Date().toISOString(),
            model: this.currentModel,
            messages: this.chatHistory
        };
        
        const blob = new Blob([JSON.stringify(chatData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `lm-studio-chat-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
    }
    
    exportChat() {
        const chatData = {
            timestamp: new Date().toISOString(),
            model: this.currentModel,
            messages: this.chatHistory
        };

        const blob = new Blob([JSON.stringify(chatData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `lm-studio-chat-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
    }
    
    addAdvancedDebugInfo(responseData, requestPayload) {
        const debugDiv = document.createElement('div');
        debugDiv.className = 'message system advanced-debug';
        debugDiv.innerHTML = `
            <div class="debug-header">🔧 Advanced Debug Info</div>
            <div class="debug-content">
                <details>
                    <summary>Request Details</summary>
                    <pre>${JSON.stringify(requestPayload, null, 2)}</pre>
                </details>
                <details>
                    <summary>Response Details</summary>
                    <pre>${JSON.stringify(responseData, null, 2)}</pre>
                </details>
                <div class="debug-stats">
                    <span>Model: ${responseData.model || 'Unknown'}</span>
                    <span>Tokens: ${responseData.usage?.total_tokens || 'N/A'}</span>
                    <span>Time: ${new Date().toLocaleTimeString()}</span>
                </div>
            </div>
        `;
        this.elements.messagesContainer.appendChild(debugDiv);
        this.scrollToBottom();
    }

    async loadData() {
        try {
            const result = await browser.storage.local.get([
                'chatHistory', 'chatSessions', 'searchEnabled', 'contextEnabled', 'autoSearchEnabled', 'advancedMode', 'currentModel'
            ]);

            if (result.chatHistory) this.chatHistory = result.chatHistory;
            if (result.chatSessions) this.chatSessions = result.chatSessions;
            if (result.searchEnabled !== undefined) {
                this.searchEnabled = result.searchEnabled;
                this.elements.searchToggle.checked = this.searchEnabled;
            }
            if (result.contextEnabled !== undefined) {
                this.contextEnabled = result.contextEnabled;
                this.elements.contextToggle.checked = this.contextEnabled;
            }
            if (result.autoSearchEnabled !== undefined) {
                this.autoSearchEnabled = result.autoSearchEnabled;
                this.elements.autoSearchToggle.checked = this.autoSearchEnabled;
            }
            if (result.advancedMode !== undefined) {
                this.advancedMode = result.advancedMode;
                this.elements.advancedModeToggle.checked = this.advancedMode;
            }
            if (result.currentModel) {
                this.currentModel = result.currentModel;
            }
        } catch (error) {
            console.error('Failed to load data:', error);
        }
    }
    
    async saveData() {
        try {
            await browser.storage.local.set({
                chatHistory: this.chatHistory,
                chatSessions: this.chatSessions,
                searchEnabled: this.searchEnabled,
                contextEnabled: this.contextEnabled,
                autoSearchEnabled: this.autoSearchEnabled,
                advancedMode: this.advancedMode,
                currentModel: this.currentModel
            });
        } catch (error) {
            console.error('Failed to save data:', error);
        }
    }
}

// Initialize the app
const app = new LMStudioChatApp();

// Global functions for message actions
window.copyToClipboard = function(text) {
    navigator.clipboard.writeText(text);
};

window.regenerateResponse = function() {
    // Implement regenerate functionality
    console.log('Regenerate response');
};

// Initialize the chat app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    if (!window.chatApp) {
        window.chatApp = new LMStudioChatApp();
    }
});
