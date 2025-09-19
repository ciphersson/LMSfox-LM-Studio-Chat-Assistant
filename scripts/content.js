// Content script for LM Studio Chat Assistant - Full Browser Control
console.log('LM Studio content script loaded');

// Import smart highlighter
import('./smart-highlighter.js');

// Enhanced browser control capabilities
class LMStudioBrowserController {
    constructor() {
        this.isActive = false;
        this.overlay = null;
        this.highlightedElements = [];
        this.init();
    }
    
    init() {
        this.setupMessageListener();
        this.setupContextMenuListener();
        this.setupEventListeners();
        this.injectControlInterface();
    }
    
    createOverlay() {
        this.overlay = document.createElement('div');
        this.overlay.className = 'lm-studio-overlay';
        this.overlay.innerHTML = `
            <div>🤖 LM Studio Control Active</div>
            <button onclick="this.parentElement.style.display='none'">×</button>
        `;
        this.overlay.style.display = 'none';
        document.body.appendChild(this.overlay);
    }
    
    setupEventListeners() {
        // Monitor all page interactions
        document.addEventListener('click', (e) => this.logInteraction('click', e));
        document.addEventListener('scroll', (e) => this.logInteraction('scroll', e));
        document.addEventListener('keypress', (e) => this.logInteraction('keypress', e));
        
        // Monitor form submissions
        document.addEventListener('submit', (e) => this.interceptForm(e));
        
        // Monitor navigation
        window.addEventListener('beforeunload', (e) => this.logNavigation(e));
    }
    
    injectControlInterface() {
        // Add floating control panel
        const controlPanel = document.createElement('div');
        controlPanel.innerHTML = `
            <style>
                .lm-studio-control-panel {
                    position: fixed;
                    bottom: 20px;
                    right: 20px;
                    background: #007bff;
                    color: white;
                    padding: 10px;
                    border-radius: 8px;
                    z-index: 999999;
                    font-family: Arial, sans-serif;
                    font-size: 12px;
                    box-shadow: 0 4px 12px rgba(0,0,0,0.3);
                    min-width: 200px;
                }
                .lm-studio-control-panel button {
                    background: white;
                    color: #007bff;
                    border: none;
                    padding: 5px 10px;
                    margin: 2px;
                    border-radius: 4px;
                    cursor: pointer;
                    font-size: 11px;
                }
            </style>
            <div class="lm-studio-control-panel" id="lm-studio-panel">
                <div><strong>🤖 LM Studio Control</strong></div>
                <button onclick="window.lmStudioController.extractPageData()">Extract Data</button>
                <button onclick="window.lmStudioController.highlightElements()">Highlight</button>
                <button onclick="window.lmStudioController.autoFill()">Auto Fill</button>
                <button onclick="window.lmStudioController.togglePanel()">Hide</button>
            </div>
        `;
        document.body.appendChild(controlPanel);
        
        // Make controller globally accessible
        window.lmStudioController = this;
    }
    
    logInteraction(type, event) {
        browser.runtime.sendMessage({
            action: 'logInteraction',
            type: type,
            element: event.target.tagName,
            url: window.location.href,
            timestamp: Date.now()
        });
    }
    
    interceptForm(event) {
        const formData = new FormData(event.target);
        const data = Object.fromEntries(formData.entries());
        
        browser.runtime.sendMessage({
            action: 'formSubmission',
            data: data,
            url: window.location.href,
            timestamp: Date.now()
        });
    }
    
    logNavigation(event) {
        browser.runtime.sendMessage({
            action: 'navigation',
            from: window.location.href,
            timestamp: Date.now()
        });
    }
    
    extractPageData() {
        const data = {
            title: document.title,
            url: window.location.href,
            content: document.body.innerText,
            links: Array.from(document.links).map(link => ({
                text: link.innerText,
                href: link.href
            })),
            forms: Array.from(document.forms).map(form => ({
                action: form.action,
                method: form.method,
                fields: Array.from(form.elements).map(el => ({
                    name: el.name,
                    type: el.type,
                    value: el.value
                }))
            })),
            images: Array.from(document.images).map(img => ({
                src: img.src,
                alt: img.alt
            }))
        };
        
        browser.runtime.sendMessage({
            action: 'pageDataExtracted',
            data: data
        });
        
        this.showNotification('Page data extracted and sent to LM Studio');
    }
    
