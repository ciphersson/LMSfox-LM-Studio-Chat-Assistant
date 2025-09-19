// Citation Generator System for Academic Work
class CitationGenerator {
    constructor() {
        this.citations = [];
        this.formats = {
            'apa': 'APA 7th Edition',
            'mla': 'MLA 9th Edition',
            'chicago': 'Chicago 17th Edition',
            'harvard': 'Harvard Style',
            'ieee': 'IEEE Style',
            'vancouver': 'Vancouver Style'
        };
        this.sourceTypes = {
            'website': 'Website',
            'journal': 'Journal Article',
            'book': 'Book',
            'chapter': 'Book Chapter',
            'newspaper': 'Newspaper Article',
            'magazine': 'Magazine Article',
            'report': 'Report',
            'thesis': 'Thesis/Dissertation',
            'conference': 'Conference Paper',
            'video': 'Video',
            'podcast': 'Podcast',
            'social': 'Social Media Post',
            'software': 'Software',
            'dataset': 'Dataset'
        };
        this.lmStudioUrl = 'http://localhost:1234/v1';
        this.storageKey = 'citations';
        this.init();
    }

    async init() {
        await this.loadCitations();
    }

    // Create a new citation
    async createCitation(sourceData) {
        const citation = {
            id: this.generateId(),
            type: sourceData.type || 'website',
            title: sourceData.title || '',
            authors: sourceData.authors || [],
            url: sourceData.url || '',
            accessDate: sourceData.accessDate || new Date().toISOString().split('T')[0],
            publicationDate: sourceData.publicationDate || '',
            publisher: sourceData.publisher || '',
            journal: sourceData.journal || '',
            volume: sourceData.volume || '',
            issue: sourceData.issue || '',
            pages: sourceData.pages || '',
            doi: sourceData.doi || '',
            isbn: sourceData.isbn || '',
            edition: sourceData.edition || '',
            location: sourceData.location || '',
            conference: sourceData.conference || '',
            institution: sourceData.institution || '',
            degree: sourceData.degree || '',
            notes: sourceData.notes || '',
            tags: sourceData.tags || [],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            generatedCitations: {}
        };

        // Auto-extract metadata if URL is provided
        if (citation.url && !citation.title) {
            await this.extractMetadata(citation);
        }

        // Generate citations in all formats
        await this.generateAllFormats(citation);

        this.citations.push(citation);
        await this.saveCitations();
        
        return citation;
    }

    // Extract metadata from URL
    async extractMetadata(citation) {
        try {
            // Try to get page content
            const response = await fetch(citation.url);
            const html = await response.text();
            
            // Parse HTML to extract metadata
            const parser = new DOMParser();
            const doc = parser.parseFromString(html, 'text/html');
            
            // Extract title
            if (!citation.title) {
                citation.title = doc.querySelector('title')?.textContent?.trim() ||
                               doc.querySelector('meta[property="og:title"]')?.content ||
                               doc.querySelector('meta[name="title"]')?.content ||
                               '';
            }
            
            // Extract authors
            if (citation.authors.length === 0) {
                const authorMeta = doc.querySelector('meta[name="author"]')?.content ||
                                 doc.querySelector('meta[property="article:author"]')?.content;
                if (authorMeta) {
                    citation.authors = authorMeta.split(',').map(a => a.trim());
                }
            }
            
            // Extract publication date
            if (!citation.publicationDate) {
                citation.publicationDate = doc.querySelector('meta[property="article:published_time"]')?.content ||
                                         doc.querySelector('meta[name="date"]')?.content ||
                                         doc.querySelector('time[datetime]')?.getAttribute('datetime') ||
                                         '';
            }
            
            // Extract publisher/site name
            if (!citation.publisher) {
                citation.publisher = doc.querySelector('meta[property="og:site_name"]')?.content ||
                                   doc.querySelector('meta[name="publisher"]')?.content ||
                                   new URL(citation.url).hostname;
            }
            
            // Extract DOI
            if (!citation.doi) {
                const doiMeta = doc.querySelector('meta[name="doi"]')?.content ||
                              doc.querySelector('meta[name="DC.identifier"]')?.content;
                if (doiMeta && doiMeta.includes('10.')) {
                    citation.doi = doiMeta;
                }
            }
            
        } catch (error) {
            console.error('Error extracting metadata:', error);
        }
    }

