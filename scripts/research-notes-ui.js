// Research Notes UI Controller
class ResearchNotesUI {
    constructor() {
        this.notes = [];
        this.filteredNotes = [];
        this.selectedTags = new Set();
        this.currentFilters = {
            search: '',
            category: '',
            importance: '',
            sortBy: 'updatedAt',
            sortOrder: 'desc'
        };
        this.currentNoteId = null;
        
        this.init();
    }

    async init() {
        this.setupEventListeners();
        await this.loadNotes();
        await this.loadTags();
        this.renderNotes();
        this.updateStats();
    }

    setupEventListeners() {
        // Header actions
        document.getElementById('newNoteBtn').addEventListener('click', () => this.showNoteModal());
        document.getElementById('capturePageBtn').addEventListener('click', () => this.captureCurrentPage());
        document.getElementById('importNotesBtn').addEventListener('click', () => this.showImportModal());
        document.getElementById('exportNotesBtn').addEventListener('click', () => this.showExportModal());

        // Search and filters
        document.getElementById('searchInput').addEventListener('input', (e) => this.updateFilter('search', e.target.value));
        document.getElementById('categoryFilter').addEventListener('change', (e) => this.updateFilter('category', e.target.value));
        document.getElementById('importanceFilter').addEventListener('change', (e) => this.updateFilter('importance', e.target.value));
        document.getElementById('sortByFilter').addEventListener('change', (e) => this.updateFilter('sortBy', e.target.value));
        document.getElementById('sortOrderFilter').addEventListener('change', (e) => this.updateFilter('sortOrder', e.target.value));

        // Modal controls
        this.setupModalControls();

        // Form submissions
        document.getElementById('noteForm').addEventListener('submit', (e) => this.handleNoteSubmit(e));
        document.getElementById('executeImportBtn').addEventListener('click', () => this.executeImport());
        document.getElementById('executeExportBtn').addEventListener('click', () => this.executeExport());
    }