    highlightElements() {
        const elements = document.querySelectorAll('p, h1, h2, h3, h4, h5, h6, a, button, input');
        elements.forEach(el => {
            el.classList.add('lm-studio-highlight');
        });
        
        this.showNotification('Elements highlighted');
        
        setTimeout(() => {
            elements.forEach(el => {
                el.classList.remove('lm-studio-highlight');
            });
        }, 3000);
    }
    
    autoFill() {
        const inputs = document.querySelectorAll('input[type="text"], input[type="email"], textarea');
        inputs.forEach(input => {
            if (input.name.includes('name') || input.placeholder.includes('name')) {
                input.value = 'LM Studio Assistant';
                input.classList.add('lm-studio-injected');
            }
            if (input.name.includes('email') || input.placeholder.includes('email')) {
                input.value = 'assistant@lmstudio.ai';
                input.classList.add('lm-studio-injected');
            }
        });
        
        this.showNotification('Forms auto-filled');
    }
    
    togglePanel() {
        const panel = document.getElementById('lm-studio-panel');
        panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
    }
    
    showNotification(message) {
        this.overlay.innerHTML = `<div>🤖 ${message}</div>`;
        this.overlay.style.display = 'block';
        
        setTimeout(() => {
            this.overlay.style.display = 'none';
        }, 2000);
    }

    // Automation task methods
    automationClick(selector, waitFor = 1000) {
        setTimeout(() => {
            const element = document.querySelector(selector);
            if (element) {
                element.click();
                this.showNotification(`Clicked: ${selector}`);
            }
        }, waitFor);
    }

    automationExtract(selectors, format = 'json') {
        const data = {};
        
        for (const [key, selector] of Object.entries(selectors)) {
            const elements = document.querySelectorAll(selector);
            if (elements.length === 1) {
                data[key] = elements[0].textContent.trim();
            } else if (elements.length > 1) {
                data[key] = Array.from(elements).map(el => el.textContent.trim());
            }
        }
        
        return format === 'json' ? data : JSON.stringify(data);
    }

    automationFillForm(fields, submit = false) {
        for (const [selector, value] of Object.entries(fields)) {
            const element = document.querySelector(selector);
            if (element) {
                if (element.type === 'checkbox' || element.type === 'radio') {
                    element.checked = value;
                } else {
                    element.value = value;
                }
                element.dispatchEvent(new Event('input', { bubbles: true }));
            }
        }
        
        if (submit) {
            const form = document.querySelector('form');
            if (form) {
                form.submit();
            }
        }
        
        this.showNotification('Form filled automatically');
    }

