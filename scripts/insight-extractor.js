/**
 * Insight Extractor - Advanced AI-powered insight and takeaway generation
 * Focuses on extracting actionable insights from complex web content
 */

class InsightExtractor {
    constructor() {
        this.apiUrl = 'http://localhost:1234/v1/chat/completions';
        this.storageKey = 'lm_studio_insights';
        this.init();
    }

    async init() {
        console.log('InsightExtractor initialized');
    }

    /**
     * Extract comprehensive insights from webpage content
     */
    async extractInsights(content, url, title) {
        try {
            const insights = {
                id: this.generateId(),
                url: url,
                title: title,
                timestamp: Date.now(),
                content: {
                    text: content.text || '',
                    headings: content.headings || [],
                    links: content.links || [],
                    images: content.images || [],
                    metadata: content.metadata || {}
                },
                analysis: {}
            };

            // Run parallel analysis
            const [
                keyInsights,
                actionableItems,
                criticalPoints,
                implications,
                recommendations,
                patterns,
                contradictions,
                gaps
            ] = await Promise.all([
                this.extractKeyInsights(content),
                this.generateActionableItems(content),
                this.identifyCriticalPoints(content),
                this.analyzeImplications(content),
                this.generateRecommendations(content),
                this.identifyPatterns(content),
                this.findContradictions(content),
                this.identifyKnowledgeGaps(content)
            ]);

            insights.analysis = {
                keyInsights,
                actionableItems,
                criticalPoints,
                implications,
                recommendations,
                patterns,
                contradictions,
                gaps,
                confidence: this.calculateConfidence(content),
                complexity: this.assessComplexity(content),
                relevance: this.assessRelevance(content)
            };

            // Store insights
            await this.storeInsights(insights);

            return insights;
        } catch (error) {
            console.error('Error extracting insights:', error);
            throw error;
        }
    }

    /**
     * Extract key insights using AI analysis
     */
    async extractKeyInsights(content) {
        const prompt = `Analyze the following content and extract the most important insights. Focus on:
1. Core concepts and ideas
2. Novel or surprising information
3. Important facts and data points
4. Key relationships and connections
5. Significant trends or patterns

Content: ${this.truncateContent(content.text)}

Provide insights as a JSON array with objects containing:
- insight: The key insight (string)
- importance: High/Medium/Low
- category: The type of insight
- evidence: Supporting evidence from the content
- confidence: 0-100 confidence score`;

        try {
            const response = await this.callLMStudio(prompt);
            return this.parseAIResponse(response, []);
        } catch (error) {
            console.error('Error extracting key insights:', error);
            return this.fallbackKeyInsights(content);
        }
    }

    /**
     * Generate actionable items from content
     */
    async generateActionableItems(content) {
        const prompt = `Analyze the following content and generate specific, actionable takeaways. Focus on:
1. Concrete steps readers can take
2. Practical applications of the information
3. Decisions that can be made based on the content
4. Tools or resources to explore
5. Next steps for implementation

Content: ${this.truncateContent(content.text)}

Provide actionable items as a JSON array with objects containing:
- action: The specific action to take (string)
- priority: High/Medium/Low
- timeframe: Immediate/Short-term/Long-term
- difficulty: Easy/Medium/Hard
- resources: Required resources or tools
- outcome: Expected result or benefit`;

        try {
            const response = await this.callLMStudio(prompt);
            return this.parseAIResponse(response, []);
        } catch (error) {
            console.error('Error generating actionable items:', error);
            return this.fallbackActionableItems(content);
        }
    }

    /**
     * Identify critical points that require attention
     */
    async identifyCriticalPoints(content) {
        const prompt = `Identify critical points in the following content that require special attention:
1. Warning signs or red flags
2. Time-sensitive information
3. High-impact decisions
4. Potential risks or opportunities
5. Critical dependencies

Content: ${this.truncateContent(content.text)}

Provide critical points as a JSON array with objects containing:
- point: The critical point (string)
- type: Warning/Opportunity/Decision/Risk/Dependency
- urgency: High/Medium/Low
- impact: High/Medium/Low
- context: Additional context or explanation`;

        try {
            const response = await this.callLMStudio(prompt);
            return this.parseAIResponse(response, []);
        } catch (error) {
            console.error('Error identifying critical points:', error);
            return this.fallbackCriticalPoints(content);
        }
    }

