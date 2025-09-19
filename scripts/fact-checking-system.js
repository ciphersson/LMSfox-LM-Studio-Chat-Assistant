/**
 * LM Studio Extension - Fact-Checking System with Source Verification
 * Automatically verifies claims against reliable sources
 */

class FactCheckingSystem {
    constructor() {
        this.factChecks = new Map();
        this.storage = browser.storage.local;
        this.reliableSources = [
            'wikipedia.org',
            'snopes.com',
            'factcheck.org',
            'politifact.com',
            'reuters.com',
            'apnews.com',
            'bbc.com',
            'nature.com',
            'science.org',
            'ncbi.nlm.nih.gov'
        ];
        this.crossReferenceSystem = null; // Will be injected
        
        this.init();
    }

    async init() {
        try {
            await this.loadFactChecks();
            console.log('✅ Fact-Checking System initialized');
        } catch (error) {
            console.error('❌ Failed to initialize Fact-Checking System:', error);
        }
    }

    /**
     * Set cross-reference system for integration
     */
    setCrossReferenceSystem(crossRefSystem) {
        this.crossReferenceSystem = crossRefSystem;
    }

    /**
     * Create a new fact-check analysis
     */
    async createFactCheck(config) {
        const factCheck = {
            id: this.generateFactCheckId(),
            claim: config.claim,
            context: config.context || '',
            sources: config.sources || this.getDefaultSources(),
            createdAt: new Date().toISOString(),
            status: 'pending',
            verificationLevel: 'unverified',
            evidence: [],
            verdict: null,
            confidence: 0,
            reliableSourcesCount: 0,
            contradictoryEvidence: [],
            supportingEvidence: [],
            metadata: config.metadata || {}
        };

        this.factChecks.set(factCheck.id, factCheck);
        await this.saveFactChecks();

        console.log(`🔍 Created fact-check: ${factCheck.claim.substring(0, 50)}... (${factCheck.id})`);
        return factCheck;
    }

    /**
     * Execute fact-checking analysis
     */
    async executeFactCheck(factCheckId) {
        const factCheck = this.factChecks.get(factCheckId);
        if (!factCheck) throw new Error('Fact-check not found');

        try {
            console.log(`🚀 Executing fact-check: ${factCheck.claim}`);
            factCheck.status = 'running';

            // Step 1: Collect evidence from sources
            const evidence = await this.collectEvidence(factCheck.claim, factCheck.sources);
            factCheck.evidence = evidence;

            // Step 2: Verify sources reliability
            const verifiedEvidence = await this.verifySourceReliability(evidence);
            factCheck.reliableSourcesCount = verifiedEvidence.filter(e => e.reliable).length;

            // Step 3: Analyze evidence for support/contradiction
            const analysis = await this.analyzeEvidence(factCheck.claim, verifiedEvidence);
            factCheck.supportingEvidence = analysis.supporting;
            factCheck.contradictoryEvidence = analysis.contradictory;

            // Step 4: Generate verdict and confidence
            const verdict = await this.generateVerdict(factCheck.claim, analysis);
            factCheck.verdict = verdict.verdict;
            factCheck.confidence = verdict.confidence;
            factCheck.verificationLevel = this.determineVerificationLevel(verdict.confidence, factCheck.reliableSourcesCount);

            factCheck.status = 'completed';
            factCheck.completedAt = new Date().toISOString();

            await this.saveFactChecks();

            console.log(`✅ Fact-check completed: ${factCheck.verdict} (${factCheck.confidence}% confidence)`);
            return factCheck;

        } catch (error) {
            factCheck.status = 'failed';
            factCheck.error = error.message;
            await this.saveFactChecks();
            throw error;
        }
    }

    /**
     * Collect evidence from multiple sources
     */
    async collectEvidence(claim, sources) {
        const evidence = [];

        for (const source of sources) {
            try {
                const sourceEvidence = await this.collectFromSource(claim, source);
                if (sourceEvidence) {
                    evidence.push(sourceEvidence);
                }
            } catch (error) {
                console.warn(`Failed to collect evidence from ${source}:`, error);
                evidence.push({
                    source: source,
                    error: error.message,
                    content: null,
                    timestamp: new Date().toISOString(),
                    reliable: false
                });
            }
        }

        return evidence;
    }