    /**
     * Extract relevant content from page for cross-referencing
     */
    extractRelevantContent(query) {
        try {
            const title = document.title;
            const url = window.location.href;
            
            // Get all text content
            const allText = document.body.innerText || document.body.textContent || '';
            
            // Find relevant sections based on query keywords
            const queryWords = query.toLowerCase().split(/\s+/);
            const relevantSections = [];
            
            // Check headings for relevance
            const headings = document.querySelectorAll('h1, h2, h3, h4, h5, h6');
            headings.forEach(heading => {
                const headingText = heading.textContent.toLowerCase();
                if (queryWords.some(word => headingText.includes(word))) {
                    // Get the section content after this heading
                    let section = heading.textContent;
                    let nextElement = heading.nextElementSibling;
                    
                    while (nextElement && !nextElement.matches('h1, h2, h3, h4, h5, h6')) {
                        if (nextElement.textContent) {
                            section += '\n' + nextElement.textContent;
                        }
                        nextElement = nextElement.nextElementSibling;
                        
                        // Limit section length
                        if (section.length > 1000) break;
                    }
                    
                    relevantSections.push({
                        type: 'heading_section',
                        heading: heading.textContent,
                        content: section,
                        relevance: this.calculateRelevance(section.toLowerCase(), queryWords)
                    });
                }
            });
            
            // Check paragraphs for relevance
            const paragraphs = document.querySelectorAll('p');
            paragraphs.forEach(paragraph => {
                const paragraphText = paragraph.textContent.toLowerCase();
                const relevance = this.calculateRelevance(paragraphText, queryWords);
                
                if (relevance > 0.3) { // Threshold for relevance
                    relevantSections.push({
                        type: 'paragraph',
                        content: paragraph.textContent,
                        relevance: relevance
                    });
                }
            });
            
            // Sort by relevance
            relevantSections.sort((a, b) => b.relevance - a.relevance);
            
            // Limit to top 10 most relevant sections
            const topSections = relevantSections.slice(0, 10);
            
            // Extract key sentences that contain query terms
            const sentences = allText.split(/[.!?]+/);
            const relevantSentences = sentences
                .filter(sentence => {
                    const sentenceLower = sentence.toLowerCase();
                    return queryWords.some(word => sentenceLower.includes(word));
                })
                .slice(0, 5); // Top 5 relevant sentences
            
            return {
                title: title,
                url: url,
                text: allText.substring(0, 2000), // First 2000 characters
                relevantSections: topSections,
                relevantSentences: relevantSentences,
                totalLength: allText.length
            };
            
        } catch (error) {
            console.error('Content extraction failed:', error);
            return {
                title: document.title || '',
                url: window.location.href,
                text: '',
                relevantSections: [],
                relevantSentences: [],
                error: error.message
            };
        }
    }

    /**
     * Calculate relevance score for text based on query words
     */
    calculateRelevance(text, queryWords) {
        let score = 0;
        const textWords = text.split(/\s+/);
        
        queryWords.forEach(queryWord => {
            // Exact matches get higher score
            const exactMatches = (text.match(new RegExp(queryWord, 'gi')) || []).length;
            score += exactMatches * 2;
            
            // Partial matches get lower score
            textWords.forEach(textWord => {
                if (textWord.includes(queryWord) && textWord !== queryWord) {
                    score += 0.5;
                }
            });
        });
        
        // Normalize by text length
        return Math.min(score / textWords.length, 1);
    }

    /**
     * Collect data from page using selectors
     */
    collectData(selectors, schema) {
        try {
            const data = [];
            
            // If selectors specify a container for multiple items
            if (selectors.container) {
                const containers = document.querySelectorAll(selectors.container);
                
                containers.forEach((container, index) => {
                    const item = { _index: index };
                    
                    // Extract data for each field
                    Object.entries(selectors.fields || {}).forEach(([field, selector]) => {
                        const element = container.querySelector(selector);
                        if (element) {
                            item[field] = this.extractElementData(element, schema[field]);
                        }
                    });
                    
                    data.push(item);
                });
            } else {
                // Single item extraction
                const item = {};
                
                Object.entries(selectors.fields || selectors).forEach(([field, selector]) => {
                    const element = document.querySelector(selector);
                    if (element) {
                        item[field] = this.extractElementData(element, schema[field]);
                    }
                });
                
                if (Object.keys(item).length > 0) {
                    data.push(item);
                }
            }
            
            return data;
        } catch (error) {
            console.error('Data collection failed:', error);
            return [];
        }
    }

    /**
     * Extract data from DOM element based on type
     */
    extractElementData(element, fieldSchema) {
        const type = fieldSchema?.type || 'text';
        
        switch (type) {
            case 'text':
                return element.textContent?.trim() || '';
            case 'html':
                return element.innerHTML;
            case 'attribute':
                return element.getAttribute(fieldSchema.attribute) || '';
            case 'link':
                return element.href || element.getAttribute('href') || '';
            case 'image':
                return element.src || element.getAttribute('src') || '';
            case 'number':
                const numText = element.textContent?.trim() || '';
                return parseFloat(numText.replace(/[^\d.-]/g, '')) || 0;
            case 'date':
                const dateText = element.textContent?.trim() || '';
                return new Date(dateText).toISOString();
            case 'list':
                const items = element.querySelectorAll(fieldSchema.itemSelector || 'li');
                return Array.from(items).map(item => item.textContent?.trim());
            default:
                return element.textContent?.trim() || '';
        }
    }

