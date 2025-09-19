// Research Notes Organization System with AI Tagging
class ResearchNotesSystem {
    constructor() {
        this.notes = [];
        this.tags = new Set();
        this.categories = new Set(['Research', 'Article', 'Documentation', 'Reference', 'Quote', 'Insight', 'Todo', 'Question']);
        this.lmStudioUrl = 'http://localhost:1234/v1';
        this.storageKey = 'research_notes';
        this.init();
    }

    async init() {
        await this.loadNotes();
    }

    // Create a new research note
    async createNote(config) {
        const note = {
            id: this.generateId(),
            title: config.title || this.extractTitle(config.content),
            content: config.content,
            url: config.url || null,
            source: config.source || 'Manual Entry',
            category: config.category || 'Research',
            tags: config.tags || [],
            aiTags: [],
            summary: '',
            keyPoints: [],
            relatedNotes: [],
            importance: config.importance || 'medium',
            status: 'active',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            metadata: {
                wordCount: this.countWords(config.content),
                readingTime: this.estimateReadingTime(config.content),
                language: 'en',
                contentType: this.detectContentType(config.content)
            }
        };

        // Generate AI tags and analysis
        if (config.useAI !== false) {
            await this.enhanceNoteWithAI(note);
        }

        this.notes.push(note);
        await this.saveNotes();
        
        // Update global tags set
        [...note.tags, ...note.aiTags].forEach(tag => this.tags.add(tag));
        
        return note;
    }

    // Enhance note with AI analysis
    async enhanceNoteWithAI(note) {
        try {
            // Generate AI tags
            const aiTags = await this.generateAITags(note.content);
            note.aiTags = aiTags;

            // Generate summary
            const summary = await this.generateSummary(note.content);
            note.summary = summary;

            // Extract key points
            const keyPoints = await this.extractKeyPoints(note.content);
            note.keyPoints = keyPoints;

            // Determine importance
            const importance = await this.analyzeImportance(note.content);
            note.importance = importance;

            // Find related notes
            note.relatedNotes = await this.findRelatedNotes(note);

        } catch (error) {
            console.error('Error enhancing note with AI:', error);
            // Fallback to basic analysis
            note.aiTags = this.generateBasicTags(note.content);
            note.summary = this.generateBasicSummary(note.content);
        }
    }

    // Generate AI tags using LM Studio
    async generateAITags(content) {
        const prompt = `Analyze the following text and generate 5-8 relevant tags that categorize the content. Focus on:
- Main topics and themes
- Academic subjects
- Content type (research, tutorial, news, etc.)
- Key concepts mentioned
- Industry or domain

Return only the tags as a comma-separated list, no explanations.

Text: ${content.substring(0, 2000)}`;

        try {
            const response = await this.callLMStudio(prompt);
            const tags = response.split(',').map(tag => tag.trim().toLowerCase()).filter(tag => tag.length > 0);
            return tags.slice(0, 8); // Limit to 8 tags
        } catch (error) {
            console.error('Error generating AI tags:', error);
            return this.generateBasicTags(content);
        }
    }

    // Generate summary using AI
    async generateSummary(content) {
        const prompt = `Provide a concise 2-3 sentence summary of the following text, capturing the main points and key insights:

${content.substring(0, 3000)}`;

        try {
            const response = await this.callLMStudio(prompt);
            return response.trim();
        } catch (error) {
            console.error('Error generating summary:', error);
            return this.generateBasicSummary(content);
        }
    }

    // Extract key points using AI
    async extractKeyPoints(content) {
        const prompt = `Extract 3-5 key points or insights from the following text. Return as a bullet-pointed list:

${content.substring(0, 3000)}`;

        try {
            const response = await this.callLMStudio(prompt);
            const points = response.split('\n')
                .filter(line => line.trim().length > 0)
                .map(line => line.replace(/^[-•*]\s*/, '').trim())
                .filter(point => point.length > 10);
            return points.slice(0, 5);
        } catch (error) {
            console.error('Error extracting key points:', error);
            return [];
        }
    }

    // Analyze importance using AI
    async analyzeImportance(content) {
        const prompt = `Rate the importance of this content for research purposes on a scale of low/medium/high. Consider:
- Novelty of information
- Depth of insights
- Potential impact
- Relevance to current research trends

Return only: low, medium, or high

Content: ${content.substring(0, 1500)}`;

        try {
            const response = await this.callLMStudio(prompt);
            const importance = response.trim().toLowerCase();
            return ['low', 'medium', 'high'].includes(importance) ? importance : 'medium';
        } catch (error) {
            console.error('Error analyzing importance:', error);
            return 'medium';
        }
    }

    // Find related notes using content similarity
    async findRelatedNotes(note) {
        const relatedNotes = [];
        
        for (const existingNote of this.notes) {
            if (existingNote.id === note.id) continue;
            
            const similarity = this.calculateSimilarity(note, existingNote);
            if (similarity > 0.3) {
                relatedNotes.push({
                    id: existingNote.id,
                    title: existingNote.title,
                    similarity: similarity
                });
            }
        }
        
        return relatedNotes.sort((a, b) => b.similarity - a.similarity).slice(0, 5);
    }