    /**
     * Analyze implications and consequences
     */
    async analyzeImplications(content) {
        const prompt = `Analyze the implications and potential consequences of the information in this content:
1. Short-term and long-term effects
2. Broader industry or societal impact
3. Potential unintended consequences
4. Strategic implications
5. Future trends and predictions

Content: ${this.truncateContent(content.text)}

Provide implications as a JSON array with objects containing:
- implication: The implication or consequence (string)
- timeframe: Short-term/Medium-term/Long-term
- scope: Personal/Organizational/Industry/Global
- likelihood: High/Medium/Low
- significance: High/Medium/Low`;

        try {
            const response = await this.callLMStudio(prompt);
            return this.parseAIResponse(response, []);
        } catch (error) {
            console.error('Error analyzing implications:', error);
            return this.fallbackImplications(content);
        }
    }

    /**
     * Generate recommendations based on content
     */
    async generateRecommendations(content) {
        const prompt = `Based on the following content, generate specific recommendations:
1. Best practices to follow
2. Strategies to implement
3. Tools or technologies to adopt
4. Approaches to avoid
5. Areas for further research

Content: ${this.truncateContent(content.text)}

Provide recommendations as a JSON array with objects containing:
- recommendation: The specific recommendation (string)
- category: Best Practice/Strategy/Tool/Avoidance/Research
- rationale: Why this recommendation is important
- implementation: How to implement this recommendation
- priority: High/Medium/Low`;

        try {
            const response = await this.callLMStudio(prompt);
            return this.parseAIResponse(response, []);
        } catch (error) {
            console.error('Error generating recommendations:', error);
            return this.fallbackRecommendations(content);
        }
    }

    /**
     * Identify patterns and trends
     */
    async identifyPatterns(content) {
        const prompt = `Identify patterns, trends, and recurring themes in this content:
1. Repeated concepts or ideas
2. Emerging trends
3. Cyclical patterns
4. Cause-and-effect relationships
5. Common themes across different sections

Content: ${this.truncateContent(content.text)}

Provide patterns as a JSON array with objects containing:
- pattern: Description of the pattern (string)
- type: Trend/Theme/Cycle/Relationship/Repetition
- strength: Strong/Moderate/Weak
- evidence: Supporting evidence from the content
- significance: High/Medium/Low`;

        try {
            const response = await this.callLMStudio(prompt);
            return this.parseAIResponse(response, []);
        } catch (error) {
            console.error('Error identifying patterns:', error);
            return this.fallbackPatterns(content);
        }
    }

    /**
     * Find contradictions or conflicting information
     */
    async findContradictions(content) {
        const prompt = `Identify any contradictions, conflicts, or inconsistencies in this content:
1. Conflicting statements or data
2. Logical inconsistencies
3. Contradictory recommendations
4. Opposing viewpoints
5. Inconsistent terminology or definitions

Content: ${this.truncateContent(content.text)}

Provide contradictions as a JSON array with objects containing:
- contradiction: Description of the contradiction (string)
- type: Statement/Data/Logic/Recommendation/Definition
- severity: High/Medium/Low
- sources: Where the conflicting information appears
- resolution: Possible explanation or resolution`;

        try {
            const response = await this.callLMStudio(prompt);
            return this.parseAIResponse(response, []);
        } catch (error) {
            console.error('Error finding contradictions:', error);
            return [];
        }
    }

    /**
     * Identify knowledge gaps and missing information
     */
    async identifyKnowledgeGaps(content) {
        const prompt = `Identify knowledge gaps and missing information in this content:
1. Questions left unanswered
2. Missing context or background
3. Incomplete data or analysis
4. Areas needing more research
5. Assumptions that need validation

Content: ${this.truncateContent(content.text)}

Provide knowledge gaps as a JSON array with objects containing:
- gap: Description of the knowledge gap (string)
- type: Question/Context/Data/Research/Assumption
- importance: High/Medium/Low
- impact: How this gap affects understanding
- suggestions: How to address this gap`;

        try {
            const response = await this.callLMStudio(prompt);
            return this.parseAIResponse(response, []);
        } catch (error) {
            console.error('Error identifying knowledge gaps:', error);
            return [];
        }
    }

    /**
     * Calculate confidence score for the analysis
     */
    calculateConfidence(content) {
        let score = 50; // Base score

        // Content length factor
        if (content.text && content.text.length > 1000) score += 20;
        else if (content.text && content.text.length > 500) score += 10;

        // Structure factor
        if (content.headings && content.headings.length > 3) score += 10;
        if (content.links && content.links.length > 5) score += 5;

        // Metadata factor
        if (content.metadata && Object.keys(content.metadata).length > 3) score += 10;

        // Quality indicators
        if (content.text && content.text.includes('research') || content.text.includes('study')) score += 5;
        if (content.text && content.text.includes('data') || content.text.includes('analysis')) score += 5;

        return Math.min(100, Math.max(0, score));
    }

