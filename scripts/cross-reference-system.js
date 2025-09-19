/**
 * LM Studio Extension - Cross-Reference Information System
 * Compares and validates information across multiple sources
 */

class CrossReferenceSystem {
    constructor() {
        this.sources = new Map();
        this.crossReferences = new Map();
        this.storage = browser.storage.local;
        this.searchAPIs = {
            duckduckgo: 'https://api.duckduckgo.com/',
            wikipedia: 'https://en.wikipedia.org/api/rest_v1/',
            news: 'https://newsapi.org/v2/'
        };
        
        this.init();
    }

    async init() {
        try {
            await this.loadCrossReferences();
            console.log('✅ Cross-Reference System initialized');
        } catch (error) {
            console.error('❌ Failed to initialize Cross-Reference System:', error);
        }
    }

    /**
     * Create a new cross-reference analysis
     */
    async createCrossReference(config) {
        const crossRef = {
            id: this.generateCrossRefId(),
            query: config.query,
            sources: config.sources || [],
            createdAt: new Date().toISOString(),
            status: 'pending',
            results: [],
            analysis: null,
            confidence: 0,
            contradictions: [],
            consensus: null
        };

        this.crossReferences.set(crossRef.id, crossRef);
        await this.saveCrossReferences();

        console.log(`🔍 Created cross-reference analysis: ${crossRef.query} (${crossRef.id})`);
        return crossRef;
    }

    /**
     * Execute cross-reference analysis
     */
    async executeCrossReference(crossRefId) {
        const crossRef = this.crossReferences.get(crossRefId);
        if (!crossRef) throw new Error('Cross-reference not found');

        try {
            console.log(`🚀 Executing cross-reference: ${crossRef.query}`);
            crossRef.status = 'running';

            // Collect information from multiple sources
            const sourceResults = await this.collectFromSources(crossRef.query, crossRef.sources);
            crossRef.results = sourceResults;

            // Analyze for consistency and contradictions
            const analysis = await this.analyzeConsistency(sourceResults, crossRef.query);
            crossRef.analysis = analysis;
            crossRef.confidence = analysis.confidence;
            crossRef.contradictions = analysis.contradictions;
            crossRef.consensus = analysis.consensus;

            crossRef.status = 'completed';
            crossRef.completedAt = new Date().toISOString();

            await this.saveCrossReferences();

            console.log(`✅ Cross-reference completed with ${crossRef.confidence}% confidence`);
            return crossRef;

        } catch (error) {
            crossRef.status = 'failed';
            crossRef.error = error.message;
            await this.saveCrossReferences();
            throw error;
        }
    }

    /**
     * Collect information from multiple sources
     */
    async collectFromSources(query, sources) {
        const results = [];

        // Default sources if none specified
        if (!sources || sources.length === 0) {
            sources = ['web_search', 'wikipedia', 'current_page'];
        }

        for (const source of sources) {
            try {
                const sourceResult = await this.collectFromSource(query, source);
                if (sourceResult) {
                    results.push(sourceResult);
                }
            } catch (error) {
                console.warn(`Failed to collect from ${source}:`, error);
                results.push({
                    source: source,
                    error: error.message,
                    content: null,
                    timestamp: new Date().toISOString()
                });
            }
        }

        return results;
    }

    /**
     * Collect from a single source
     */
    async collectFromSource(query, source) {
        switch (source) {
            case 'web_search':
                return await this.searchWeb(query);
            case 'wikipedia':
                return await this.searchWikipedia(query);
            case 'current_page':
                return await this.extractFromCurrentPage(query);
            case 'news':
                return await this.searchNews(query);
            default:
                if (source.startsWith('http')) {
                    return await this.extractFromURL(query, source);
                }
                throw new Error(`Unknown source: ${source}`);
        }
    }

