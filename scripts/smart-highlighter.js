/**
 * Smart Highlighter - AI-powered content highlighting system
 * Automatically identifies and highlights important sections on webpages
 */

class SmartHighlighter {
    constructor() {
        this.apiUrl = 'http://localhost:1234/v1/chat/completions';
        this.storageKey = 'lm_studio_highlights';
        this.isEnabled = true;
        this.highlightStyles = {
            keyInsight: { backgroundColor: '#fff3cd', borderLeft: '4px solid #ffc107', color: '#856404' },
            actionable: { backgroundColor: '#d1ecf1', borderLeft: '4px solid #17a2b8', color: '#0c5460' },
            critical: { backgroundColor: '#f8d7da', borderLeft: '4px solid #dc3545', color: '#721c24' },
            definition: { backgroundColor: '#d4edda', borderLeft: '4px solid #28a745', color: '#155724' },
            statistic: { backgroundColor: '#e2e3e5', borderLeft: '4px solid #6c757d', color: '#383d41' },
            quote: { backgroundColor: '#f3e5f5', borderLeft: '4px solid #9c27b0', color: '#4a148c' }
        };
        this.highlightedElements = new Set();
        this.init();
    }

    async init() {
        console.log('SmartHighlighter initialized');
        await this.loadSettings();
        this.setupEventListeners();
        this.createHighlightControls();
    }

    async loadSettings() {
        try {
            const stored = await browser.storage.local.get(['smartHighlighter']);
            const settings = stored.smartHighlighter || {};
            this.isEnabled = settings.enabled !== false;
            this.highlightStyles = { ...this.highlightStyles, ...(settings.styles || {}) };
        } catch (error) {
            console.error('Error loading highlighter settings:', error);
        }
    }