    /**
     * Assess content complexity
     */
    assessComplexity(content) {
        let score = 0;

        if (content.text) {
            const words = content.text.split(/\s+/).length;
            const sentences = content.text.split(/[.!?]+/).length;
            const avgWordsPerSentence = words / sentences;

            if (avgWordsPerSentence > 20) score += 30;
            else if (avgWordsPerSentence > 15) score += 20;
            else score += 10;

            // Technical terms indicator
            const technicalTerms = (content.text.match(/\b[A-Z]{2,}\b/g) || []).length;
            score += Math.min(30, technicalTerms * 2);

            // Structure complexity
            if (content.headings && content.headings.length > 5) score += 20;
            if (content.links && content.links.length > 10) score += 10;
        }

        if (score > 70) return 'High';
        if (score > 40) return 'Medium';
        return 'Low';
    }

    /**
     * Assess content relevance
     */
    assessRelevance(content) {
        // This is a simplified relevance assessment
        // In a real implementation, this would consider user preferences, current topics, etc.
        let score = 50;

        if (content.metadata) {
            if (content.metadata.publishDate) {
                const publishDate = new Date(content.metadata.publishDate);
                const now = new Date();
                const daysDiff = (now - publishDate) / (1000 * 60 * 60 * 24);
                
                if (daysDiff < 30) score += 20;
                else if (daysDiff < 90) score += 10;
                else if (daysDiff > 365) score -= 10;
            }
        }

        // Content quality indicators
        if (content.text && content.text.length > 1000) score += 15;
        if (content.headings && content.headings.length > 2) score += 10;

        if (score > 70) return 'High';
        if (score > 40) return 'Medium';
        return 'Low';
    }

    /**
     * Fallback methods for when AI analysis fails
     */
    fallbackKeyInsights(content) {
        const insights = [];
        
        if (content.headings && content.headings.length > 0) {
            content.headings.slice(0, 5).forEach((heading, index) => {
                insights.push({
                    insight: `Key topic: ${heading}`,
                    importance: index < 2 ? 'High' : 'Medium',
                    category: 'Topic',
                    evidence: `Heading structure`,
                    confidence: 60
                });
            });
        }

        return insights;
    }

    fallbackActionableItems(content) {
        const actions = [];
        
        // Look for action words in content
        const actionWords = ['implement', 'use', 'apply', 'consider', 'try', 'adopt', 'follow'];
        const sentences = content.text ? content.text.split(/[.!?]+/) : [];
        
        sentences.forEach(sentence => {
            actionWords.forEach(word => {
                if (sentence.toLowerCase().includes(word)) {
                    actions.push({
                        action: sentence.trim(),
                        priority: 'Medium',
                        timeframe: 'Short-term',
                        difficulty: 'Medium',
                        resources: 'To be determined',
                        outcome: 'Improved understanding or implementation'
                    });
                }
            });
        });

        return actions.slice(0, 5);
    }

    fallbackCriticalPoints(content) {
        const points = [];
        
        // Look for warning words
        const warningWords = ['warning', 'caution', 'important', 'critical', 'urgent', 'attention'];
        const sentences = content.text ? content.text.split(/[.!?]+/) : [];
        
        sentences.forEach(sentence => {
            warningWords.forEach(word => {
                if (sentence.toLowerCase().includes(word)) {
                    points.push({
                        point: sentence.trim(),
                        type: 'Warning',
                        urgency: 'Medium',
                        impact: 'Medium',
                        context: 'Identified by keyword analysis'
                    });
                }
            });
        });

        return points.slice(0, 3);
    }

    fallbackImplications(content) {
        return [{
            implication: 'Content requires further analysis for detailed implications',
            timeframe: 'Medium-term',
            scope: 'Personal',
            likelihood: 'Medium',
            significance: 'Medium'
        }];
    }

    fallbackRecommendations(content) {
        return [{
            recommendation: 'Review and analyze the content thoroughly',
            category: 'Best Practice',
            rationale: 'Comprehensive understanding is essential',
            implementation: 'Read through the content multiple times',
            priority: 'Medium'
        }];
    }

    fallbackPatterns(content) {
        const patterns = [];
        
        if (content.headings && content.headings.length > 2) {
            patterns.push({
                pattern: 'Structured content with multiple sections',
                type: 'Theme',
                strength: 'Moderate',
                evidence: `${content.headings.length} headings found`,
                significance: 'Medium'
            });
        }

        return patterns;
    }