    /**
     * Navigate to next page for pagination
     */
    navigateNextPage(config) {
        try {
            let nextButton = null;
            
            // Try different methods to find next page button
            if (config.nextSelector) {
                nextButton = document.querySelector(config.nextSelector);
            } else if (config.nextText) {
                // Find button/link with specific text
                const buttons = document.querySelectorAll('a, button');
                nextButton = Array.from(buttons).find(btn => 
                    btn.textContent?.toLowerCase().includes(config.nextText.toLowerCase())
                );
            } else {
                // Common next page selectors
                const commonSelectors = [
                    'a[rel="next"]',
                    '.next',
                    '.pagination-next',
                    '[aria-label*="next"]',
                    'a:contains("Next")',
                    'a:contains(">")'
                ];
                
                for (const selector of commonSelectors) {
                    nextButton = document.querySelector(selector);
                    if (nextButton) break;
                }
            }
            
            if (nextButton && !nextButton.disabled) {
                nextButton.click();
                return { success: true };
            } else {
                return { success: false, error: 'Next page button not found or disabled' };
            }
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    setupMessageListener() {
        browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
            switch(message.action) {
                case 'extractData':
                    this.extractPageData();
                    break;
                case 'getPageContent':
                    sendResponse(this.getPageContent());
                    break;
                case 'activateControl':
                    this.activateControl();
                    break;
                case 'deactivateControl':
                    this.deactivateControl();
                    break;
                case 'highlightPage':
                    this.highlightImportantSections();
                    break;
                case 'clearHighlights':
                    this.clearAllHighlights();
                    break;
                case 'highlightSelection':
                    if (this.lastSelection) {
                        this.highlightSelection(this.lastSelection);
                    }
                    break;
            }
        });
    }
    
    setupContextMenuListener() {
        // Listen for context menu selections and highlight them
        document.addEventListener('mouseup', () => {
            const selection = window.getSelection();
            if (selection.toString().trim().length > 0) {
                // Store the selection for potential highlighting
                this.lastSelection = {
                    text: selection.toString(),
                    range: selection.getRangeAt(0).cloneRange()
                };
            }
        });
    }
    
    highlightSelection(selection) {
        try {
            // Create a highlight span
            const highlightSpan = document.createElement('span');
            highlightSpan.className = 'lm-studio-highlight lm-studio-explained';
            highlightSpan.style.backgroundColor = '#ffeb3b';
            highlightSpan.style.padding = '2px 4px';
            highlightSpan.style.borderRadius = '3px';
            highlightSpan.style.border = '2px solid #ffc107';
            highlightSpan.title = 'Explained in LM Studio Chat';
            
            // Wrap the selected text
            selection.range.surroundContents(highlightSpan);
            
            // Store for later cleanup
            this.highlightedElements.push(highlightSpan);
            
            console.log('Highlighted selected text for explanation');
        } catch (error) {
            console.error('Failed to highlight selection:', error);
        }
    }
    
    clearAllHighlights() {
        this.highlightedElements.forEach(element => {
            if (element.parentNode) {
                // Replace the highlight span with its text content
                const parent = element.parentNode;
                parent.replaceChild(document.createTextNode(element.textContent), element);
                parent.normalize(); // Merge adjacent text nodes
            }
        });
        this.highlightedElements = [];
        console.log('Cleared all highlights');
    }

    // Additional methods for browser control
    extractPageData() {
        const data = {
            title: document.title,
            url: window.location.href,
            content: document.body.innerText.substring(0, 1000)
        };
        console.log('Extracted page data:', data);
        return data;
    }
    
    getPageContent() {
        return {
            title: document.title,
            url: window.location.href,
            content: document.body.innerText.substring(0, 2000)
        };
    }
    
    activateControl() {
        this.isActive = true;
        console.log('LM Studio control activated');
    }
    
    deactivateControl() {
        this.isActive = false;
        console.log('LM Studio control deactivated');
    }
    
    highlightImportantSections() {
        // This would integrate with the smart highlighter
        console.log('Highlighting important sections');
    }
}

// Initialize the controller
const controller = new LMStudioBrowserController();