    setupModalControls() {
        // Close modals
        document.querySelectorAll('.close').forEach(closeBtn => {
            closeBtn.addEventListener('click', (e) => {
                const modal = e.target.closest('.modal');
                if (modal) modal.style.display = 'none';
            });
        });

        // Cancel buttons
        document.getElementById('cancelNoteBtn').addEventListener('click', () => {
            document.getElementById('noteModal').style.display = 'none';
        });
        document.getElementById('cancelImportBtn').addEventListener('click', () => {
            document.getElementById('importModal').style.display = 'none';
        });
        document.getElementById('cancelExportBtn').addEventListener('click', () => {
            document.getElementById('exportModal').style.display = 'none';
        });

        // Note details actions
        document.getElementById('editNoteBtn').addEventListener('click', () => this.editCurrentNote());
        document.getElementById('deleteNoteBtn').addEventListener('click', () => this.deleteCurrentNote());

        // Click outside to close
        window.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal')) {
                e.target.style.display = 'none';
            }
        });
    }

    async loadNotes() {
        try {
            const response = await browser.runtime.sendMessage({
                type: 'GET_RESEARCH_NOTES'
            });

            if (response.success) {
                this.notes = response.notes || [];
                this.applyFilters();
            } else {
                this.showNotification('Failed to load notes: ' + response.error, 'error');
            }
        } catch (error) {
            console.error('Error loading notes:', error);
            this.showNotification('Error loading notes', 'error');
        }
    }

    async loadTags() {
        try {
            const response = await browser.runtime.sendMessage({
                type: 'GET_ALL_TAGS'
            });

            if (response.success) {
                this.renderTags(response.tags || []);
            }
        } catch (error) {
            console.error('Error loading tags:', error);
        }
    }

    updateFilter(type, value) {
        this.currentFilters[type] = value;
        this.applyFilters();
        this.renderNotes();
    }

    applyFilters() {
        let filtered = [...this.notes];

        // Search filter
        if (this.currentFilters.search) {
            const searchTerm = this.currentFilters.search.toLowerCase();
            filtered = filtered.filter(note => {
                const searchableText = [
                    note.title,
                    note.content,
                    note.summary || '',
                    ...note.tags,
                    ...note.aiTags,
                    ...note.keyPoints
                ].join(' ').toLowerCase();
                return searchableText.includes(searchTerm);
            });
        }

        // Category filter
        if (this.currentFilters.category) {
            filtered = filtered.filter(note => note.category === this.currentFilters.category);
        }

        // Importance filter
        if (this.currentFilters.importance) {
            filtered = filtered.filter(note => note.importance === this.currentFilters.importance);
        }

        // Tag filter
        if (this.selectedTags.size > 0) {
            filtered = filtered.filter(note => {
                const noteTags = [...note.tags, ...note.aiTags];
                return Array.from(this.selectedTags).some(tag => noteTags.includes(tag));
            });
        }

        // Sort
        filtered.sort((a, b) => {
            let aVal = a[this.currentFilters.sortBy];
            let bVal = b[this.currentFilters.sortBy];
            
            if (this.currentFilters.sortBy === 'createdAt' || this.currentFilters.sortBy === 'updatedAt') {
                aVal = new Date(aVal);
                bVal = new Date(bVal);
            }
            
            if (this.currentFilters.sortOrder === 'desc') {
                return bVal > aVal ? 1 : -1;
            } else {
                return aVal > bVal ? 1 : -1;
            }
        });

        this.filteredNotes = filtered;
    }

    renderNotes() {
        const grid = document.getElementById('notesGrid');
        
        if (this.filteredNotes.length === 0) {
            grid.innerHTML = `
                <div class="empty-state">
                    <h3>No notes found</h3>
                    <p>Try adjusting your filters or create a new note.</p>
                    <button class="btn btn-primary" onclick="researchNotesUI.showNoteModal()">
                        ➕ Create Note
                    </button>
                </div>
            `;
            return;
        }

        grid.innerHTML = this.filteredNotes.map(note => this.createNoteCard(note)).join('');
    }

    createNoteCard(note) {
        const importanceClass = `${note.importance}-importance`;
        const allTags = [...note.tags, ...note.aiTags];
        
        return `
            <div class="note-card ${importanceClass}" onclick="researchNotesUI.showNoteDetails('${note.id}')">
                <div class="note-header">
                    <div class="note-category">${note.category}</div>
                </div>
                
                <div class="note-title">${this.escapeHtml(note.title)}</div>
                
                ${note.summary ? `
                    <div class="note-summary">${this.escapeHtml(note.summary)}</div>
                ` : ''}
                
                <div class="note-content">${this.escapeHtml(note.content)}</div>
                
                ${allTags.length > 0 ? `
                    <div class="note-tags">
                        ${allTags.slice(0, 6).map(tag => `
                            <span class="note-tag ${note.aiTags.includes(tag) ? 'ai-tag' : ''}">${tag}</span>
                        `).join('')}
                        ${allTags.length > 6 ? `<span class="note-tag">+${allTags.length - 6}</span>` : ''}
                    </div>
                ` : ''}
                
                <div class="note-meta">
                    <div>📅 ${new Date(note.createdAt).toLocaleDateString()}</div>
                    <div>📊 ${note.metadata.wordCount} words</div>
                    <div>⏱️ ${note.metadata.readingTime} min read</div>
                    <div>🔗 ${note.url ? 'Has source' : 'No source'}</div>
                </div>
                
                <div class="note-actions" onclick="event.stopPropagation()">
                    <button class="btn btn-info" onclick="researchNotesUI.showNoteDetails('${note.id}')">
                        👁️ View
                    </button>
                    <button class="btn btn-secondary" onclick="researchNotesUI.editNote('${note.id}')">
                        ✏️ Edit
                    </button>
                    <button class="btn btn-danger" onclick="researchNotesUI.deleteNote('${note.id}')">
                        🗑️ Delete
                    </button>
                </div>
            </div>
        `;
    }

    renderTags(tags) {
        const tagsList = document.getElementById('tagsList');
        
        if (tags.length === 0) {
            tagsList.innerHTML = '<p style="color: #718096; font-size: 12px;">No tags yet</p>';
            return;
        }

        // Count tag usage
        const tagCounts = {};
        this.notes.forEach(note => {
            [...note.tags, ...note.aiTags].forEach(tag => {
                tagCounts[tag] = (tagCounts[tag] || 0) + 1;
            });
        });

        tagsList.innerHTML = tags.map(tag => `
            <div class="tag-item ${this.selectedTags.has(tag) ? 'selected' : ''}" 
                 onclick="researchNotesUI.toggleTag('${tag}')">
                ${tag} <span class="tag-count">(${tagCounts[tag] || 0})</span>
            </div>
        `).join('');
    }

    toggleTag(tag) {
        if (this.selectedTags.has(tag)) {
            this.selectedTags.delete(tag);
        } else {
            this.selectedTags.add(tag);
        }
        
        this.applyFilters();
        this.renderNotes();
        this.loadTags(); // Re-render tags to update selection
    }

    updateStats() {
        const totalNotes = this.notes.length;
        const totalWords = this.notes.reduce((sum, note) => sum + note.metadata.wordCount, 0);
        const avgReadingTime = totalNotes > 0 ? Math.round(this.notes.reduce((sum, note) => sum + note.metadata.readingTime, 0) / totalNotes) : 0;

        document.getElementById('totalNotes').textContent = totalNotes;
        document.getElementById('totalWords').textContent = totalWords.toLocaleString();
        document.getElementById('avgReadingTime').textContent = avgReadingTime + ' min';
    }

    showNoteModal(noteId = null) {
        const modal = document.getElementById('noteModal');
        const title = document.getElementById('modalTitle');
        
        if (noteId) {
            const note = this.notes.find(n => n.id === noteId);
            if (!note) return;
            
            title.textContent = 'Edit Note';
            this.populateNoteForm(note);
            this.currentNoteId = noteId;
        } else {
            title.textContent = 'Create New Note';
            this.resetNoteForm();
            this.currentNoteId = null;
        }
        
        modal.style.display = 'block';
    }

    populateNoteForm(note) {
        document.getElementById('noteTitle').value = note.title;
        document.getElementById('noteContent').value = note.content;
        document.getElementById('noteCategory').value = note.category;
        document.getElementById('noteImportance').value = note.importance;
        document.getElementById('noteTags').value = note.tags.join(', ');
        document.getElementById('noteUrl').value = note.url || '';
        document.getElementById('useAI').checked = true;
    }

    resetNoteForm() {
        document.getElementById('noteForm').reset();
        document.getElementById('useAI').checked = true;
    }

    async handleNoteSubmit(e) {
        e.preventDefault();
        
        const config = {
            title: document.getElementById('noteTitle').value.trim(),
            content: document.getElementById('noteContent').value.trim(),
            category: document.getElementById('noteCategory').value,
            importance: document.getElementById('noteImportance').value,
            tags: document.getElementById('noteTags').value.split(',').map(tag => tag.trim()).filter(tag => tag),
            url: document.getElementById('noteUrl').value.trim() || null,
            useAI: document.getElementById('useAI').checked
        };

        if (!config.content) {
            this.showNotification('Please enter note content', 'error');
            return;
        }

        try {
            let response;
            if (this.currentNoteId) {
                // Update existing note
                response = await browser.runtime.sendMessage({
                    type: 'UPDATE_RESEARCH_NOTE',
                    noteId: this.currentNoteId,
                    updates: config
                });
            } else {
                // Create new note
                response = await browser.runtime.sendMessage({
                    type: 'CREATE_RESEARCH_NOTE',
                    config: config
                });
            }

            if (response.success) {
                this.showNotification(this.currentNoteId ? 'Note updated successfully' : 'Note created successfully', 'success');
                document.getElementById('noteModal').style.display = 'none';
                await this.loadNotes();
                await this.loadTags();
                this.renderNotes();
                this.updateStats();
            } else {
                this.showNotification('Failed to save note: ' + response.error, 'error');
            }
        } catch (error) {
            console.error('Error saving note:', error);
            this.showNotification('Error saving note', 'error');
        }
    }

    async captureCurrentPage() {
        try {
            const tabs = await browser.tabs.query({ active: true, currentWindow: true });
            if (tabs.length === 0) return;

            const tab = tabs[0];
            
            // Extract page content
            const response = await browser.tabs.sendMessage(tab.id, {
                type: 'EXTRACT_RELEVANT_CONTENT',
                query: 'main content and key information'
            });

            if (response && response.content) {
                this.showNoteModal();
                document.getElementById('noteTitle').value = tab.title;
                document.getElementById('noteContent').value = response.content;
                document.getElementById('noteUrl').value = tab.url;
                document.getElementById('noteCategory').value = 'Article';
            } else {
                this.showNotification('Could not extract content from current page', 'warning');
            }
        } catch (error) {
            console.error('Error capturing page:', error);
            this.showNotification('Error capturing page content', 'error');
        }
    }

    showNoteDetails(noteId) {
        const note = this.notes.find(n => n.id === noteId);
        if (!note) return;

        this.currentNoteId = noteId;
        
        const modal = document.getElementById('noteDetailsModal');
        const title = document.getElementById('noteDetailsTitle');
        const content = document.getElementById('noteDetailsContent');

        title.textContent = note.title;
        content.innerHTML = this.createNoteDetailsHTML(note);
        modal.style.display = 'block';
    }

    createNoteDetailsHTML(note) {
        const allTags = [...note.tags, ...note.aiTags];
        
        return `
            <div class="note-details">
                <div class="note-details-section">
                    <h3>📝 Content</h3>
                    <div style="white-space: pre-wrap; line-height: 1.6;">${this.escapeHtml(note.content)}</div>
                </div>

                ${note.summary ? `
                    <div class="note-details-section">
                        <h3>📄 AI Summary</h3>
                        <p>${this.escapeHtml(note.summary)}</p>
                    </div>
                ` : ''}

                ${note.keyPoints.length > 0 ? `
                    <div class="note-details-section">
                        <h3>💡 Key Points</h3>
                        <ul class="key-points-list">
                            ${note.keyPoints.map(point => `<li>${this.escapeHtml(point)}</li>`).join('')}
                        </ul>
                    </div>
                ` : ''}

                ${allTags.length > 0 ? `
                    <div class="note-details-section">
                        <h3>🏷️ Tags</h3>
                        <div class="note-tags">
                            ${note.tags.map(tag => `<span class="note-tag">${tag}</span>`).join('')}
                            ${note.aiTags.map(tag => `<span class="note-tag ai-tag">${tag}</span>`).join('')}
                        </div>
                    </div>
                ` : ''}

                ${note.relatedNotes.length > 0 ? `
                    <div class="note-details-section">
                        <h3>🔗 Related Notes</h3>
                        <div class="related-notes-list">
                            ${note.relatedNotes.map(related => `
                                <div class="related-note-item" onclick="researchNotesUI.showNoteDetails('${related.id}')">
                                    <div class="related-note-title">${this.escapeHtml(related.title)}</div>
                                    <div class="related-note-similarity">${Math.round(related.similarity * 100)}% similarity</div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                ` : ''}

                <div class="note-details-section">
                    <h3>📊 Metadata</h3>
                    <div class="note-details-meta">
                        <div class="meta-item">
                            <div class="meta-label">Category</div>
                            <div class="meta-value">${note.category}</div>
                        </div>
                        <div class="meta-item">
                            <div class="meta-label">Importance</div>
                            <div class="meta-value">${note.importance}</div>
                        </div>
                        <div class="meta-item">
                            <div class="meta-label">Created</div>
                            <div class="meta-value">${new Date(note.createdAt).toLocaleString()}</div>
                        </div>
                        <div class="meta-item">
                            <div class="meta-label">Updated</div>
                            <div class="meta-value">${new Date(note.updatedAt).toLocaleString()}</div>
                        </div>
                        <div class="meta-item">
                            <div class="meta-label">Word Count</div>
                            <div class="meta-value">${note.metadata.wordCount}</div>
                        </div>
                        <div class="meta-item">
                            <div class="meta-label">Reading Time</div>
                            <div class="meta-value">${note.metadata.readingTime} minutes</div>
                        </div>
                        ${note.url ? `
                            <div class="meta-item">
                                <div class="meta-label">Source</div>
                                <div class="meta-value"><a href="${note.url}" target="_blank">${note.url}</a></div>
                            </div>
                        ` : ''}
                    </div>
                </div>
            </div>
        `;
    }

    editNote(noteId) {
        this.showNoteModal(noteId);
    }

    editCurrentNote() {
        if (this.currentNoteId) {
            document.getElementById('noteDetailsModal').style.display = 'none';
            this.showNoteModal(this.currentNoteId);
        }
    }

    async deleteNote(noteId) {
        if (!confirm('Are you sure you want to delete this note?')) {
            return;
        }

        try {
            const response = await browser.runtime.sendMessage({
                type: 'DELETE_RESEARCH_NOTE',
                noteId: noteId
            });

            if (response.success) {
                this.showNotification('Note deleted successfully', 'success');
                await this.loadNotes();
                await this.loadTags();
                this.renderNotes();
                this.updateStats();
            } else {
                this.showNotification('Failed to delete note: ' + response.error, 'error');
            }
        } catch (error) {
            console.error('Error deleting note:', error);
            this.showNotification('Error deleting note', 'error');
        }
    }

    async deleteCurrentNote() {
        if (this.currentNoteId) {
            document.getElementById('noteDetailsModal').style.display = 'none';
            await this.deleteNote(this.currentNoteId);
        }
    }

    showImportModal() {
        document.getElementById('importModal').style.display = 'block';
    }

    showExportModal() {
        document.getElementById('exportModal').style.display = 'block';
    }

    async executeImport() {
        const fileInput = document.getElementById('importFile');
        const format = document.getElementById('importFormat').value;
        
        if (!fileInput.files.length) {
            this.showNotification('Please select a file to import', 'error');
            return;
        }

        try {
            const file = fileInput.files[0];
            const text = await file.text();
            
            const response = await browser.runtime.sendMessage({
                type: 'IMPORT_RESEARCH_NOTES',
                data: text,
                format: format
            });

            if (response.success) {
                this.showNotification(`Successfully imported ${response.importedCount} notes`, 'success');
                document.getElementById('importModal').style.display = 'none';
                await this.loadNotes();
                await this.loadTags();
                this.renderNotes();
                this.updateStats();
            } else {
                this.showNotification('Failed to import notes: ' + response.error, 'error');
            }
        } catch (error) {
            console.error('Error importing notes:', error);
            this.showNotification('Error importing notes', 'error');
        }
    }

    async executeExport() {
        const format = document.getElementById('exportFormat').value;
        
        try {
            const response = await browser.runtime.sendMessage({
                type: 'EXPORT_RESEARCH_NOTES',
                format: format
            });

            if (response.success) {
                const blob = new Blob([response.data], { 
                    type: format === 'json' ? 'application/json' : 'text/plain' 
                });
                
                const link = document.createElement('a');
                link.href = URL.createObjectURL(blob);
                link.download = `research-notes-${new Date().toISOString().split('T')[0]}.${format}`;
                link.click();
                
                this.showNotification('Notes exported successfully', 'success');
                document.getElementById('exportModal').style.display = 'none';
            } else {
                this.showNotification('Failed to export notes: ' + response.error, 'error');
            }
        } catch (error) {
            console.error('Error exporting notes:', error);
            this.showNotification('Error exporting notes', 'error');
        }
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.remove();
        }, 5000);
    }
}

// Initialize the UI when the page loads
let researchNotesUI;
document.addEventListener('DOMContentLoaded', () => {
    researchNotesUI = new ResearchNotesUI();
});
