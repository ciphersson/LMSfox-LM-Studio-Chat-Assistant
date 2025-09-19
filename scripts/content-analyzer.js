// Content Analyzer System for Auto-Analysis and AI Summaries
class ContentAnalyzer {
    constructor() {
        this.analyses = new Map();
        this.isAnalyzing = false;
        this.currentPageAnalysis = null;
        this.settings = {
            autoAnalyze: true,
            summaryLength: 'medium', // short, medium, long
            includeKeyPoints: true,
            includeActionItems: true,
            analysisTypes: ['summary', 'keypoints', 'actionitems', 'insights']
        };
        
        this.init();
    }

    async init() {
        await this.loadSettings();
        this.setupMessageHandlers();
        
        // Auto-analyze current page if enabled
        if (this.settings.autoAnalyze) {
            this.schedulePageAnalysis();
        }
    }

    setupMessageHandlers() {
        // Listen for messages from background script
        browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
            switch (message.type) {
                case 'ANALYZE_PAGE':
                    this.analyzePage(message.options).then(sendResponse);
                    return true;
                case 'GET_PAGE_ANALYSIS':
                    sendResponse({ success: true, analysis: this.currentPageAnalysis });
                    return false;
                case 'UPDATE_ANALYZER_SETTINGS':
                    this.updateSettings(message.settings).then(sendResponse);
                    return true;
            }
        });
    }

    async loadSettings() {
        try {
            const result = await browser.storage.local.get('contentAnalyzerSettings');
            if (result.contentAnalyzerSettings) {
                this.settings = { ...this.settings, ...result.contentAnalyzerSettings };
            }
        } catch (error) {
            console.error('Error loading analyzer settings:', error);
        }
    }

    async saveSettings() {
        try {
            await browser.storage.local.set({
                contentAnalyzerSettings: this.settings
            });
        } catch (error) {
            console.error('Error saving analyzer settings:', error);
        }
    }

    async updateSettings(newSettings) {
        this.settings = { ...this.settings, ...newSettings };
        await this.saveSettings();
        return { success: true };
    }

    schedulePageAnalysis() {
        // Wait for page to be fully loaded
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                setTimeout(() => this.autoAnalyzePage(), 2000);
            });
        } else {
            setTimeout(() => this.autoAnalyzePage(), 2000);
        }
    }

    async autoAnalyzePage() {
        if (!this.settings.autoAnalyze || this.isAnalyzing) return;
        
        try {
            const analysis = await this.analyzePage({
                types: this.settings.analysisTypes,
                summaryLength: this.settings.summaryLength
            });
            
            if (analysis.success) {
                this.currentPageAnalysis = analysis.analysis;
                
                // Notify background script
                browser.runtime.sendMessage({
                    type: 'PAGE_ANALYSIS_COMPLETE',
                    analysis: analysis.analysis,
                    url: window.location.href
                });
            }
        } catch (error) {
            console.error('Auto-analysis failed:', error);
        }
    }

    async analyzePage(options = {}) {
        if (this.isAnalyzing) {
            return { success: false, error: 'Analysis already in progress' };
        }

        this.isAnalyzing = true;
        
        try {
            const pageContent = this.extractPageContent();
            const analysis = await this.performAnalysis(pageContent, options);
            
            this.isAnalyzing = false;
            return { success: true, analysis };
        } catch (error) {
            this.isAnalyzing = false;
            console.error('Page analysis failed:', error);
            return { success: false, error: error.message };
        }
    }

    extractPageContent() {
        const content = {
            title: document.title,
            url: window.location.href,
            domain: window.location.hostname,
            timestamp: new Date().toISOString(),
            wordCount: 0,
            readingTime: 0,
            contentType: this.detectContentType(),
            metadata: this.extractMetadata(),
            mainContent: '',
            headings: [],
            links: [],
            images: [],
            tables: [],
            lists: []
        };

        // Extract main content
        content.mainContent = this.extractMainText();
        content.wordCount = this.countWords(content.mainContent);
        content.readingTime = Math.ceil(content.wordCount / 200); // ~200 words per minute

        // Extract structural elements
        content.headings = this.extractHeadings();
        content.links = this.extractLinks();
        content.images = this.extractImages();
        content.tables = this.extractTables();
        content.lists = this.extractLists();

        return content;
    }

    extractMainText() {
        // Remove script, style, and other non-content elements
        const elementsToRemove = ['script', 'style', 'nav', 'header', 'footer', 'aside', 'advertisement'];
        const clonedDoc = document.cloneNode(true);
        
        elementsToRemove.forEach(tag => {
            const elements = clonedDoc.querySelectorAll(tag);
            elements.forEach(el => el.remove());
        });

        // Try to find main content area
        let mainContent = '';
        const contentSelectors = [
            'main',
            'article',
            '[role="main"]',
            '.content',
            '.main-content',
            '.post-content',
            '.entry-content',
            '#content',
            '#main'
        ];

        for (const selector of contentSelectors) {
            const element = clonedDoc.querySelector(selector);
            if (element) {
                mainContent = element.textContent || element.innerText || '';
                break;
            }
        }

        // Fallback to body content if no main content found
        if (!mainContent) {
            mainContent = clonedDoc.body?.textContent || clonedDoc.body?.innerText || '';
        }

        // Clean up the text
        return mainContent
            .replace(/\s+/g, ' ')
            .replace(/\n\s*\n/g, '\n')
            .trim();
    }

    extractMetadata() {
        const metadata = {};
        
        // Meta tags
        const metaTags = document.querySelectorAll('meta');
        metaTags.forEach(tag => {
            const name = tag.getAttribute('name') || tag.getAttribute('property');
            const content = tag.getAttribute('content');
            if (name && content) {
                metadata[name] = content;
            }
        });

        // JSON-LD structured data
        const jsonLdScripts = document.querySelectorAll('script[type="application/ld+json"]');
        jsonLdScripts.forEach((script, index) => {
            try {
                const data = JSON.parse(script.textContent);
                metadata[`jsonLd_${index}`] = data;
            } catch (error) {
                // Ignore invalid JSON-LD
            }
        });

        return metadata;
    }

    extractHeadings() {
        const headings = [];
        const headingElements = document.querySelectorAll('h1, h2, h3, h4, h5, h6');
        
        headingElements.forEach(heading => {
            headings.push({
                level: parseInt(heading.tagName.charAt(1)),
                text: heading.textContent.trim(),
                id: heading.id || null
            });
        });

        return headings;
    }

    extractLinks() {
        const links = [];
        const linkElements = document.querySelectorAll('a[href]');
        
        linkElements.forEach(link => {
            const href = link.getAttribute('href');
            if (href && !href.startsWith('#')) {
                links.push({
                    text: link.textContent.trim(),
                    url: new URL(href, window.location.href).href,
                    isExternal: !href.startsWith('/') && !href.includes(window.location.hostname)
                });
            }
        });

        return links.slice(0, 50); // Limit to first 50 links
    }

    extractImages() {
        const images = [];
        const imgElements = document.querySelectorAll('img[src]');
        
        imgElements.forEach(img => {
            images.push({
                src: new URL(img.src, window.location.href).href,
                alt: img.alt || '',
                title: img.title || ''
            });
        });

        return images.slice(0, 20); // Limit to first 20 images
    }

    extractTables() {
        const tables = [];
        const tableElements = document.querySelectorAll('table');
        
        tableElements.forEach((table, index) => {
            const rows = table.querySelectorAll('tr');
            if (rows.length > 0) {
                tables.push({
                    index,
                    rowCount: rows.length,
                    columnCount: rows[0]?.querySelectorAll('td, th').length || 0,
                    caption: table.querySelector('caption')?.textContent.trim() || null
                });
            }
        });

        return tables;
    }

    extractLists() {
        const lists = [];
        const listElements = document.querySelectorAll('ul, ol');
        
        listElements.forEach((list, index) => {
            const items = list.querySelectorAll('li');
            lists.push({
                index,
                type: list.tagName.toLowerCase(),
                itemCount: items.length,
                items: Array.from(items).slice(0, 10).map(item => item.textContent.trim())
            });
        });

        return lists;
    }

    detectContentType() {
        const url = window.location.href.toLowerCase();
        const title = document.title.toLowerCase();
        const content = document.body.textContent.toLowerCase();

        // Check for academic papers
        if (content.includes('abstract') && content.includes('references') && 
            (content.includes('doi:') || content.includes('arxiv'))) {
            return 'academic_paper';
        }

        // Check for news articles
        if (url.includes('/news/') || url.includes('/article/') ||
            document.querySelector('time, .date, .published')) {
            return 'news_article';
        }

        // Check for blog posts
        if (url.includes('/blog/') || url.includes('/post/') ||
            document.querySelector('.blog, .post, article')) {
            return 'blog_post';
        }

        // Check for documentation
        if (url.includes('/docs/') || url.includes('/documentation/') ||
            title.includes('documentation') || title.includes('api')) {
            return 'documentation';
        }

        // Check for product pages
        if (content.includes('add to cart') || content.includes('buy now') ||
            document.querySelector('.price, .product')) {
            return 'product_page';
        }

        return 'general_webpage';
    }

    countWords(text) {
        return text.split(/\s+/).filter(word => word.length > 0).length;
    }

    async performAnalysis(pageContent, options = {}) {
        const analysisTypes = options.types || this.settings.analysisTypes;
        const summaryLength = options.summaryLength || this.settings.summaryLength;
        
        const analysis = {
            id: this.generateId(),
            timestamp: new Date().toISOString(),
            url: pageContent.url,
            title: pageContent.title,
            contentType: pageContent.contentType,
            wordCount: pageContent.wordCount,
            readingTime: pageContent.readingTime,
            summary: null,
            keyPoints: [],
            actionItems: [],
            insights: [],
            sentiment: null,
            topics: [],
            entities: [],
            readabilityScore: null
        };

        // Generate AI-powered analysis
        if (analysisTypes.includes('summary')) {
            analysis.summary = await this.generateSummary(pageContent, summaryLength);
        }

        if (analysisTypes.includes('keypoints')) {
            analysis.keyPoints = await this.extractKeyPoints(pageContent);
        }

        if (analysisTypes.includes('actionitems')) {
            analysis.actionItems = await this.generateActionItems(pageContent);
        }

        if (analysisTypes.includes('insights')) {
            analysis.insights = await this.extractInsights(pageContent);
        }

        // Additional analysis
        analysis.sentiment = this.analyzeSentiment(pageContent.mainContent);
        analysis.topics = this.extractTopics(pageContent.mainContent);
        analysis.entities = this.extractEntities(pageContent.mainContent);
        analysis.readabilityScore = this.calculateReadability(pageContent.mainContent);

        return analysis;
    }

    async generateSummary(pageContent, length = 'medium') {
        const lengthInstructions = {
            short: 'in 2-3 sentences',
            medium: 'in 1-2 paragraphs',
            long: 'in 3-4 paragraphs with detailed analysis'
        };

        const prompt = `Please provide a comprehensive summary of the following web content ${lengthInstructions[length]}. Focus on the main points, key information, and overall purpose of the content.

Title: ${pageContent.title}
Content Type: ${pageContent.contentType}
Word Count: ${pageContent.wordCount}

Content:
${pageContent.mainContent.substring(0, 4000)}

Summary:`;

        try {
            const response = await this.callLMStudio(prompt);
            return response.trim();
        } catch (error) {
            console.error('Failed to generate AI summary:', error);
            return this.generateFallbackSummary(pageContent);
        }
    }

    async extractKeyPoints(pageContent) {
        const prompt = `Extract the most important key points from the following web content. Return 5-8 key points as a bulleted list.

Title: ${pageContent.title}
Content:
${pageContent.mainContent.substring(0, 4000)}

Key Points:`;

        try {
            const response = await this.callLMStudio(prompt);
            return this.parseListResponse(response);
        } catch (error) {
            console.error('Failed to extract key points:', error);
            return this.extractFallbackKeyPoints(pageContent);
        }
    }

    async generateActionItems(pageContent) {
        const prompt = `Based on the following web content, generate specific actionable items or next steps that a reader might take. Focus on practical, concrete actions.

Title: ${pageContent.title}
Content Type: ${pageContent.contentType}
Content:
${pageContent.mainContent.substring(0, 4000)}

Action Items:`;

        try {
            const response = await this.callLMStudio(prompt);
            return this.parseListResponse(response);
        } catch (error) {
            console.error('Failed to generate action items:', error);
            return [];
        }
    }

    async extractInsights(pageContent) {
        const prompt = `Analyze the following web content and provide valuable insights, implications, or deeper understanding that might not be immediately obvious to readers.

Title: ${pageContent.title}
Content:
${pageContent.mainContent.substring(0, 4000)}

Insights:`;

        try {
            const response = await this.callLMStudio(prompt);
            return this.parseListResponse(response);
        } catch (error) {
            console.error('Failed to extract insights:', error);
            return [];
        }
    }

    async callLMStudio(prompt) {
        const response = await fetch('http://localhost:1234/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: 'local-model',
                messages: [
                    {
                        role: 'user',
                        content: prompt
                    }
                ],
                temperature: 0.7,
                max_tokens: 1000
            })
        });

        if (!response.ok) {
            throw new Error(`LM Studio API error: ${response.status}`);
        }

        const data = await response.json();
        return data.choices[0].message.content;
    }

    parseListResponse(response) {
        return response
            .split('\n')
            .map(line => line.trim())
            .filter(line => line.length > 0)
            .map(line => line.replace(/^[-•*]\s*/, ''))
            .filter(line => line.length > 0);
    }

    generateFallbackSummary(pageContent) {
        const sentences = pageContent.mainContent.split(/[.!?]+/).filter(s => s.trim().length > 20);
        const firstSentences = sentences.slice(0, 3).join('. ');
        return firstSentences + (firstSentences.endsWith('.') ? '' : '.');
    }

    extractFallbackKeyPoints(pageContent) {
        const points = [];
        
        // Extract from headings
        pageContent.headings.forEach(heading => {
            if (heading.level <= 3 && heading.text.length > 10) {
                points.push(heading.text);
            }
        });

        // Extract from list items
        pageContent.lists.forEach(list => {
            list.items.forEach(item => {
                if (item.length > 20 && item.length < 200) {
                    points.push(item);
                }
            });
        });

        return points.slice(0, 8);
    }

    analyzeSentiment(text) {
        // Simple sentiment analysis based on keyword matching
        const positiveWords = ['good', 'great', 'excellent', 'amazing', 'wonderful', 'fantastic', 'positive', 'beneficial', 'successful', 'effective'];
        const negativeWords = ['bad', 'terrible', 'awful', 'horrible', 'negative', 'problem', 'issue', 'fail', 'error', 'difficult'];
        
        const words = text.toLowerCase().split(/\s+/);
        const positiveCount = words.filter(word => positiveWords.includes(word)).length;
        const negativeCount = words.filter(word => negativeWords.includes(word)).length;
        
        if (positiveCount > negativeCount) return 'positive';
        if (negativeCount > positiveCount) return 'negative';
        return 'neutral';
    }

    extractTopics(text) {
        // Simple topic extraction based on word frequency
        const words = text.toLowerCase()
            .replace(/[^\w\s]/g, '')
            .split(/\s+/)
            .filter(word => word.length > 4);
        
        const wordCount = {};
        words.forEach(word => {
            wordCount[word] = (wordCount[word] || 0) + 1;
        });
        
        return Object.entries(wordCount)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 10)
            .map(([word]) => word);
    }

    extractEntities(text) {
        // Simple named entity extraction
        const entities = [];
        
        // Extract potential names (capitalized words)
        const capitalizedWords = text.match(/\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\b/g) || [];
        entities.push(...capitalizedWords.slice(0, 10));
        
        // Extract dates
        const dates = text.match(/\b\d{1,2}\/\d{1,2}\/\d{4}\b|\b\d{4}-\d{2}-\d{2}\b/g) || [];
        entities.push(...dates);
        
        // Extract URLs
        const urls = text.match(/https?:\/\/[^\s]+/g) || [];
        entities.push(...urls.slice(0, 5));
        
        return [...new Set(entities)]; // Remove duplicates
    }

    calculateReadability(text) {
        // Simple readability score based on sentence and word length
        const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
        const words = text.split(/\s+/).filter(w => w.length > 0);
        
        if (sentences.length === 0 || words.length === 0) return 0;
        
        const avgWordsPerSentence = words.length / sentences.length;
        const avgCharsPerWord = text.replace(/\s/g, '').length / words.length;
        
        // Simple scoring: lower is more readable
        const score = Math.max(0, 100 - (avgWordsPerSentence * 2) - (avgCharsPerWord * 5));
        return Math.round(score);
    }

    generateId() {
        return 'analysis_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }
}

// Initialize content analyzer
let contentAnalyzer;
if (typeof window !== 'undefined') {
    contentAnalyzer = new ContentAnalyzer();
}