    /**
     * Search the web for information
     */
    async searchWeb(query) {
        try {
            // Use the existing search functionality from the extension
            const response = await browser.runtime.sendMessage({
                action: 'searchInternet',
                query: query
            });

            if (response && response.results) {
                return {
                    source: 'web_search',
                    query: query,
                    content: response.results.map(r => ({
                        title: r.title,
                        snippet: r.snippet,
                        url: r.url,
                        relevance: r.relevance || 0.5
                    })),
                    timestamp: new Date().toISOString(),
                    confidence: 0.7
                };
            }
        } catch (error) {
            console.error('Web search failed:', error);
        }
        return null;
    }

    /**
     * Search Wikipedia for information
     */
    async searchWikipedia(query) {
        try {
            const searchUrl = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(query)}`;
            const response = await fetch(searchUrl);
            
            if (response.ok) {
                const data = await response.json();
                return {
                    source: 'wikipedia',
                    query: query,
                    content: {
                        title: data.title,
                        extract: data.extract,
                        url: data.content_urls?.desktop?.page,
                        thumbnail: data.thumbnail?.source
                    },
                    timestamp: new Date().toISOString(),
                    confidence: 0.9
                };
            }
        } catch (error) {
            console.error('Wikipedia search failed:', error);
        }
        return null;
    }

    /**
     * Extract information from current page
     */
    async extractFromCurrentPage(query) {
        try {
            const tabs = await browser.tabs.query({ active: true, currentWindow: true });
            if (tabs.length === 0) return null;

            const response = await browser.tabs.sendMessage(tabs[0].id, {
                type: 'EXTRACT_RELEVANT_CONTENT',
                query: query
            });

            if (response && response.success) {
                return {
                    source: 'current_page',
                    query: query,
                    content: {
                        title: response.title,
                        text: response.text,
                        url: tabs[0].url,
                        relevantSections: response.relevantSections
                    },
                    timestamp: new Date().toISOString(),
                    confidence: 0.8
                };
            }
        } catch (error) {
            console.error('Current page extraction failed:', error);
        }
        return null;
    }

    /**
     * Search news sources
     */
    async searchNews(query) {
        try {
            // This would require a news API key - for now, return placeholder
            return {
                source: 'news',
                query: query,
                content: {
                    articles: [],
                    note: 'News API integration requires API key'
                },
                timestamp: new Date().toISOString(),
                confidence: 0.6
            };
        } catch (error) {
            console.error('News search failed:', error);
        }
        return null;
    }

    /**
     * Extract information from specific URL
     */
    async extractFromURL(query, url) {
        try {
            // Create a new tab to extract content
            const tab = await browser.tabs.create({ url: url, active: false });
            
            // Wait for page to load
            await this.waitForPageLoad(tab.id);
            await this.sleep(3000);

            const response = await browser.tabs.sendMessage(tab.id, {
                type: 'EXTRACT_RELEVANT_CONTENT',
                query: query
            });

            // Close the tab
            await browser.tabs.remove(tab.id);

            if (response && response.success) {
                return {
                    source: url,
                    query: query,
                    content: {
                        title: response.title,
                        text: response.text,
                        url: url,
                        relevantSections: response.relevantSections
                    },
                    timestamp: new Date().toISOString(),
                    confidence: 0.7
                };
            }
        } catch (error) {
            console.error(`URL extraction failed for ${url}:`, error);
        }
        return null;
    }

    /**
     * Analyze consistency across sources
     */
    async analyzeConsistency(sourceResults, query) {
        try {
            // Prepare data for AI analysis
            const sourceData = sourceResults
                .filter(r => r.content && !r.error)
                .map(r => ({
                    source: r.source,
                    content: this.extractTextContent(r.content),
                    confidence: r.confidence || 0.5
                }));

            if (sourceData.length === 0) {
                return {
                    confidence: 0,
                    consensus: null,
                    contradictions: [],
                    analysis: 'No valid sources found'
                };
            }

            // Use LM Studio for analysis
            const analysisPrompt = `
Analyze the following information from multiple sources about "${query}".
Identify:
1. Points of consensus (what sources agree on)
2. Contradictions (where sources disagree)
3. Overall confidence level (0-100%)
4. Most reliable information

Sources:
${sourceData.map((s, i) => `
Source ${i + 1} (${s.source}):
${s.content}
`).join('\n')}

Provide analysis in JSON format:
{
    "consensus": "main agreed-upon facts",
    "contradictions": ["list of contradictory points"],
    "confidence": number,
    "analysis": "detailed analysis",
    "mostReliable": "which source seems most reliable and why"
}`;

            const response = await fetch('http://localhost:1234/v1/chat/completions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    messages: [
                        { role: 'system', content: 'You are an expert fact-checker and information analyst.' },
                        { role: 'user', content: analysisPrompt }
                    ],
                    temperature: 0.3,
                    max_tokens: 1500
                })
            });

            const result = await response.json();
            const analysisText = result.choices[0].message.content;

            // Try to parse JSON response
            try {
                const analysis = JSON.parse(analysisText);
                return {
                    confidence: analysis.confidence || 50,
                    consensus: analysis.consensus,
                    contradictions: analysis.contradictions || [],
                    analysis: analysis.analysis,
                    mostReliable: analysis.mostReliable,
                    rawAnalysis: analysisText
                };
            } catch (parseError) {
                // If JSON parsing fails, return raw analysis
                return {
                    confidence: 50,
                    consensus: null,
                    contradictions: [],
                    analysis: analysisText,
                    mostReliable: null,
                    rawAnalysis: analysisText
                };
            }

        } catch (error) {
            console.error('AI analysis failed:', error);
            return {
                confidence: 0,
                consensus: null,
                contradictions: [],
                analysis: `Analysis failed: ${error.message}`,
                error: error.message
            };
        }
    }

    /**
     * Extract text content from various content formats
     */
    extractTextContent(content) {
        if (typeof content === 'string') {
            return content;
        }

        if (Array.isArray(content)) {
            return content.map(item => 
                typeof item === 'string' ? item : 
                item.snippet || item.extract || item.text || JSON.stringify(item)
            ).join('\n');
        }

        if (content.extract) return content.extract;
        if (content.text) return content.text;
        if (content.snippet) return content.snippet;
        if (content.articles) {
            return content.articles.map(a => a.title + ': ' + a.description).join('\n');
        }

        return JSON.stringify(content);
    }

    /**
     * Get cross-reference by ID
     */
    getCrossReference(crossRefId) {
        return this.crossReferences.get(crossRefId);
    }

    /**
     * Get all cross-references
     */
    getAllCrossReferences() {
        return Array.from(this.crossReferences.values());
    }

    /**
     * Delete cross-reference
     */
    async deleteCrossReference(crossRefId) {
        this.crossReferences.delete(crossRefId);
        await this.saveCrossReferences();
    }

    /**
     * Utility methods
     */
    async waitForPageLoad(tabId) {
        return new Promise((resolve) => {
            const listener = (changedTabId, changeInfo) => {
                if (changedTabId === tabId && changeInfo.status === 'complete') {
                    browser.tabs.onUpdated.removeListener(listener);
                    resolve();
                }
            };
            browser.tabs.onUpdated.addListener(listener);
        });
    }

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Storage methods
     */
    async loadCrossReferences() {
        try {
            const result = await this.storage.get('cross_references');
            if (result.cross_references) {
                const crossRefs = JSON.parse(result.cross_references);
                crossRefs.forEach(crossRef => this.crossReferences.set(crossRef.id, crossRef));
            }
        } catch (error) {
            console.error('Failed to load cross-references:', error);
        }
    }

    async saveCrossReferences() {
        try {
            const crossRefs = Array.from(this.crossReferences.values());
            await this.storage.set({ cross_references: JSON.stringify(crossRefs) });
        } catch (error) {
            console.error('Failed to save cross-references:', error);
        }
    }

    generateCrossRefId() {
        return 'crossref_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }
}

// Export for use in background script
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CrossReferenceSystem;
}