    setupEventListeners() {
        // Listen for messages from background script
        browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
            switch (message.action) {
                case 'highlightPage':
                    this.highlightCurrentPage();
                    sendResponse({ success: true });
                    break;
                case 'clearHighlights':
                    this.clearAllHighlights();
                    sendResponse({ success: true });
                    break;
                case 'toggleHighlighter':
                    this.toggleHighlighter();
                    sendResponse({ success: true, enabled: this.isEnabled });
                    break;
                case 'getHighlightedContent':
                    sendResponse({ highlights: this.getHighlightedContent() });
                    break;
            }
        });

        // Auto-highlight on page load if enabled
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                if (this.isEnabled) {
                    setTimeout(() => this.highlightCurrentPage(), 1000);
                }
            });
        } else if (this.isEnabled) {
            setTimeout(() => this.highlightCurrentPage(), 1000);
        }
    }

    createHighlightControls() {
        // Create floating control panel
        const controlPanel = document.createElement('div');
        controlPanel.id = 'lm-studio-highlight-controls';
        controlPanel.innerHTML = `
            <div class="highlight-controls-header">
                <span>🎯 Smart Highlights</span>
                <button id="toggleHighlights" class="control-btn">
                    ${this.isEnabled ? '👁️' : '👁️‍🗨️'}
                </button>
                <button id="clearHighlights" class="control-btn">🗑️</button>
                <button id="refreshHighlights" class="control-btn">🔄</button>
                <button id="hideControls" class="control-btn">✕</button>
            </div>
            <div class="highlight-legend">
                <div class="legend-item">
                    <span class="legend-color" style="background: #fff3cd; border-left: 3px solid #ffc107;"></span>
                    <span>Key Insights</span>
                </div>
                <div class="legend-item">
                    <span class="legend-color" style="background: #d1ecf1; border-left: 3px solid #17a2b8;"></span>
                    <span>Actionable</span>
                </div>
                <div class="legend-item">
                    <span class="legend-color" style="background: #f8d7da; border-left: 3px solid #dc3545;"></span>
                    <span>Critical</span>
                </div>
                <div class="legend-item">
                    <span class="legend-color" style="background: #d4edda; border-left: 3px solid #28a745;"></span>
                    <span>Definitions</span>
                </div>
            </div>
        `;

        // Add styles for control panel
        const styles = document.createElement('style');
        styles.textContent = `
            #lm-studio-highlight-controls {
                position: fixed;
                top: 20px;
                right: 20px;
                background: white;
                border: 1px solid #ddd;
                border-radius: 8px;
                box-shadow: 0 4px 20px rgba(0,0,0,0.1);
                z-index: 10000;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
                font-size: 12px;
                max-width: 250px;
                opacity: 0.9;
                transition: opacity 0.3s ease;
            }
            
            #lm-studio-highlight-controls:hover {
                opacity: 1;
            }
            
            .highlight-controls-header {
                display: flex;
                align-items: center;
                justify-content: space-between;
                padding: 8px 12px;
                background: #f8f9fa;
                border-bottom: 1px solid #ddd;
                border-radius: 8px 8px 0 0;
                font-weight: 600;
            }
            
            .control-btn {
                background: none;
                border: none;
                cursor: pointer;
                padding: 4px;
                margin-left: 4px;
                border-radius: 4px;
                font-size: 14px;
            }
            
            .control-btn:hover {
                background: #e9ecef;
            }
            
            .highlight-legend {
                padding: 8px 12px;
            }
            
            .legend-item {
                display: flex;
                align-items: center;
                margin-bottom: 4px;
            }
            
            .legend-color {
                width: 16px;
                height: 12px;
                margin-right: 8px;
                border-radius: 2px;
            }
            
            .lm-studio-highlight {
                padding: 4px 8px;
                margin: 2px 0;
                border-radius: 4px;
                position: relative;
                transition: all 0.3s ease;
            }
            
            .lm-studio-highlight:hover {
                transform: translateX(2px);
                box-shadow: 0 2px 8px rgba(0,0,0,0.1);
            }
            
            .lm-studio-highlight::before {
                content: attr(data-highlight-type);
                position: absolute;
                top: -20px;
                left: 0;
                background: #333;
                color: white;
                padding: 2px 6px;
                border-radius: 4px;
                font-size: 10px;
                opacity: 0;
                transition: opacity 0.3s ease;
                pointer-events: none;
                text-transform: uppercase;
                font-weight: 600;
            }
            
            .lm-studio-highlight:hover::before {
                opacity: 1;
            }
            
            .highlight-controls-hidden {
                transform: translateX(100%);
            }
        `;

        document.head.appendChild(styles);
        document.body.appendChild(controlPanel);

        // Set up control event listeners
        document.getElementById('toggleHighlights')?.addEventListener('click', () => {
            this.toggleHighlighter();
            document.getElementById('toggleHighlights').textContent = this.isEnabled ? '👁️' : '👁️‍🗨️';
        });

        document.getElementById('clearHighlights')?.addEventListener('click', () => {
            this.clearAllHighlights();
        });

        document.getElementById('refreshHighlights')?.addEventListener('click', () => {
            this.clearAllHighlights();
            setTimeout(() => this.highlightCurrentPage(), 500);
        });

        document.getElementById('hideControls')?.addEventListener('click', () => {
            controlPanel.style.display = 'none';
        });
    }

    async highlightCurrentPage() {
        if (!this.isEnabled) return;

        try {
            console.log('Starting smart highlighting...');
            
            // Extract content from the page
            const content = this.extractPageContent();
            
            // Analyze content with AI to identify important sections
            const analysis = await this.analyzeContentForHighlighting(content);
            
            // Apply highlights based on analysis
            this.applyHighlights(analysis);
            
            // Store highlights for later retrieval
            await this.storeHighlights(analysis);
            
            console.log('Smart highlighting completed');
            
        } catch (error) {
            console.error('Error during smart highlighting:', error);
            // Fallback to rule-based highlighting
            this.applyFallbackHighlighting();
        }
    }

    extractPageContent() {
        const content = {
            title: document.title,
            url: window.location.href,
            headings: [],
            paragraphs: [],
            lists: [],
            quotes: [],
            tables: []
        };

        // Extract headings
        document.querySelectorAll('h1, h2, h3, h4, h5, h6').forEach(heading => {
            if (this.isVisibleElement(heading)) {
                content.headings.push({
                    text: heading.textContent.trim(),
                    level: parseInt(heading.tagName.charAt(1)),
                    element: heading
                });
            }
        });

        // Extract paragraphs
        document.querySelectorAll('p').forEach(p => {
            if (this.isVisibleElement(p) && p.textContent.trim().length > 50) {
                content.paragraphs.push({
                    text: p.textContent.trim(),
                    element: p
                });
            }
        });

        // Extract lists
        document.querySelectorAll('ul, ol').forEach(list => {
            if (this.isVisibleElement(list)) {
                const items = Array.from(list.querySelectorAll('li')).map(li => li.textContent.trim());
                if (items.length > 0) {
                    content.lists.push({
                        items: items,
                        element: list
                    });
                }
            }
        });

        // Extract quotes
        document.querySelectorAll('blockquote, q').forEach(quote => {
            if (this.isVisibleElement(quote)) {
                content.quotes.push({
                    text: quote.textContent.trim(),
                    element: quote
                });
            }
        });

        // Extract tables
        document.querySelectorAll('table').forEach(table => {
            if (this.isVisibleElement(table)) {
                content.tables.push({
                    element: table
                });
            }
        });

        return content;
    }

    async analyzeContentForHighlighting(content) {
        const prompt = `Analyze the following webpage content and identify sections that should be highlighted. 
        Categorize each important section as one of: keyInsight, actionable, critical, definition, statistic, quote.
        
        Content:
        Title: ${content.title}
        
        Headings: ${content.headings.map(h => h.text).join(', ')}
        
        Sample paragraphs: ${content.paragraphs.slice(0, 5).map(p => p.text.substring(0, 200)).join(' | ')}
        
        Provide response as JSON array with objects containing:
        - text: The exact text to highlight (must match content exactly)
        - type: One of keyInsight, actionable, critical, definition, statistic, quote
        - reason: Brief explanation why this should be highlighted
        - priority: high, medium, low
        
        Focus on:
        1. Key insights and important findings
        2. Actionable steps or recommendations
        3. Critical warnings or important notices
        4. Definitions of important terms
        5. Statistics and data points
        6. Notable quotes or statements`;

        try {
            const response = await this.callLMStudio(prompt);
            return this.parseAIResponse(response);
        } catch (error) {
            console.error('Error analyzing content for highlighting:', error);
            return this.generateFallbackAnalysis(content);
        }
    }

    applyHighlights(analysis) {
        if (!analysis || analysis.length === 0) return;

        analysis.forEach(highlight => {
            this.highlightTextInPage(highlight.text, highlight.type, highlight.reason);
        });
    }

    highlightTextInPage(searchText, type, reason) {
        const walker = document.createTreeWalker(
            document.body,
            NodeFilter.SHOW_TEXT,
            {
                acceptNode: (node) => {
                    // Skip already highlighted elements and script/style tags
                    if (node.parentElement.closest('.lm-studio-highlight') ||
                        node.parentElement.tagName === 'SCRIPT' ||
                        node.parentElement.tagName === 'STYLE' ||
                        node.parentElement.id === 'lm-studio-highlight-controls') {
                        return NodeFilter.FILTER_REJECT;
                    }
                    return NodeFilter.FILTER_ACCEPT;
                }
            }
        );

        const textNodes = [];
        let node;
        while (node = walker.nextNode()) {
            textNodes.push(node);
        }

        textNodes.forEach(textNode => {
            const text = textNode.textContent;
            const searchIndex = text.toLowerCase().indexOf(searchText.toLowerCase());
            
            if (searchIndex !== -1) {
                const beforeText = text.substring(0, searchIndex);
                const matchText = text.substring(searchIndex, searchIndex + searchText.length);
                const afterText = text.substring(searchIndex + searchText.length);

                if (matchText.trim().length > 10) { // Only highlight substantial text
                    const highlightSpan = document.createElement('span');
                    highlightSpan.className = 'lm-studio-highlight';
                    highlightSpan.setAttribute('data-highlight-type', type);
                    highlightSpan.setAttribute('data-highlight-reason', reason);
                    highlightSpan.textContent = matchText;
                    
                    // Apply styles
                    const styles = this.highlightStyles[type] || this.highlightStyles.keyInsight;
                    Object.assign(highlightSpan.style, styles);

                    // Replace the text node with highlighted content
                    const parent = textNode.parentNode;
                    
                    if (beforeText) {
                        parent.insertBefore(document.createTextNode(beforeText), textNode);
                    }
                    
                    parent.insertBefore(highlightSpan, textNode);
                    
                    if (afterText) {
                        parent.insertBefore(document.createTextNode(afterText), textNode);
                    }
                    
                    parent.removeChild(textNode);
                    this.highlightedElements.add(highlightSpan);
                }
            }
        });
    }

    applyFallbackHighlighting() {
        console.log('Applying fallback highlighting...');
        
        // Highlight headings as key insights
        document.querySelectorAll('h1, h2, h3').forEach(heading => {
            if (this.isVisibleElement(heading) && !heading.closest('.lm-studio-highlight')) {
                this.wrapElementWithHighlight(heading, 'keyInsight', 'Important heading');
            }
        });

        // Highlight elements with action words
        const actionWords = ['important', 'note', 'warning', 'caution', 'remember', 'key', 'critical'];
        document.querySelectorAll('p, li, div').forEach(element => {
            if (this.isVisibleElement(element) && !element.closest('.lm-studio-highlight')) {
                const text = element.textContent.toLowerCase();
                actionWords.forEach(word => {
                    if (text.includes(word) && element.textContent.length < 300) {
                        this.wrapElementWithHighlight(element, 'actionable', `Contains action word: ${word}`);
                    }
                });
            }
        });

        // Highlight quotes
        document.querySelectorAll('blockquote, q').forEach(quote => {
            if (this.isVisibleElement(quote) && !quote.closest('.lm-studio-highlight')) {
                this.wrapElementWithHighlight(quote, 'quote', 'Notable quote');
            }
        });

        // Highlight elements with numbers (potential statistics)
        document.querySelectorAll('p, li, span').forEach(element => {
            if (this.isVisibleElement(element) && !element.closest('.lm-studio-highlight')) {
                const text = element.textContent;
                const hasNumbers = /\d+%|\$\d+|\d+\.\d+|\d{4}/.test(text);
                if (hasNumbers && text.length < 200) {
                    this.wrapElementWithHighlight(element, 'statistic', 'Contains numerical data');
                }
            }
        });
    }

    wrapElementWithHighlight(element, type, reason) {
        const wrapper = document.createElement('div');
        wrapper.className = 'lm-studio-highlight';
        wrapper.setAttribute('data-highlight-type', type);
        wrapper.setAttribute('data-highlight-reason', reason);
        
        // Apply styles
        const styles = this.highlightStyles[type] || this.highlightStyles.keyInsight;
        Object.assign(wrapper.style, styles);
        
        element.parentNode.insertBefore(wrapper, element);
        wrapper.appendChild(element);
        this.highlightedElements.add(wrapper);
    }

    clearAllHighlights() {
        this.highlightedElements.forEach(element => {
            if (element.parentNode) {
                // If it's a wrapper, move children back to parent
                if (element.tagName === 'DIV' && element.className === 'lm-studio-highlight') {
                    while (element.firstChild) {
                        element.parentNode.insertBefore(element.firstChild, element);
                    }
                }
                element.parentNode.removeChild(element);
            }
        });
        this.highlightedElements.clear();
        console.log('All highlights cleared');
    }

    toggleHighlighter() {
        this.isEnabled = !this.isEnabled;
        
        if (this.isEnabled) {
            this.highlightCurrentPage();
        } else {
            this.clearAllHighlights();
        }
        
        // Save setting
        browser.storage.local.set({
            smartHighlighter: { enabled: this.isEnabled, styles: this.highlightStyles }
        });
        
        console.log(`Smart highlighter ${this.isEnabled ? 'enabled' : 'disabled'}`);
    }

    getHighlightedContent() {
        const highlights = [];
        this.highlightedElements.forEach(element => {
            highlights.push({
                text: element.textContent,
                type: element.getAttribute('data-highlight-type'),
                reason: element.getAttribute('data-highlight-reason')
            });
        });
        return highlights;
    }

    // Utility methods
    isVisibleElement(element) {
        const style = window.getComputedStyle(element);
        return style.display !== 'none' && 
               style.visibility !== 'hidden' && 
               style.opacity !== '0' &&
               element.offsetWidth > 0 && 
               element.offsetHeight > 0;
    }

    async callLMStudio(prompt) {
        const response = await fetch(this.apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: 'local-model',
                messages: [
                    {
                        role: 'system',
                        content: 'You are an expert content analyzer specializing in identifying important information for highlighting. Always respond with valid JSON.'
                    },
                    { role: 'user', content: prompt }
                ],
                temperature: 0.3,
                max_tokens: 1500
            })
        });

        if (!response.ok) {
            throw new Error(`LM Studio API error: ${response.status}`);
        }

        const data = await response.json();
        return data.choices[0].message.content;
    }

    parseAIResponse(response) {
        try {
            const jsonMatch = response.match(/\[[\s\S]*\]/);
            if (jsonMatch) {
                return JSON.parse(jsonMatch[0]);
            }
            return JSON.parse(response);
        } catch (error) {
            console.error('Error parsing AI response:', error);
            return [];
        }
    }

    generateFallbackAnalysis(content) {
        const analysis = [];
        
        // Analyze headings
        content.headings.forEach(heading => {
            if (heading.level <= 3) {
                analysis.push({
                    text: heading.text,
                    type: 'keyInsight',
                    reason: 'Important heading',
                    priority: heading.level === 1 ? 'high' : 'medium'
                });
            }
        });

        // Analyze paragraphs for action words
        content.paragraphs.forEach(p => {
            const actionWords = ['important', 'key', 'critical', 'note', 'warning'];
            const lowerText = p.text.toLowerCase();
            
            actionWords.forEach(word => {
                if (lowerText.includes(word)) {
                    analysis.push({
                        text: p.text.substring(0, 100),
                        type: word === 'warning' ? 'critical' : 'actionable',
                        reason: `Contains ${word}`,
                        priority: 'medium'
                    });
                }
            });
        });

        return analysis.slice(0, 10); // Limit to 10 highlights
    }

    async storeHighlights(analysis) {
        try {
            const stored = await browser.storage.local.get(this.storageKey);
            const allHighlights = stored[this.storageKey] || [];
            
            const pageHighlights = {
                url: window.location.href,
                title: document.title,
                timestamp: Date.now(),
                highlights: analysis
            };
            
            allHighlights.unshift(pageHighlights);
            
            // Keep only the latest 50 pages
            if (allHighlights.length > 50) {
                allHighlights.splice(50);
            }
            
            await browser.storage.local.set({ [this.storageKey]: allHighlights });
        } catch (error) {
            console.error('Error storing highlights:', error);
        }
    }
}

// Initialize smart highlighter
if (typeof window !== 'undefined' && window.location.href.startsWith('http')) {
    window.smartHighlighter = new SmartHighlighter();
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SmartHighlighter;
}