    // Calculate similarity between notes
    calculateSimilarity(note1, note2) {
        const tags1 = new Set([...note1.tags, ...note1.aiTags]);
        const tags2 = new Set([...note2.tags, ...note2.aiTags]);
        
        const intersection = new Set([...tags1].filter(x => tags2.has(x)));
        const union = new Set([...tags1, ...tags2]);
        
        const tagSimilarity = intersection.size / union.size;
        
        // Also consider content similarity (basic keyword matching)
        const keywords1 = this.extractKeywords(note1.content);
        const keywords2 = this.extractKeywords(note2.content);
        
        const keywordIntersection = keywords1.filter(k => keywords2.includes(k));
        const keywordSimilarity = keywordIntersection.length / Math.max(keywords1.length, keywords2.length, 1);
        
        return (tagSimilarity * 0.7) + (keywordSimilarity * 0.3);
    }

    // Extract keywords from content
    extractKeywords(content) {
        const stopWords = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'is', 'are', 'was', 'were', 'be', 'been', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'can', 'this', 'that', 'these', 'those']);
        
        return content.toLowerCase()
            .replace(/[^\w\s]/g, ' ')
            .split(/\s+/)
            .filter(word => word.length > 3 && !stopWords.has(word))
            .slice(0, 20);
    }

    // Update an existing note
    async updateNote(noteId, updates) {
        const noteIndex = this.notes.findIndex(note => note.id === noteId);
        if (noteIndex === -1) {
            throw new Error('Note not found');
        }

        const note = this.notes[noteIndex];
        Object.assign(note, updates);
        note.updatedAt = new Date().toISOString();

        // Re-analyze with AI if content changed
        if (updates.content) {
            note.metadata.wordCount = this.countWords(note.content);
            note.metadata.readingTime = this.estimateReadingTime(note.content);
            await this.enhanceNoteWithAI(note);
        }

        await this.saveNotes();
        return note;
    }

    // Delete a note
    async deleteNote(noteId) {
        const noteIndex = this.notes.findIndex(note => note.id === noteId);
        if (noteIndex === -1) {
            throw new Error('Note not found');
        }

        this.notes.splice(noteIndex, 1);
        await this.saveNotes();
    }

    // Search notes with advanced filtering
    searchNotes(query, filters = {}) {
        let results = this.notes;

        // Text search
        if (query) {
            const searchTerms = query.toLowerCase().split(' ');
            results = results.filter(note => {
                const searchText = [
                    note.title,
                    note.content,
                    note.summary,
                    ...note.tags,
                    ...note.aiTags,
                    ...note.keyPoints
                ].join(' ').toLowerCase();

                return searchTerms.every(term => searchText.includes(term));
            });
        }

        // Filter by category
        if (filters.category) {
            results = results.filter(note => note.category === filters.category);
        }

        // Filter by tags
        if (filters.tags && filters.tags.length > 0) {
            results = results.filter(note => {
                const noteTags = [...note.tags, ...note.aiTags];
                return filters.tags.some(tag => noteTags.includes(tag));
            });
        }

        // Filter by importance
        if (filters.importance) {
            results = results.filter(note => note.importance === filters.importance);
        }

        // Filter by date range
        if (filters.dateFrom) {
            results = results.filter(note => new Date(note.createdAt) >= new Date(filters.dateFrom));
        }
        if (filters.dateTo) {
            results = results.filter(note => new Date(note.createdAt) <= new Date(filters.dateTo));
        }

        // Filter by source
        if (filters.source) {
            results = results.filter(note => note.source.toLowerCase().includes(filters.source.toLowerCase()));
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

    // Get note by ID
    getNote(noteId) {
        return this.notes.find(note => note.id === noteId);
    }

    // Get all notes
    getAllNotes() {
        return this.notes;
    }

    // Get all tags
    getAllTags() {
        const allTags = new Set();
        this.notes.forEach(note => {
            [...note.tags, ...note.aiTags].forEach(tag => allTags.add(tag));
        });
        return Array.from(allTags).sort();
    }

    // Get notes by tag
    getNotesByTag(tag) {
        return this.notes.filter(note => 
            note.tags.includes(tag) || note.aiTags.includes(tag)
        );
    }

    // Export notes
    exportNotes(format = 'json') {
        switch (format) {
            case 'json':
                return JSON.stringify(this.notes, null, 2);
            case 'markdown':
                return this.exportToMarkdown();
            case 'csv':
                return this.exportToCSV();
            default:
                throw new Error('Unsupported export format');
        }
    }

    // Export to Markdown
    exportToMarkdown() {
        let markdown = '# Research Notes\n\n';
        
        this.notes.forEach(note => {
            markdown += `## ${note.title}\n\n`;
            markdown += `**Created:** ${new Date(note.createdAt).toLocaleDateString()}\n`;
            markdown += `**Category:** ${note.category}\n`;
            markdown += `**Importance:** ${note.importance}\n`;
            markdown += `**Tags:** ${[...note.tags, ...note.aiTags].join(', ')}\n`;
            if (note.url) markdown += `**Source:** ${note.url}\n`;
            markdown += '\n';
            
            if (note.summary) {
                markdown += `**Summary:** ${note.summary}\n\n`;
            }
            
            if (note.keyPoints.length > 0) {
                markdown += '**Key Points:**\n';
                note.keyPoints.forEach(point => {
                    markdown += `- ${point}\n`;
                });
                markdown += '\n';
            }
            
            markdown += `**Content:**\n${note.content}\n\n`;
            markdown += '---\n\n';
        });
        
        return markdown;
    }

    // Export to CSV
    exportToCSV() {
        const headers = ['ID', 'Title', 'Category', 'Importance', 'Tags', 'Created', 'Updated', 'Word Count', 'Summary', 'Content'];
        let csv = headers.join(',') + '\n';
        
        this.notes.forEach(note => {
            const row = [
                note.id,
                `"${note.title.replace(/"/g, '""')}"`,
                note.category,
                note.importance,
                `"${[...note.tags, ...note.aiTags].join('; ')}"`,
                note.createdAt,
                note.updatedAt,
                note.metadata.wordCount,
                `"${note.summary.replace(/"/g, '""')}"`,
                `"${note.content.replace(/"/g, '""').substring(0, 500)}..."`
            ];
            csv += row.join(',') + '\n';
        });
        
        return csv;
    }

    // Import notes
    async importNotes(data, format = 'json') {
        try {
            let importedNotes = [];
            
            switch (format) {
                case 'json':
                    importedNotes = JSON.parse(data);
                    break;
                default:
                    throw new Error('Unsupported import format');
            }
            
            for (const noteData of importedNotes) {
                // Ensure required fields
                if (!noteData.content) continue;
                
                const note = {
                    id: this.generateId(),
                    title: noteData.title || this.extractTitle(noteData.content),
                    content: noteData.content,
                    url: noteData.url || null,
                    source: noteData.source || 'Imported',
                    category: noteData.category || 'Research',
                    tags: noteData.tags || [],
                    aiTags: noteData.aiTags || [],
                    summary: noteData.summary || '',
                    keyPoints: noteData.keyPoints || [],
                    relatedNotes: [],
                    importance: noteData.importance || 'medium',
                    status: 'active',
                    createdAt: noteData.createdAt || new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                    metadata: {
                        wordCount: this.countWords(noteData.content),
                        readingTime: this.estimateReadingTime(noteData.content),
                        language: 'en',
                        contentType: this.detectContentType(noteData.content)
                    }
                };
                
                this.notes.push(note);
            }
            
            await this.saveNotes();
            return importedNotes.length;
        } catch (error) {
            throw new Error('Failed to import notes: ' + error.message);
        }
    }

    // Helper methods
    generateId() {
        return 'note_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    extractTitle(content) {
        const firstLine = content.split('\n')[0].trim();
        return firstLine.length > 0 ? firstLine.substring(0, 100) : 'Untitled Note';
    }

    countWords(text) {
        return text.trim().split(/\s+/).length;
    }

    estimateReadingTime(text) {
        const wordsPerMinute = 200;
        const words = this.countWords(text);
        return Math.ceil(words / wordsPerMinute);
    }

    detectContentType(content) {
        if (content.includes('```') || content.includes('function') || content.includes('class ')) {
            return 'code';
        }
        if (content.includes('http') && content.includes('://')) {
            return 'web_content';
        }
        if (content.includes('Abstract:') || content.includes('Introduction:')) {
            return 'academic';
        }
        return 'text';
    }

    generateBasicTags(content) {
        const keywords = this.extractKeywords(content);
        return keywords.slice(0, 5);
    }

    generateBasicSummary(content) {
        const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 10);
        return sentences.slice(0, 2).join('. ').trim() + '.';
    }

    async callLMStudio(prompt) {
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
                temperature: 0.3,
                max_tokens: 500
            })
        });

        if (!response.ok) {
            throw new Error(`LM Studio API error: ${response.status}`);
        }

        const data = await response.json();
        return data.choices[0].message.content;
    }

    async saveNotes() {
        try {
            await browser.storage.local.set({
                [this.storageKey]: this.notes
            });
        } catch (error) {
            console.error('Error saving notes:', error);
            throw error;
        }
    }

    async loadNotes() {
        try {
            const result = await browser.storage.local.get(this.storageKey);
            this.notes = result[this.storageKey] || [];
            
            // Update tags set
            this.notes.forEach(note => {
                [...note.tags, ...note.aiTags].forEach(tag => this.tags.add(tag));
            });
        } catch (error) {
            console.error('Error loading notes:', error);
            this.notes = [];
        }
    }
}
