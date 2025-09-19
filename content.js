// Content script for LM Studio Firefox Extension
// Injected into all web pages to provide additional functionality

(function() {
    'use strict';
    
    // Prevent multiple injections
    if (window.lmStudioExtensionInjected) {
        return;
    }
    window.lmStudioExtensionInjected = true;
    
    class ContentScriptHandler {
        constructor() {
            this.setupMessageListener();
            this.setupSelectionHandler();
            this.createFloatingButton();
        }
        
        setupMessageListener() {
            browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
                switch (message.type) {
                    case 'GET_SELECTED_TEXT':
                        sendResponse({ text: window.getSelection().toString() });
                        break;
                        
                    case 'GET_PAGE_INFO':
                        sendResponse(this.getPageInfo());
                        break;
                        
                    case 'HIGHLIGHT_TEXT':
                        this.highlightText(message.text);
                        sendResponse({ success: true });
                        break;
                        
                    case 'SCROLL_TO_ELEMENT':
                        this.scrollToElement(message.selector);
                        sendResponse({ success: true });
                        break;
                }
            });
        }
        
        setupSelectionHandler() {
            let selectionTimeout;
            
            document.addEventListener('mouseup', () => {
                clearTimeout(selectionTimeout);
                selectionTimeout = setTimeout(() => {
                    const selection = window.getSelection();
                    const selectedText = selection.toString().trim();
                    
                    if (selectedText.length > 10) {
                        this.showQuickActions(selectedText, selection);
                    } else {
                        this.hideQuickActions();
                    }
                }, 300);
            });
            
            document.addEventListener('mousedown', () => {
                this.hideQuickActions();
            });
        }
        
        createFloatingButton() {
            // Create a floating button for quick access
            const button = document.createElement('div');
            button.id = 'lm-studio-floating-btn';
            button.innerHTML = '🤖';
            button.title = 'Open LM Studio Chat';
            button.style.cssText = `
                position: fixed;
                bottom: 20px;
                right: 20px;
                width: 50px;
                height: 50px;
                background: #007bff;
                color: white;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 20px;
                cursor: pointer;
                z-index: 10000;
                box-shadow: 0 4px 12px rgba(0, 123, 255, 0.3);
                transition: all 0.3s ease;
                opacity: 0.8;
            `;
            
            button.addEventListener('mouseenter', () => {
                button.style.opacity = '1';
                button.style.transform = 'scale(1.1)';
            });
            
            button.addEventListener('mouseleave', () => {
                button.style.opacity = '0.8';
                button.style.transform = 'scale(1)';
            });
            
            button.addEventListener('click', () => {
                browser.runtime.sendMessage({ type: 'OPEN_CHAT' });
            });
            
            document.body.appendChild(button);
        }
        
        showQuickActions(selectedText, selection) {
            this.hideQuickActions();
            
            const range = selection.getRangeAt(0);
            const rect = range.getBoundingClientRect();
            
            const quickActions = document.createElement('div');
            quickActions.id = 'lm-studio-quick-actions';
            quickActions.style.cssText = `
                position: fixed;
                top: ${rect.top - 50}px;
                left: ${rect.left}px;
                background: #2d2d2d;
                border: 1px solid #404040;
                border-radius: 8px;
                padding: 8px;
                display: flex;
                gap: 8px;
                z-index: 10001;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            `;
            
            const actions = [
                { icon: '❓', text: 'Ask', action: () => this.askAboutText(selectedText) },
                { icon: '📝', text: 'Explain', action: () => this.explainText(selectedText) },
                { icon: '🔍', text: 'Search', action: () => this.searchText(selectedText) }
            ];
            
            actions.forEach(action => {
                const btn = document.createElement('button');
                btn.innerHTML = `${action.icon} ${action.text}`;
                btn.style.cssText = `
                    background: none;
                    border: none;
                    color: #e1e1e1;
                    padding: 6px 12px;
                    border-radius: 4px;
                    cursor: pointer;
                    font-size: 12px;
                    transition: background-color 0.2s;
                `;
                
                btn.addEventListener('mouseenter', () => {
                    btn.style.background = '#404040';
                });
                
                btn.addEventListener('mouseleave', () => {
                    btn.style.background = 'none';
                });
                
                btn.addEventListener('click', () => {
                    action.action();
                    this.hideQuickActions();
                });
                
                quickActions.appendChild(btn);
            });
            
            document.body.appendChild(quickActions);
            
            // Auto-hide after 5 seconds
            setTimeout(() => this.hideQuickActions(), 5000);
        }
        
        hideQuickActions() {
            const existing = document.getElementById('lm-studio-quick-actions');
            if (existing) {
                existing.remove();
            }
        }
        
        async askAboutText(text) {
            await browser.storage.local.set({ 
                pendingQuery: `Please help me understand this: "${text}"` 
            });
            browser.runtime.sendMessage({ type: 'OPEN_CHAT' });
        }
        
        async explainText(text) {
            await browser.storage.local.set({ 
                pendingQuery: `Please explain this in detail: "${text}"` 
            });
            browser.runtime.sendMessage({ type: 'OPEN_CHAT' });
        }
        
        async searchText(text) {
            await browser.storage.local.set({ 
                pendingQuery: `Please search for information about: "${text}"`,
                forceSearch: true 
            });
            browser.runtime.sendMessage({ type: 'OPEN_CHAT' });
        }
        
        getPageInfo() {
            return {
                title: document.title,
                url: window.location.href,
                domain: window.location.hostname,
                content: this.extractMainContent(),
                wordCount: document.body.innerText.split(/\s+/).length,
                language: document.documentElement.lang || 'unknown'
            };
        }
        
        extractMainContent() {
            // Try to extract main content, avoiding headers, footers, ads
            const selectors = [
                'main',
                'article',
                '[role="main"]',
                '.content',
                '.main-content',
                '#content',
                '#main'
            ];
            
            for (const selector of selectors) {
                const element = document.querySelector(selector);
                if (element) {
                    return element.innerText.substring(0, 3000);
                }
            }
            
            // Fallback to body content
            return document.body.innerText.substring(0, 3000);
        }
        
        highlightText(text) {
            // Simple text highlighting
            const walker = document.createTreeWalker(
                document.body,
                NodeFilter.SHOW_TEXT,
                null,
                false
            );
            
            const textNodes = [];
            let node;
            while (node = walker.nextNode()) {
                if (node.textContent.includes(text)) {
                    textNodes.push(node);
                }
            }
            
            textNodes.forEach(textNode => {
                const parent = textNode.parentNode;
                const content = textNode.textContent;
                const index = content.indexOf(text);
                
                if (index !== -1) {
                    const before = content.substring(0, index);
                    const match = content.substring(index, index + text.length);
                    const after = content.substring(index + text.length);
                    
                    const highlight = document.createElement('mark');
                    highlight.style.cssText = 'background: #ffeb3b; color: #000; padding: 2px;';
                    highlight.textContent = match;
                    
                    const fragment = document.createDocumentFragment();
                    if (before) fragment.appendChild(document.createTextNode(before));
                    fragment.appendChild(highlight);
                    if (after) fragment.appendChild(document.createTextNode(after));
                    
                    parent.replaceChild(fragment, textNode);
                }
            });
        }
        
        scrollToElement(selector) {
            const element = document.querySelector(selector);
            if (element) {
                element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                
                // Briefly highlight the element
                const originalStyle = element.style.cssText;
                element.style.cssText += 'outline: 3px solid #007bff; outline-offset: 2px;';
                setTimeout(() => {
                    element.style.cssText = originalStyle;
                }, 2000);
            }
        }
    }
    
    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            new ContentScriptHandler();
        });
    } else {
        new ContentScriptHandler();
    }
})();