    /**
     * Collect evidence from a single source
     */
    async collectFromSource(claim, source) {
        // Use cross-reference system if available
        if (this.crossReferenceSystem) {
            return await this.crossReferenceSystem.collectFromSource(claim, source);
        }

        // Fallback implementation
        switch (source) {
            case 'web_search':
                return await this.searchWeb(claim);
            case 'wikipedia':
                return await this.searchWikipedia(claim);
            case 'fact_check_sites':
                return await this.searchFactCheckSites(claim);
            case 'academic':
                return await this.searchAcademic(claim);
            default:
                if (source.startsWith('http')) {
                    return await this.extractFromURL(claim, source);
                }
                throw new Error(`Unknown source: ${source}`);
        }
    }

    /**
     * Search dedicated fact-checking websites
     */
    async searchFactCheckSites(claim) {
        const factCheckSites = [
            'snopes.com',
            'factcheck.org',
            'politifact.com'
        ];

        const results = [];
        
        for (const site of factCheckSites) {
            try {
                // Use site-specific search
                const searchQuery = `site:${site} ${claim}`;
                const response = await browser.runtime.sendMessage({
                    action: 'searchInternet',
                    query: searchQuery
                });

                if (response && response.results && response.results.length > 0) {
                    results.push(...response.results.map(r => ({
                        title: r.title,
                        snippet: r.snippet,
                        url: r.url,
                        site: site,
                        relevance: r.relevance || 0.5
                    })));
                }
            } catch (error) {
                console.warn(`Failed to search ${site}:`, error);
            }
        }

        return {
            source: 'fact_check_sites',
            query: claim,
            content: results,
            timestamp: new Date().toISOString(),
            confidence: 0.9 // Fact-check sites are highly reliable
        };
    }

    /**
     * Search academic sources
     */
    async searchAcademic(claim) {
        try {
            // Search for academic papers and studies
            const academicQuery = `${claim} site:ncbi.nlm.nih.gov OR site:nature.com OR site:science.org`;
            const response = await browser.runtime.sendMessage({
                action: 'searchInternet',
                query: academicQuery
            });

            if (response && response.results) {
                return {
                    source: 'academic',
                    query: claim,
                    content: response.results.map(r => ({
                        title: r.title,
                        snippet: r.snippet,
                        url: r.url,
                        relevance: r.relevance || 0.5
                    })),
                    timestamp: new Date().toISOString(),
                    confidence: 0.95 // Academic sources are very reliable
                };
            }
        } catch (error) {
            console.error('Academic search failed:', error);
        }
        return null;
    }

    /**
     * Search the web for information
     */
    async searchWeb(claim) {
        try {
            const response = await browser.runtime.sendMessage({
                action: 'searchInternet',
                query: claim
            });

            if (response && response.results) {
                return {
                    source: 'web_search',
                    query: claim,
                    content: response.results.map(r => ({
                        title: r.title,
                        snippet: r.snippet,
                        url: r.url,
                        relevance: r.relevance || 0.5
                    })),
                    timestamp: new Date().toISOString(),
                    confidence: 0.6 // General web search is less reliable
                };
            }
        } catch (error) {
            console.error('Web search failed:', error);
        }
        return null;
    }