    /**
     * Utility methods
     */
    truncateContent(text, maxLength = 3000) {
        if (!text) return '';
        return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
    }

    async callLMStudio(prompt) {
        const response = await fetch(this.apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: 'local-model',
                messages: [
                    {
                        role: 'system',
                        content: 'You are an expert analyst specializing in extracting insights and actionable takeaways from complex content. Always respond with valid JSON when requested.'
                    },
                    {
                        role: 'user',
                        content: prompt
                    }
                ],
                temperature: 0.3,
                max_tokens: 2000
            })
        });

        if (!response.ok) {
            throw new Error(`LM Studio API error: ${response.status}`);
        }

        const data = await response.json();
        return data.choices[0].message.content;
    }

    parseAIResponse(response, fallback = []) {
        try {
            // Try to extract JSON from the response
            const jsonMatch = response.match(/\[[\s\S]*\]/);
            if (jsonMatch) {
                return JSON.parse(jsonMatch[0]);
            }
            
            // If no JSON array found, try to parse the entire response
            return JSON.parse(response);
        } catch (error) {
            console.error('Error parsing AI response:', error);
            return fallback;
        }
    }

    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }

    async storeInsights(insights) {
        try {
            const stored = await browser.storage.local.get(this.storageKey);
            const allInsights = stored[this.storageKey] || [];
            
            allInsights.unshift(insights);
            
            // Keep only the latest 100 insights
            if (allInsights.length > 100) {
                allInsights.splice(100);
            }
            
            await browser.storage.local.set({
                [this.storageKey]: allInsights
            });
        } catch (error) {
            console.error('Error storing insights:', error);
        }
    }

    async getStoredInsights() {
        try {
            const stored = await browser.storage.local.get(this.storageKey);
            return stored[this.storageKey] || [];
        } catch (error) {
            console.error('Error retrieving insights:', error);
            return [];
        }
    }

    async deleteInsights(id) {
        try {
            const stored = await browser.storage.local.get(this.storageKey);
            const allInsights = stored[this.storageKey] || [];
            
            const filtered = allInsights.filter(insight => insight.id !== id);
            
            await browser.storage.local.set({
                [this.storageKey]: filtered
            });
            
            return true;
        } catch (error) {
            console.error('Error deleting insights:', error);
            return false;
        }
    }

    async exportInsights(format = 'json') {
        try {
            const insights = await this.getStoredInsights();
            
            switch (format) {
                case 'json':
                    return JSON.stringify(insights, null, 2);
                case 'csv':
                    return this.convertToCSV(insights);
                case 'markdown':
                    return this.convertToMarkdown(insights);
                default:
                    return JSON.stringify(insights, null, 2);
            }
        } catch (error) {
            console.error('Error exporting insights:', error);
            throw error;
        }
    }

    convertToCSV(insights) {
        if (insights.length === 0) return '';
        
        const headers = ['ID', 'URL', 'Title', 'Timestamp', 'Key Insights Count', 'Actionable Items Count', 'Confidence'];
        const rows = insights.map(insight => [
            insight.id,
            insight.url,
            insight.title,
            new Date(insight.timestamp).toISOString(),
            insight.analysis.keyInsights?.length || 0,
            insight.analysis.actionableItems?.length || 0,
            insight.analysis.confidence || 0
        ]);
        
        return [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
    }

    convertToMarkdown(insights) {
        let markdown = '# Extracted Insights\n\n';
        
        insights.forEach(insight => {
            markdown += `## ${insight.title}\n\n`;
            markdown += `**URL:** ${insight.url}\n`;
            markdown += `**Date:** ${new Date(insight.timestamp).toLocaleDateString()}\n`;
            markdown += `**Confidence:** ${insight.analysis.confidence}%\n\n`;
            
            if (insight.analysis.keyInsights?.length > 0) {
                markdown += '### Key Insights\n\n';
                insight.analysis.keyInsights.forEach(item => {
                    markdown += `- **${item.importance}:** ${item.insight}\n`;
                });
                markdown += '\n';
            }
            
            if (insight.analysis.actionableItems?.length > 0) {
                markdown += '### Actionable Items\n\n';
                insight.analysis.actionableItems.forEach(item => {
                    markdown += `- **${item.priority}:** ${item.action}\n`;
                });
                markdown += '\n';
            }
            
            markdown += '---\n\n';
        });
        
        return markdown;
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = InsightExtractor;
}