    // Generate citations in all formats
    async generateAllFormats(citation) {
        for (const format of Object.keys(this.formats)) {
            try {
                citation.generatedCitations[format] = await this.generateCitation(citation, format);
            } catch (error) {
                console.error(`Error generating ${format} citation:`, error);
                citation.generatedCitations[format] = this.generateFallbackCitation(citation, format);
            }
        }
    }

    // Generate citation in specific format
    async generateCitation(citation, format) {
        // Try AI-powered citation generation first
        try {
            return await this.generateAICitation(citation, format);
        } catch (error) {
            console.error('AI citation generation failed, using fallback:', error);
            return this.generateFallbackCitation(citation, format);
        }
    }

    // AI-powered citation generation
    async generateAICitation(citation, format) {
        const prompt = this.buildCitationPrompt(citation, format);
        
        const response = await fetch(`${this.lmStudioUrl}/chat/completions`, {
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
                temperature: 0.1,
                max_tokens: 300
            })
        });

        if (!response.ok) {
            throw new Error(`LM Studio API error: ${response.status}`);
        }

        const data = await response.json();
        return data.choices[0].message.content.trim();
    }

    // Build citation prompt for AI
    buildCitationPrompt(citation, format) {
        const formatName = this.formats[format];
        const sourceType = this.sourceTypes[citation.type];
        
        let prompt = `Generate a properly formatted ${formatName} citation for a ${sourceType} with the following information:\n\n`;
        
        if (citation.title) prompt += `Title: ${citation.title}\n`;
        if (citation.authors.length > 0) prompt += `Authors: ${citation.authors.join(', ')}\n`;
        if (citation.publicationDate) prompt += `Publication Date: ${citation.publicationDate}\n`;
        if (citation.publisher) prompt += `Publisher: ${citation.publisher}\n`;
        if (citation.url) prompt += `URL: ${citation.url}\n`;
        if (citation.accessDate) prompt += `Access Date: ${citation.accessDate}\n`;
        if (citation.journal) prompt += `Journal: ${citation.journal}\n`;
        if (citation.volume) prompt += `Volume: ${citation.volume}\n`;
        if (citation.issue) prompt += `Issue: ${citation.issue}\n`;
        if (citation.pages) prompt += `Pages: ${citation.pages}\n`;
        if (citation.doi) prompt += `DOI: ${citation.doi}\n`;
        if (citation.isbn) prompt += `ISBN: ${citation.isbn}\n`;
        if (citation.edition) prompt += `Edition: ${citation.edition}\n`;
        if (citation.location) prompt += `Location: ${citation.location}\n`;
        if (citation.conference) prompt += `Conference: ${citation.conference}\n`;
        if (citation.institution) prompt += `Institution: ${citation.institution}\n`;
        if (citation.degree) prompt += `Degree: ${citation.degree}\n`;
        
        prompt += `\nPlease provide only the properly formatted ${formatName} citation, following all style guidelines for ${sourceType}s. Do not include any explanations or additional text.`;
        
        return prompt;
    }

    // Fallback citation generation (rule-based)
    generateFallbackCitation(citation, format) {
        switch (format) {
            case 'apa':
                return this.generateAPACitation(citation);
            case 'mla':
                return this.generateMLACitation(citation);
            case 'chicago':
                return this.generateChicagoCitation(citation);
            case 'harvard':
                return this.generateHarvardCitation(citation);
            case 'ieee':
                return this.generateIEEECitation(citation);
            case 'vancouver':
                return this.generateVancouverCitation(citation);
            default:
                return this.generateAPACitation(citation);
        }
    }

    // APA 7th Edition citation
    generateAPACitation(citation) {
        let cite = '';
        
        // Authors
        if (citation.authors.length > 0) {
            if (citation.authors.length === 1) {
                cite += this.formatAuthorAPA(citation.authors[0]);
            } else if (citation.authors.length <= 20) {
                const lastAuthor = citation.authors.pop();
                cite += citation.authors.map(a => this.formatAuthorAPA(a)).join(', ');
                cite += ', & ' + this.formatAuthorAPA(lastAuthor);
                citation.authors.push(lastAuthor); // Restore array
            } else {
                cite += citation.authors.slice(0, 19).map(a => this.formatAuthorAPA(a)).join(', ');
                cite += ', ... ' + this.formatAuthorAPA(citation.authors[citation.authors.length - 1]);
            }
        } else {
            cite += citation.publisher || 'Unknown Author';
        }
        
        // Date
        const year = this.extractYear(citation.publicationDate) || 'n.d.';
        cite += ` (${year}). `;
        
        // Title
        if (citation.type === 'journal') {
            cite += `${citation.title}. `;
        } else {
            cite += `*${citation.title}*. `;
        }
        
        // Source-specific formatting
        switch (citation.type) {
            case 'journal':
                if (citation.journal) cite += `*${citation.journal}*`;
                if (citation.volume) cite += `, ${citation.volume}`;
                if (citation.issue) cite += `(${citation.issue})`;
                if (citation.pages) cite += `, ${citation.pages}`;
                if (citation.doi) cite += `. https://doi.org/${citation.doi}`;
                break;
            case 'book':
                if (citation.publisher) cite += `${citation.publisher}`;
                if (citation.doi) cite += `. https://doi.org/${citation.doi}`;
                break;
            case 'website':
                if (citation.publisher) cite += `*${citation.publisher}*. `;
                if (citation.url) cite += `${citation.url}`;
                break;
        }
        
        return cite.trim();
    }

    // MLA 9th Edition citation
    generateMLACitation(citation) {
        let cite = '';
        
        // Authors
        if (citation.authors.length > 0) {
            if (citation.authors.length === 1) {
                cite += this.formatAuthorMLA(citation.authors[0]);
            } else if (citation.authors.length === 2) {
                cite += this.formatAuthorMLA(citation.authors[0]) + ', and ' + this.formatAuthorMLA(citation.authors[1]);
            } else {
                cite += this.formatAuthorMLA(citation.authors[0]) + ', et al';
            }
        }
        
        // Title
        if (citation.type === 'journal') {
            cite += ` "${citation.title}." `;
        } else {
            cite += ` *${citation.title}*. `;
        }
        
        // Source-specific formatting
        switch (citation.type) {
            case 'journal':
                if (citation.journal) cite += `*${citation.journal}*`;
                if (citation.volume) cite += `, vol. ${citation.volume}`;
                if (citation.issue) cite += `, no. ${citation.issue}`;
                if (citation.publicationDate) cite += `, ${this.formatDateMLA(citation.publicationDate)}`;
                if (citation.pages) cite += `, pp. ${citation.pages}`;
                break;
            case 'website':
                if (citation.publisher) cite += `*${citation.publisher}*`;
                if (citation.publicationDate) cite += `, ${this.formatDateMLA(citation.publicationDate)}`;
                if (citation.url) cite += `, ${citation.url}`;
                if (citation.accessDate) cite += `. Accessed ${this.formatDateMLA(citation.accessDate)}`;
                break;
        }
        
        return cite.trim();
    }

    // Chicago 17th Edition citation
    generateChicagoCitation(citation) {
        let cite = '';
        
        // Authors
        if (citation.authors.length > 0) {
            cite += this.formatAuthorChicago(citation.authors[0]);
            if (citation.authors.length > 1) {
                cite += ', et al';
            }
        }
        
        // Title
        cite += `. "${citation.title}."`;
        
        // Source-specific formatting
        switch (citation.type) {
            case 'journal':
                if (citation.journal) cite += ` *${citation.journal}*`;
                if (citation.volume) cite += ` ${citation.volume}`;
                if (citation.issue) cite += `, no. ${citation.issue}`;
                if (citation.publicationDate) cite += ` (${this.formatDateChicago(citation.publicationDate)})`;
                if (citation.pages) cite += `: ${citation.pages}`;
                if (citation.doi) cite += `. https://doi.org/${citation.doi}`;
                break;
            case 'website':
                if (citation.publisher) cite += ` *${citation.publisher}*`;
                if (citation.publicationDate) cite += `, ${this.formatDateChicago(citation.publicationDate)}`;
                if (citation.url) cite += `. ${citation.url}`;
                break;
        }
        
        return cite.trim();
    }

    // Harvard citation
    generateHarvardCitation(citation) {
        let cite = '';
        
        // Authors
        if (citation.authors.length > 0) {
            cite += this.formatAuthorHarvard(citation.authors[0]);
            if (citation.authors.length > 1) {
                cite += ' et al.';
            }
        }
        
        // Date
        const year = this.extractYear(citation.publicationDate) || 'n.d.';
        cite += ` ${year}`;
        
        // Title
        cite += `, '${citation.title}'`;
        
        // Source-specific formatting
        switch (citation.type) {
            case 'journal':
                if (citation.journal) cite += `, *${citation.journal}*`;
                if (citation.volume) cite += `, vol. ${citation.volume}`;
                if (citation.issue) cite += `, no. ${citation.issue}`;
                if (citation.pages) cite += `, pp. ${citation.pages}`;
                break;
            case 'website':
                if (citation.publisher) cite += `, *${citation.publisher}*`;
                if (citation.url) cite += `, available at: ${citation.url}`;
                if (citation.accessDate) cite += ` (Accessed: ${this.formatDateHarvard(citation.accessDate)})`;
                break;
        }
        
        return cite.trim();
    }

    // IEEE citation
    generateIEEECitation(citation) {
        let cite = '';
        
        // Authors
        if (citation.authors.length > 0) {
            if (citation.authors.length <= 6) {
                cite += citation.authors.map(a => this.formatAuthorIEEE(a)).join(', ');
            } else {
                cite += citation.authors.slice(0, 6).map(a => this.formatAuthorIEEE(a)).join(', ') + ', et al.';
            }
        }
        
        // Title
        cite += `, "${citation.title},"`;
        
        // Source-specific formatting
        switch (citation.type) {
            case 'journal':
                if (citation.journal) cite += ` *${citation.journal}*`;
                if (citation.volume) cite += `, vol. ${citation.volume}`;
                if (citation.issue) cite += `, no. ${citation.issue}`;
                if (citation.pages) cite += `, pp. ${citation.pages}`;
                if (citation.publicationDate) cite += `, ${this.formatDateIEEE(citation.publicationDate)}`;
                break;
            case 'website':
                if (citation.publisher) cite += ` *${citation.publisher}*`;
                if (citation.publicationDate) cite += `, ${this.formatDateIEEE(citation.publicationDate)}`;
                if (citation.url) cite += `. [Online]. Available: ${citation.url}`;
                if (citation.accessDate) cite += `. [Accessed: ${this.formatDateIEEE(citation.accessDate)}]`;
                break;
        }
        
        return cite.trim();
    }

    // Vancouver citation
    generateVancouverCitation(citation) {
        let cite = '';
        
        // Authors
        if (citation.authors.length > 0) {
            if (citation.authors.length <= 6) {
                cite += citation.authors.map(a => this.formatAuthorVancouver(a)).join(', ');
            } else {
                cite += citation.authors.slice(0, 6).map(a => this.formatAuthorVancouver(a)).join(', ') + ', et al';
            }
        }
        
        // Title
        cite += `. ${citation.title}`;
        
        // Source-specific formatting
        switch (citation.type) {
            case 'journal':
                if (citation.journal) cite += `. ${citation.journal}`;
                if (citation.publicationDate) cite += `. ${this.formatDateVancouver(citation.publicationDate)}`;
                if (citation.volume) cite += `;${citation.volume}`;
                if (citation.issue) cite += `(${citation.issue})`;
                if (citation.pages) cite += `:${citation.pages}`;
                break;
            case 'website':
                cite += ` [Internet]`;
                if (citation.publisher) cite += `. ${citation.publisher}`;
                if (citation.publicationDate) cite += `; ${this.formatDateVancouver(citation.publicationDate)}`;
                if (citation.url) cite += `. Available from: ${citation.url}`;
                break;
        }
        
        return cite.trim();
    }

    // Author formatting helpers
    formatAuthorAPA(author) {
        const parts = author.trim().split(' ');
        if (parts.length === 1) return parts[0];
        const lastName = parts.pop();
        const firstInitials = parts.map(name => name.charAt(0).toUpperCase() + '.').join(' ');
        return `${lastName}, ${firstInitials}`;
    }

    formatAuthorMLA(author) {
        const parts = author.trim().split(' ');
        if (parts.length === 1) return parts[0];
        const lastName = parts.pop();
        const firstName = parts.join(' ');
        return `${lastName}, ${firstName}`;
    }

    formatAuthorChicago(author) {
        return this.formatAuthorMLA(author);
    }

    formatAuthorHarvard(author) {
        const parts = author.trim().split(' ');
        if (parts.length === 1) return parts[0];
        const lastName = parts.pop();
        const firstInitials = parts.map(name => name.charAt(0).toUpperCase() + '.').join('');
        return `${lastName}, ${firstInitials}`;
    }

    formatAuthorIEEE(author) {
        const parts = author.trim().split(' ');
        if (parts.length === 1) return parts[0];
        const lastName = parts.pop();
        const firstInitials = parts.map(name => name.charAt(0).toUpperCase() + '.').join(' ');
        return `${firstInitials} ${lastName}`;
    }

    formatAuthorVancouver(author) {
        const parts = author.trim().split(' ');
        if (parts.length === 1) return parts[0];
        const lastName = parts.pop();
        const firstInitials = parts.map(name => name.charAt(0).toUpperCase()).join('');
        return `${lastName} ${firstInitials}`;
    }

    // Date formatting helpers
    extractYear(dateString) {
        if (!dateString) return null;
        const match = dateString.match(/\d{4}/);
        return match ? match[0] : null;
    }

    formatDateMLA(dateString) {
        if (!dateString) return '';
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', { 
            day: 'numeric', 
            month: 'short', 
            year: 'numeric' 
        });
    }

    formatDateChicago(dateString) {
        if (!dateString) return '';
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', { 
            month: 'long', 
            day: 'numeric', 
            year: 'numeric' 
        });
    }

    formatDateHarvard(dateString) {
        if (!dateString) return '';
        const date = new Date(dateString);
        return date.toLocaleDateString('en-GB', { 
            day: 'numeric', 
            month: 'long', 
            year: 'numeric' 
        });
    }

    formatDateIEEE(dateString) {
        if (!dateString) return '';
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', { 
            month: 'short', 
            year: 'numeric' 
        });
    }

    formatDateVancouver(dateString) {
        if (!dateString) return '';
        const date = new Date(dateString);
        return date.getFullYear() + ' ' + 
               date.toLocaleDateString('en-US', { month: 'short' }) + ' ' +
               date.getDate();
    }

    // Update citation
    async updateCitation(citationId, updates) {
        const citationIndex = this.citations.findIndex(c => c.id === citationId);
        if (citationIndex === -1) {
            throw new Error('Citation not found');
        }

        const citation = this.citations[citationIndex];
        Object.assign(citation, updates);
        citation.updatedAt = new Date().toISOString();

        // Regenerate citations if content changed
        await this.generateAllFormats(citation);

        await this.saveCitations();
        return citation;
    }

    // Delete citation
    async deleteCitation(citationId) {
        const citationIndex = this.citations.findIndex(c => c.id === citationId);
        if (citationIndex === -1) {
            throw new Error('Citation not found');
        }

        this.citations.splice(citationIndex, 1);
        await this.saveCitations();
    }

    // Get citation by ID
    getCitation(citationId) {
        return this.citations.find(c => c.id === citationId);
    }

    // Get all citations
    getAllCitations() {
        return this.citations;
    }

    // Search citations
    searchCitations(query, filters = {}) {
        let results = this.citations;

        // Text search
        if (query) {
            const searchTerms = query.toLowerCase().split(' ');
            results = results.filter(citation => {
                const searchText = [
                    citation.title,
                    citation.authors.join(' '),
                    citation.publisher,
                    citation.journal,
                    ...citation.tags
                ].join(' ').toLowerCase();

                return searchTerms.every(term => searchText.includes(term));
            });
        }

        // Filter by type
        if (filters.type) {
            results = results.filter(c => c.type === filters.type);
        }

        // Filter by tags
        if (filters.tags && filters.tags.length > 0) {
            results = results.filter(c => 
                filters.tags.some(tag => c.tags.includes(tag))
            );
        }

        // Sort results
        const sortBy = filters.sortBy || 'updatedAt';
        const sortOrder = filters.sortOrder || 'desc';
        
        results.sort((a, b) => {
            let aVal = a[sortBy];
            let bVal = b[sortBy];
            
            if (sortBy === 'createdAt' || sortBy === 'updatedAt') {
                aVal = new Date(aVal);
                bVal = new Date(bVal);
            }
            
            if (sortOrder === 'desc') {
                return bVal > aVal ? 1 : -1;
            } else {
                return aVal > bVal ? 1 : -1;
            }
        });

        return results;
    }

    // Export bibliography
    exportBibliography(citationIds, format) {
        const citations = citationIds.map(id => this.getCitation(id)).filter(c => c);
        
        return citations.map((citation, index) => {
            const formattedCitation = citation.generatedCitations[format] || 
                                    this.generateFallbackCitation(citation, format);
            
            if (format === 'ieee' || format === 'vancouver') {
                return `[${index + 1}] ${formattedCitation}`;
            } else {
                return formattedCitation;
            }
        }).join('\n\n');
    }

    // Helper methods
    generateId() {
        return 'citation_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    async saveCitations() {
        try {
            await browser.storage.local.set({
                [this.storageKey]: this.citations
            });
        } catch (error) {
            console.error('Error saving citations:', error);
            throw error;
        }
    }

    async loadCitations() {
        try {
            const result = await browser.storage.local.get(this.storageKey);
            this.citations = result[this.storageKey] || [];
        } catch (error) {
            console.error('Error loading citations:', error);
            this.citations = [];
        }
    }
}