    /**
     * Search Wikipedia
     */
    async searchWikipedia(claim) {
        try {
            const searchUrl = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(claim)}`;
            const response = await fetch(searchUrl);
            
            if (response.ok) {
                const data = await response.json();
                return {
                    source: 'wikipedia',
                    query: claim,
                    content: {
                        title: data.title,
                        extract: data.extract,
                        url: data.content_urls?.desktop?.page,
                        thumbnail: data.thumbnail?.source
                    },
                    timestamp: new Date().toISOString(),
                    confidence: 0.85 // Wikipedia is generally reliable
                };
            }
        } catch (error) {
            console.error('Wikipedia search failed:', error);
        }
        return null;
    }

    /**
     * Extract information from specific URL
     */
    async extractFromURL(claim, url) {
        try {
            const tab = await browser.tabs.create({ url: url, active: false });
            
            await this.waitForPageLoad(tab.id);
            await this.sleep(3000);

            const response = await browser.tabs.sendMessage(tab.id, {
                type: 'EXTRACT_RELEVANT_CONTENT',
                query: claim
            });

            await browser.tabs.remove(tab.id);

            if (response && response.success) {
                return {
                    source: url,
                    query: claim,
                    content: {
                        title: response.title,
                        text: response.text,
                        url: url,
                        relevantSections: response.relevantSections
                    },
                    timestamp: new Date().toISOString(),
                    confidence: this.assessSourceReliability(url)
                };
            }
        } catch (error) {
            console.error(`URL extraction failed for ${url}:`, error);
        }
        return null;
    }

    /**
     * Verify source reliability
     */
    async verifySourceReliability(evidence) {
        return evidence.map(item => {
            if (item.error) {
                return { ...item, reliable: false, reliabilityScore: 0 };
            }

            const reliabilityScore = this.calculateReliabilityScore(item);
            const reliable = reliabilityScore >= 0.6;

            return {
                ...item,
                reliable: reliable,
                reliabilityScore: reliabilityScore,
                reliabilityFactors: this.getReliabilityFactors(item)
            };
        });
    }

    /**
     * Calculate reliability score for a source
     */
    calculateReliabilityScore(evidence) {
        let score = 0.5; // Base score

        // Check if source is in reliable sources list
        if (evidence.source && typeof evidence.source === 'string') {
            const isReliableSource = this.reliableSources.some(reliable => 
                evidence.source.includes(reliable) || 
                (evidence.content && evidence.content.url && evidence.content.url.includes(reliable))
            );
            
            if (isReliableSource) {
                score += 0.3;
            }
        }

        // Check content quality
        if (evidence.content) {
            if (Array.isArray(evidence.content)) {
                // Multiple results suggest comprehensive coverage
                score += Math.min(evidence.content.length * 0.05, 0.2);
            } else if (evidence.content.extract || evidence.content.text) {
                // Has substantial content
                const contentLength = (evidence.content.extract || evidence.content.text || '').length;
                score += Math.min(contentLength / 1000 * 0.1, 0.2);
            }
        }

        // Source-specific bonuses
        switch (evidence.source) {
            case 'wikipedia':
                score += 0.2;
                break;
            case 'fact_check_sites':
                score += 0.3;
                break;
            case 'academic':
                score += 0.4;
                break;
            case 'web_search':
                score += 0.1;
                break;
        }

        return Math.min(score, 1.0);
    }

    /**
     * Get reliability factors for a source
     */
    getReliabilityFactors(evidence) {
        const factors = [];

        if (evidence.source === 'wikipedia') {
            factors.push('Peer-reviewed encyclopedia');
        }
        if (evidence.source === 'fact_check_sites') {
            factors.push('Dedicated fact-checking organization');
        }
        if (evidence.source === 'academic') {
            factors.push('Academic/scientific publication');
        }

        if (evidence.content && evidence.content.url) {
            const url = evidence.content.url;
            if (this.reliableSources.some(reliable => url.includes(reliable))) {
                factors.push('Recognized reliable source');
            }
            if (url.includes('https://')) {
                factors.push('Secure connection');
            }
        }

        return factors;
    }

    /**
     * Assess source reliability by URL
     */
    assessSourceReliability(url) {
        const isReliable = this.reliableSources.some(reliable => url.includes(reliable));
        return isReliable ? 0.8 : 0.5;
    }

    /**
     * Analyze evidence for support/contradiction
     */
    async analyzeEvidence(claim, evidence) {
        try {
            const reliableEvidence = evidence.filter(e => e.reliable);
            
            if (reliableEvidence.length === 0) {
                return {
                    supporting: [],
                    contradictory: [],
                    neutral: evidence
                };
            }

            // Prepare evidence for AI analysis
            const evidenceText = reliableEvidence.map(e => {
                const content = this.extractTextContent(e.content);
                return `Source: ${e.source} (Reliability: ${(e.reliabilityScore * 100).toFixed(0)}%)\nContent: ${content}`;
            }).join('\n\n');

            const analysisPrompt = `
Analyze the following evidence regarding the claim: "${claim}"

Categorize each piece of evidence as:
1. SUPPORTING - Evidence that supports or confirms the claim
2. CONTRADICTORY - Evidence that contradicts or refutes the claim  
3. NEUTRAL - Evidence that is related but neither supports nor contradicts

Evidence:
${evidenceText}

Provide analysis in JSON format:
{
    "supporting": [{"source": "source_name", "reason": "why it supports", "strength": "weak/moderate/strong"}],
    "contradictory": [{"source": "source_name", "reason": "why it contradicts", "strength": "weak/moderate/strong"}],
    "neutral": [{"source": "source_name", "reason": "why it's neutral"}]
}`;

            const response = await fetch('http://localhost:1234/v1/chat/completions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    messages: [
                        { role: 'system', content: 'You are an expert fact-checker and evidence analyst.' },
                        { role: 'user', content: analysisPrompt }
                    ],
                    temperature: 0.2,
                    max_tokens: 1500
                })
            });

            const result = await response.json();
            const analysisText = result.choices[0].message.content;

            try {
                const analysis = JSON.parse(analysisText);
                return {
                    supporting: analysis.supporting || [],
                    contradictory: analysis.contradictory || [],
                    neutral: analysis.neutral || []
                };
            } catch (parseError) {
                // Fallback to simple keyword analysis
                return this.fallbackEvidenceAnalysis(claim, reliableEvidence);
            }

        } catch (error) {
            console.error('Evidence analysis failed:', error);
            return this.fallbackEvidenceAnalysis(claim, evidence);
        }
    }

    /**
     * Fallback evidence analysis using keyword matching
     */
    fallbackEvidenceAnalysis(claim, evidence) {
        const claimWords = claim.toLowerCase().split(/\s+/);
        const supporting = [];
        const contradictory = [];
        const neutral = [];

        evidence.forEach(item => {
            const content = this.extractTextContent(item.content).toLowerCase();
            
            // Simple keyword matching
            const hasClaimWords = claimWords.some(word => content.includes(word));
            const hasNegativeWords = ['false', 'incorrect', 'debunked', 'myth', 'not true'].some(word => content.includes(word));
            const hasPositiveWords = ['true', 'correct', 'confirmed', 'verified', 'accurate'].some(word => content.includes(word));

            if (hasClaimWords && hasNegativeWords) {
                contradictory.push({
                    source: item.source,
                    reason: 'Contains negative indicators',
                    strength: 'moderate'
                });
            } else if (hasClaimWords && hasPositiveWords) {
                supporting.push({
                    source: item.source,
                    reason: 'Contains positive indicators',
                    strength: 'moderate'
                });
            } else {
                neutral.push({
                    source: item.source,
                    reason: 'No clear support or contradiction'
                });
            }
        });

        return { supporting, contradictory, neutral };
    }

    /**
     * Generate final verdict and confidence
     */
    async generateVerdict(claim, analysis) {
        try {
            const supportingCount = analysis.supporting.length;
            const contradictoryCount = analysis.contradictory.length;
            const totalEvidence = supportingCount + contradictoryCount;

            if (totalEvidence === 0) {
                return {
                    verdict: 'Insufficient Evidence',
                    confidence: 0,
                    reasoning: 'No reliable evidence found to support or contradict the claim.'
                };
            }

            // Calculate base confidence from evidence ratio
            let confidence = 0;
            let verdict = '';

            if (supportingCount > contradictoryCount) {
                const ratio = supportingCount / totalEvidence;
                confidence = Math.round(ratio * 100);
                
                if (confidence >= 80) {
                    verdict = 'Mostly True';
                } else if (confidence >= 60) {
                    verdict = 'Partially True';
                } else {
                    verdict = 'Mixed Evidence';
                }
            } else if (contradictoryCount > supportingCount) {
                const ratio = contradictoryCount / totalEvidence;
                confidence = Math.round(ratio * 100);
                
                if (confidence >= 80) {
                    verdict = 'Mostly False';
                } else if (confidence >= 60) {
                    verdict = 'Partially False';
                } else {
                    verdict = 'Mixed Evidence';
                }
            } else {
                verdict = 'Mixed Evidence';
                confidence = 50;
            }

            // Use AI for more nuanced verdict if available
            const aiVerdict = await this.getAIVerdict(claim, analysis);
            if (aiVerdict) {
                return aiVerdict;
            }

            return {
                verdict: verdict,
                confidence: confidence,
                reasoning: `Based on ${supportingCount} supporting and ${contradictoryCount} contradictory pieces of evidence.`
            };

        } catch (error) {
            console.error('Verdict generation failed:', error);
            return {
                verdict: 'Analysis Failed',
                confidence: 0,
                reasoning: 'Unable to generate verdict due to analysis error.'
            };
        }
    }

    /**
     * Get AI-generated verdict
     */
    async getAIVerdict(claim, analysis) {
        try {
            const verdictPrompt = `
Based on the evidence analysis for the claim: "${claim}"

Supporting evidence: ${analysis.supporting.length} pieces
Contradictory evidence: ${analysis.contradictory.length} pieces

Supporting details:
${analysis.supporting.map(s => `- ${s.source}: ${s.reason} (${s.strength})`).join('\n')}

Contradictory details:
${analysis.contradictory.map(c => `- ${c.source}: ${c.reason} (${c.strength})`).join('\n')}

Provide a final verdict in JSON format:
{
    "verdict": "True/Mostly True/Partially True/Mixed Evidence/Partially False/Mostly False/False",
    "confidence": number_0_to_100,
    "reasoning": "detailed explanation of the verdict"
}`;

            const response = await fetch('http://localhost:1234/v1/chat/completions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    messages: [
                        { role: 'system', content: 'You are an expert fact-checker. Provide balanced, evidence-based verdicts.' },
                        { role: 'user', content: verdictPrompt }
                    ],
                    temperature: 0.1,
                    max_tokens: 800
                })
            });

            const result = await response.json();
            const verdictText = result.choices[0].message.content;

            return JSON.parse(verdictText);

        } catch (error) {
            console.error('AI verdict generation failed:', error);
            return null;
        }
    }

    /**
     * Determine verification level based on confidence and source count
     */
    determineVerificationLevel(confidence, reliableSourcesCount) {
        if (reliableSourcesCount >= 3 && confidence >= 80) {
            return 'highly_verified';
        } else if (reliableSourcesCount >= 2 && confidence >= 60) {
            return 'verified';
        } else if (reliableSourcesCount >= 1 && confidence >= 40) {
            return 'partially_verified';
        } else {
            return 'unverified';
        }
    }

    /**
     * Get default sources for fact-checking
     */
    getDefaultSources() {
        return ['fact_check_sites', 'wikipedia', 'web_search', 'academic'];
    }

    /**
     * Extract text content from various formats
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

        return JSON.stringify(content);
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
     * Fact-check management
     */
    getFactCheck(factCheckId) {
        return this.factChecks.get(factCheckId);
    }

    getAllFactChecks() {
        return Array.from(this.factChecks.values());
    }

    async deleteFactCheck(factCheckId) {
        this.factChecks.delete(factCheckId);
        await this.saveFactChecks();
    }

    /**
     * Storage methods
     */
    async loadFactChecks() {
        try {
            const result = await this.storage.get('fact_checks');
            if (result.fact_checks) {
                const factChecks = JSON.parse(result.fact_checks);
                factChecks.forEach(factCheck => this.factChecks.set(factCheck.id, factCheck));
            }
        } catch (error) {
            console.error('Failed to load fact-checks:', error);
        }
    }

    async saveFactChecks() {
        try {
            const factChecks = Array.from(this.factChecks.values());
            await this.storage.set({ fact_checks: JSON.stringify(factChecks) });
        } catch (error) {
            console.error('Failed to save fact-checks:', error);
        }
    }

    generateFactCheckId() {
        return 'factcheck_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }
}

// Export for use in background script
if (typeof module !== 'undefined' && module.exports) {
    module.exports = FactCheckingSystem;
}
