// Citation Generator UI Controller
class CitationUI {
    constructor() {
        this.citations = [];
        this.filteredCitations = [];
        this.selectedFormat = 'apa';
        this.currentFilters = {
            search: '',
            type: '',
            sortBy: 'updatedAt',
            sortOrder: 'desc'
        };
        this.currentCitationId = null;
        
        this.init();
    }

    async init() {
        this.setupEventListeners();
        await this.loadCitations();
        this.renderCitations();
        this.updateStats();
        this.setupConditionalFields();
    }

    setupEventListeners() {
        // Header actions
        document.getElementById('newCitationBtn').addEventListener('click', () => this.showCitationModal());
        document.getElementById('citePageBtn').addEventListener('click', () => this.citeCurrentPage());
        document.getElementById('exportBibBtn').addEventListener('click', () => this.showExportModal());

        // Search and filters
        document.getElementById('searchInput').addEventListener('input', (e) => this.updateFilter('search', e.target.value));
        document.getElementById('typeFilter').addEventListener('change', (e) => this.updateFilter('type', e.target.value));
        document.getElementById('sortByFilter').addEventListener('change', (e) => this.updateFilter('sortBy', e.target.value));
        document.getElementById('sortOrderFilter').addEventListener('change', (e) => this.updateFilter('sortOrder', e.target.value));

        // Format selection
        document.querySelectorAll('.format-item').forEach(item => {
            item.addEventListener('click', (e) => this.selectFormat(e.currentTarget.dataset.format));
        });

        // Modal controls
        this.setupModalControls();

        // Form submissions
        document.getElementById('citationForm').addEventListener('submit', (e) => this.handleCitationSubmit(e));
        document.getElementById('executeExportBtn').addEventListener('click', () => this.executeExport());
        document.getElementById('selectAllBtn').addEventListener('click', () => this.selectAllCitations());

        // Source type change
        document.getElementById('sourceType').addEventListener('change', (e) => this.updateConditionalFields(e.target.value));
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
        document.getElementById('cancelCitationBtn').addEventListener('click', () => {
            document.getElementById('citationModal').style.display = 'none';
        });
        document.getElementById('cancelExportBtn').addEventListener('click', () => {
            document.getElementById('exportModal').style.display = 'none';
        });

        // Citation details actions
        document.getElementById('editCitationBtn').addEventListener('click', () => this.editCurrentCitation());
        document.getElementById('deleteCitationBtn').addEventListener('click', () => this.deleteCurrentCitation());

        // Click outside to close
        window.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal')) {
                e.target.style.display = 'none';
            }
        });
    }

    setupConditionalFields() {
        // Set today's date as default access date
        document.getElementById('accessDate').value = new Date().toISOString().split('T')[0];
    }

    updateConditionalFields(sourceType) {
        // Hide all conditional fields
        document.querySelectorAll('.conditional-fields').forEach(field => {
            field.classList.remove('active');
        });

        // Show relevant fields based on source type
        switch (sourceType) {
            case 'journal':
                document.getElementById('journalFields').classList.add('active');
                break;
            case 'book':
            case 'chapter':
                document.getElementById('bookFields').classList.add('active');
                break;
            case 'conference':
                document.getElementById('conferenceFields').classList.add('active');
                break;
            case 'thesis':
                document.getElementById('thesisFields').classList.add('active');
                break;
        }
    }

    async loadCitations() {
        try {
            const response = await browser.runtime.sendMessage({
                type: 'GET_CITATIONS'
            });

            if (response.success) {
                this.citations = response.citations || [];
                this.applyFilters();
            } else {
                this.showNotification('Failed to load citations: ' + response.error, 'error');
            }
        } catch (error) {
            console.error('Error loading citations:', error);
            this.showNotification('Error loading citations', 'error');
        }
    }

    updateFilter(type, value) {
        this.currentFilters[type] = value;
        this.applyFilters();
        this.renderCitations();
    }

    applyFilters() {
        let filtered = [...this.citations];

        // Search filter
        if (this.currentFilters.search) {
            const searchTerm = this.currentFilters.search.toLowerCase();
            filtered = filtered.filter(citation => {
                const searchableText = [
                    citation.title,
                    citation.authors.join(' '),
                    citation.publisher,
                    citation.journal,
                    ...citation.tags
                ].join(' ').toLowerCase();
                return searchableText.includes(searchTerm);
            });
        }

        // Type filter
        if (this.currentFilters.type) {
            filtered = filtered.filter(c => c.type === this.currentFilters.type);
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

        this.filteredCitations = filtered;
    }

    selectFormat(format) {
        this.selectedFormat = format;
        
        // Update UI
        document.querySelectorAll('.format-item').forEach(item => {
            item.classList.remove('selected');
        });
        document.querySelector(`[data-format="${format}"]`).classList.add('selected');
        
        // Re-render citations to show selected format
        this.renderCitations();
    }

    renderCitations() {
        const grid = document.getElementById('citationsGrid');
        
        if (this.filteredCitations.length === 0) {
            grid.innerHTML = `
                <div class="empty-state">
                    <h3>No citations found</h3>
                    <p>Try adjusting your filters or create a new citation.</p>
                    <button class="btn btn-primary" onclick="citationUI.showCitationModal()">
                        ➕ Create Citation
                    </button>
                </div>
            `;
            return;
        }

        grid.innerHTML = this.filteredCitations.map(citation => this.createCitationCard(citation)).join('');
    }

    createCitationCard(citation) {
        const typeClass = citation.type;
        const formattedCitation = citation.generatedCitations[this.selectedFormat] || 'Citation not generated';
        
        return `
            <div class="citation-card ${typeClass}" onclick="citationUI.showCitationDetails('${citation.id}')">
                <div class="citation-header">
                    <div class="citation-type">${this.getSourceTypeName(citation.type)}</div>
                </div>
                
                <div class="citation-title">${this.escapeHtml(citation.title)}</div>
                
                ${citation.authors.length > 0 ? `
                    <div class="citation-authors">${citation.authors.join(', ')}</div>
                ` : ''}
                
                <div class="citation-details">
                    ${citation.publisher ? `Publisher: ${citation.publisher}` : ''}
                    ${citation.journal ? `Journal: ${citation.journal}` : ''}
                    ${citation.publicationDate ? ` • ${new Date(citation.publicationDate).getFullYear()}` : ''}
                </div>
                
                <div class="citation-preview">
                    ${formattedCitation}
                </div>
                
                <div class="citation-meta">
                    <div>📅 ${new Date(citation.createdAt).toLocaleDateString()}</div>
                    <div>🔗 ${citation.url ? 'Has URL' : 'No URL'}</div>
                </div>
                
                ${citation.tags.length > 0 ? `
                    <div class="citation-tags">
                        ${citation.tags.slice(0, 4).map(tag => `
                            <span class="citation-tag">${tag}</span>
                        `).join('')}
                        ${citation.tags.length > 4 ? `<span class="citation-tag">+${citation.tags.length - 4}</span>` : ''}
                    </div>
                ` : ''}
                
                <div class="citation-actions" onclick="event.stopPropagation()">
                    <button class="btn btn-info" onclick="citationUI.showCitationDetails('${citation.id}')">
                        👁️ View
                    </button>
                    <button class="btn btn-secondary" onclick="citationUI.editCitation('${citation.id}')">
                        ✏️ Edit
                    </button>
                    <button class="btn btn-success" onclick="citationUI.copyCitation('${citation.id}', '${this.selectedFormat}')">
                        📋 Copy
                    </button>
                    <button class="btn btn-danger" onclick="citationUI.deleteCitation('${citation.id}')">
                        🗑️ Delete
                    </button>
                </div>
            </div>
        `;
    }

    updateStats() {
        const totalCitations = this.citations.length;
        
        // Find most popular format (placeholder logic)
        const popularFormat = 'APA';
        
        document.getElementById('totalCitations').textContent = totalCitations;
        document.getElementById('popularFormat').textContent = popularFormat;
    }

    showCitationModal(citationId = null) {
        const modal = document.getElementById('citationModal');
        const title = document.getElementById('modalTitle');
        
        if (citationId) {
            const citation = this.citations.find(c => c.id === citationId);
            if (!citation) return;
            
            title.textContent = 'Edit Citation';
            this.populateCitationForm(citation);
            this.currentCitationId = citationId;
        } else {
            title.textContent = 'Create New Citation';
            this.resetCitationForm();
            this.currentCitationId = null;
        }
        
        modal.style.display = 'block';
    }

    populateCitationForm(citation) {
        document.getElementById('sourceType').value = citation.type;
        document.getElementById('citationTitle').value = citation.title;
        document.getElementById('citationAuthors').value = citation.authors.join('\n');
        document.getElementById('citationUrl').value = citation.url || '';
        document.getElementById('accessDate').value = citation.accessDate || '';
        document.getElementById('publicationDate').value = citation.publicationDate || '';
        document.getElementById('citationPublisher').value = citation.publisher || '';
        document.getElementById('journalName').value = citation.journal || '';
        document.getElementById('volume').value = citation.volume || '';
        document.getElementById('issue').value = citation.issue || '';
        document.getElementById('pages').value = citation.pages || '';
        document.getElementById('edition').value = citation.edition || '';
        document.getElementById('location').value = citation.location || '';
        document.getElementById('conferenceName').value = citation.conference || '';
        document.getElementById('institution').value = citation.institution || '';
        document.getElementById('degree').value = citation.degree || '';
        document.getElementById('doi').value = citation.doi || '';
        document.getElementById('isbn').value = citation.isbn || '';
        document.getElementById('citationTags').value = citation.tags.join(', ');
        document.getElementById('citationNotes').value = citation.notes || '';
        
        this.updateConditionalFields(citation.type);
    }

    resetCitationForm() {
        document.getElementById('citationForm').reset();
        document.getElementById('accessDate').value = new Date().toISOString().split('T')[0];
        this.updateConditionalFields('website');
    }

    async handleCitationSubmit(e) {
        e.preventDefault();
        
        const sourceData = {
            type: document.getElementById('sourceType').value,
            title: document.getElementById('citationTitle').value.trim(),
            authors: document.getElementById('citationAuthors').value.split('\n').map(a => a.trim()).filter(a => a),
            url: document.getElementById('citationUrl').value.trim() || null,
            accessDate: document.getElementById('accessDate').value || null,
            publicationDate: document.getElementById('publicationDate').value || null,
            publisher: document.getElementById('citationPublisher').value.trim() || null,
            journal: document.getElementById('journalName').value.trim() || null,
            volume: document.getElementById('volume').value.trim() || null,
            issue: document.getElementById('issue').value.trim() || null,
            pages: document.getElementById('pages').value.trim() || null,
            edition: document.getElementById('edition').value.trim() || null,
            location: document.getElementById('location').value.trim() || null,
            conference: document.getElementById('conferenceName').value.trim() || null,
            institution: document.getElementById('institution').value.trim() || null,
            degree: document.getElementById('degree').value.trim() || null,
            doi: document.getElementById('doi').value.trim() || null,
            isbn: document.getElementById('isbn').value.trim() || null,
            tags: document.getElementById('citationTags').value.split(',').map(t => t.trim()).filter(t => t),
            notes: document.getElementById('citationNotes').value.trim() || null
        };

        if (!sourceData.title) {
            this.showNotification('Please enter a title', 'error');
            return;
        }

        try {
            let response;
            if (this.currentCitationId) {
                // Update existing citation
                response = await browser.runtime.sendMessage({
                    type: 'UPDATE_CITATION',
                    citationId: this.currentCitationId,
                    updates: sourceData
                });
            } else {
                // Create new citation
                response = await browser.runtime.sendMessage({
                    type: 'CREATE_CITATION',
                    sourceData: sourceData
                });
            }

            if (response.success) {
                this.showNotification(this.currentCitationId ? 'Citation updated successfully' : 'Citation created successfully', 'success');
                document.getElementById('citationModal').style.display = 'none';
                await this.loadCitations();
                this.renderCitations();
                this.updateStats();
            } else {
                this.showNotification('Failed to save citation: ' + response.error, 'error');
            }
        } catch (error) {
            console.error('Error saving citation:', error);
            this.showNotification('Error saving citation', 'error');
        }
    }

    async citeCurrentPage() {
        try {
            const tabs = await browser.tabs.query({ active: true, currentWindow: true });
            if (tabs.length === 0) return;

            const tab = tabs[0];
            
            this.showCitationModal();
            document.getElementById('citationTitle').value = tab.title;
            document.getElementById('citationUrl').value = tab.url;
            document.getElementById('citationPublisher').value = new URL(tab.url).hostname;
            document.getElementById('sourceType').value = 'website';
            this.updateConditionalFields('website');
            
            this.showNotification('Page information loaded. Please review and complete the citation details.', 'info');
        } catch (error) {
            console.error('Error citing current page:', error);
            this.showNotification('Error citing current page', 'error');
        }
    }

    showCitationDetails(citationId) {
        const citation = this.citations.find(c => c.id === citationId);
        if (!citation) return;

        this.currentCitationId = citationId;
        
        const modal = document.getElementById('citationDetailsModal');
        const title = document.getElementById('citationDetailsTitle');
        const content = document.getElementById('citationDetailsContent');

        title.textContent = citation.title;
        content.innerHTML = this.createCitationDetailsHTML(citation);
        modal.style.display = 'block';
    }

    createCitationDetailsHTML(citation) {
        return `
            <div class="citation-details">
                <div class="citation-details-section">
                    <h3>📝 Source Information</h3>
                    <div class="citation-details-meta">
                        <div class="meta-item">
                            <div class="meta-label">Type</div>
                            <div class="meta-value">${this.getSourceTypeName(citation.type)}</div>
                        </div>
                        <div class="meta-item">
                            <div class="meta-label">Title</div>
                            <div class="meta-value">${this.escapeHtml(citation.title)}</div>
                        </div>
                        ${citation.authors.length > 0 ? `
                            <div class="meta-item">
                                <div class="meta-label">Authors</div>
                                <div class="meta-value">${citation.authors.join(', ')}</div>
                            </div>
                        ` : ''}
                        ${citation.publisher ? `
                            <div class="meta-item">
                                <div class="meta-label">Publisher</div>
                                <div class="meta-value">${citation.publisher}</div>
                            </div>
                        ` : ''}
                        ${citation.publicationDate ? `
                            <div class="meta-item">
                                <div class="meta-label">Publication Date</div>
                                <div class="meta-value">${new Date(citation.publicationDate).toLocaleDateString()}</div>
                            </div>
                        ` : ''}
                        ${citation.url ? `
                            <div class="meta-item">
                                <div class="meta-label">URL</div>
                                <div class="meta-value"><a href="${citation.url}" target="_blank">${citation.url}</a></div>
                            </div>
                        ` : ''}
                    </div>
                </div>

                <div class="citation-details-section">
                    <h3>📚 Formatted Citations</h3>
                    <div class="formatted-citations">
                        ${Object.entries(citation.generatedCitations).map(([format, text]) => `
                            <div class="formatted-citation">
                                <div class="citation-format-label">${this.getFormatName(format)}</div>
                                <div class="citation-text">${text}</div>
                                <button class="copy-btn" onclick="citationUI.copyToClipboard('${text.replace(/'/g, "\\'")}')">📋 Copy</button>
                            </div>
                        `).join('')}
                    </div>
                </div>

                ${citation.tags.length > 0 ? `
                    <div class="citation-details-section">
                        <h3>🏷️ Tags</h3>
                        <div class="citation-tags">
                            ${citation.tags.map(tag => `<span class="citation-tag">${tag}</span>`).join('')}
                        </div>
                    </div>
                ` : ''}

                ${citation.notes ? `
                    <div class="citation-details-section">
                        <h3>📝 Notes</h3>
                        <p>${this.escapeHtml(citation.notes)}</p>
                    </div>
                ` : ''}

                <div class="citation-details-section">
                    <h3>📊 Metadata</h3>
                    <div class="citation-details-meta">
                        <div class="meta-item">
                            <div class="meta-label">Created</div>
                            <div class="meta-value">${new Date(citation.createdAt).toLocaleString()}</div>
                        </div>
                        <div class="meta-item">
                            <div class="meta-label">Updated</div>
                            <div class="meta-value">${new Date(citation.updatedAt).toLocaleString()}</div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    editCitation(citationId) {
        this.showCitationModal(citationId);
    }

    editCurrentCitation() {
        if (this.currentCitationId) {
            document.getElementById('citationDetailsModal').style.display = 'none';
            this.showCitationModal(this.currentCitationId);
        }
    }

    async deleteCitation(citationId) {
        if (!confirm('Are you sure you want to delete this citation?')) {
            return;
        }

        try {
            const response = await browser.runtime.sendMessage({
                type: 'DELETE_CITATION',
                citationId: citationId
            });

            if (response.success) {
                this.showNotification('Citation deleted successfully', 'success');
                await this.loadCitations();
                this.renderCitations();
                this.updateStats();
            } else {
                this.showNotification('Failed to delete citation: ' + response.error, 'error');
            }
        } catch (error) {
            console.error('Error deleting citation:', error);
            this.showNotification('Error deleting citation', 'error');
        }
    }

    async deleteCurrentCitation() {
        if (this.currentCitationId) {
            document.getElementById('citationDetailsModal').style.display = 'none';
            await this.deleteCitation(this.currentCitationId);
        }
    }

    async copyCitation(citationId, format) {
        const citation = this.citations.find(c => c.id === citationId);
        if (!citation) return;

        const text = citation.generatedCitations[format];
        if (text) {
            await this.copyToClipboard(text);
            this.showNotification('Citation copied to clipboard', 'success');
        }
    }

    async copyToClipboard(text) {
        try {
            await navigator.clipboard.writeText(text);
        } catch (error) {
            console.error('Failed to copy to clipboard:', error);
        }
    }

    showExportModal() {
        const modal = document.getElementById('exportModal');
        this.populateExportCitations();
        modal.style.display = 'block';
    }

    populateExportCitations() {
        const container = document.getElementById('citationSelection');
        
        container.innerHTML = this.citations.map(citation => `
            <div class="citation-checkbox">
                <input type="checkbox" id="export_${citation.id}" value="${citation.id}">
                <label for="export_${citation.id}" class="citation-checkbox-label">
                    ${this.escapeHtml(citation.title)}
                    <div class="citation-checkbox-meta">
                        ${citation.authors.join(', ')} • ${this.getSourceTypeName(citation.type)}
                    </div>
                </label>
            </div>
        `).join('');
    }

    selectAllCitations() {
        const checkboxes = document.querySelectorAll('#citationSelection input[type="checkbox"]');
        const allChecked = Array.from(checkboxes).every(cb => cb.checked);
        
        checkboxes.forEach(cb => {
            cb.checked = !allChecked;
        });
        
        document.getElementById('selectAllBtn').textContent = allChecked ? 'Select All' : 'Deselect All';
    }

    async executeExport() {
        const format = document.getElementById('exportFormat').value;
        const selectedIds = Array.from(document.querySelectorAll('#citationSelection input[type="checkbox"]:checked'))
            .map(cb => cb.value);
        
        if (selectedIds.length === 0) {
            this.showNotification('Please select at least one citation to export', 'error');
            return;
        }

        try {
            const response = await browser.runtime.sendMessage({
                type: 'EXPORT_BIBLIOGRAPHY',
                citationIds: selectedIds,
                format: format
            });

            if (response.success) {
                const blob = new Blob([response.bibliography], { type: 'text/plain' });
                const link = document.createElement('a');
                link.href = URL.createObjectURL(blob);
                link.download = `bibliography-${format}-${new Date().toISOString().split('T')[0]}.txt`;
                link.click();
                
                this.showNotification('Bibliography exported successfully', 'success');
                document.getElementById('exportModal').style.display = 'none';
            } else {
                this.showNotification('Failed to export bibliography: ' + response.error, 'error');
            }
        } catch (error) {
            console.error('Error exporting bibliography:', error);
            this.showNotification('Error exporting bibliography', 'error');
        }
    }

    getSourceTypeName(type) {
        const types = {
            'website': 'Website',
            'journal': 'Journal Article',
            'book': 'Book',
            'chapter': 'Book Chapter',
            'newspaper': 'Newspaper',
            'magazine': 'Magazine',
            'report': 'Report',
            'thesis': 'Thesis',
            'conference': 'Conference Paper',
            'video': 'Video',
            'podcast': 'Podcast',
            'social': 'Social Media',
            'software': 'Software',
            'dataset': 'Dataset'
        };
        return types[type] || type;
    }

    getFormatName(format) {
        const formats = {
            'apa': 'APA 7th Edition',
            'mla': 'MLA 9th Edition',
            'chicago': 'Chicago 17th Edition',
            'harvard': 'Harvard Style',
            'ieee': 'IEEE Style',
            'vancouver': 'Vancouver Style'
        };
        return formats[format] || format;
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
let citationUI;
document.addEventListener('DOMContentLoaded', () => {
    citationUI = new CitationUI();
});
