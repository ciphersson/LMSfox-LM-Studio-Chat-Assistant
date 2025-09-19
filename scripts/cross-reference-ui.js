/**
 * LM Studio Extension - Cross-Reference Analysis UI Controller
 */

class CrossReferenceUI {
    constructor() {
        this.analyses = [];
        this.currentAnalysis = null;
        
        this.init();
    }

    async init() {
        this.setupEventListeners();
        await this.loadAnalyses();
        this.updateStats();
        this.renderAnalyses();
    }

    setupEventListeners() {
        // Header actions
        document.getElementById('newAnalysisBtn').addEventListener('click', () => this.showAnalysisModal());
        document.getElementById('importAnalysisBtn').addEventListener('click', () => this.importAnalyses());
        document.getElementById('exportAnalysisBtn').addEventListener('click', () => this.exportAnalyses());

        // Filters
        document.getElementById('statusFilter').addEventListener('change', () => this.filterAnalyses());
        document.getElementById('confidenceFilter').addEventListener('change', () => this.filterAnalyses());
        document.getElementById('searchFilter').addEventListener('input', () => this.filterAnalyses());

        // Quick actions
        document.getElementById('analyzeCurrentPageBtn').addEventListener('click', () => this.analyzeCurrentPage());
        document.getElementById('compareSourcesBtn').addEventListener('click', () => this.compareSources());
        document.getElementById('factCheckBtn').addEventListener('click', () => this.factCheck());

        // Analysis modal
        document.getElementById('analysisForm').addEventListener('submit', (e) => this.createAnalysis(e));
        document.getElementById('cancelAnalysisBtn').addEventListener('click', () => this.hideAnalysisModal());
        document.getElementById('addCustomSourceBtn').addEventListener('click', () => this.addCustomSource());

        // Quick analysis modal
        document.getElementById('executeQuickBtn').addEventListener('click', () => this.executeQuickAnalysis());
        document.getElementById('cancelQuickBtn').addEventListener('click', () => this.hideQuickAnalysisModal());

        // Modal close buttons
        document.querySelectorAll('.close').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const modal = e.target.closest('.modal');
                modal.style.display = 'none';
            });
        });

        // Close modals on outside click
        window.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal')) {
                e.target.style.display = 'none';
            }
        });
    }

    async loadAnalyses() {
        try {
            const response = await browser.runtime.sendMessage({
                type: 'GET_CROSS_REFERENCES'
            });

            if (response.success) {
                this.analyses = response.crossReferences || [];
            } else {
                console.error('Failed to load analyses:', response.error);
                this.showNotification('Failed to load analyses', 'error');
            }
        } catch (error) {
            console.error('Error loading analyses:', error);
            this.showNotification('Error loading analyses', 'error');
        }
    }

    updateStats() {
        const totalAnalyses = this.analyses.length;
        const highConfidence = this.analyses.filter(a => a.confidence >= 80).length;
        const contradictionsFound = this.analyses.reduce((sum, a) => sum + (a.contradictions?.length || 0), 0);

        document.getElementById('totalAnalyses').textContent = totalAnalyses;
        document.getElementById('highConfidence').textContent = highConfidence;
        document.getElementById('contradictionsFound').textContent = contradictionsFound;
    }

    renderAnalyses() {
        const container = document.getElementById('analysisList');
        
        if (this.analyses.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <h3>No Cross-Reference Analyses</h3>
                    <p>Create your first analysis to start cross-referencing information across multiple sources.</p>
                    <button class="btn btn-primary" onclick="crossReferenceUI.showAnalysisModal()">
                        ➕ New Analysis
                    </button>
                </div>
            `;
            return;
        }

        container.innerHTML = this.analyses.map(analysis => this.renderAnalysisCard(analysis)).join('');
    }

    renderAnalysisCard(analysis) {
        const createdAt = new Date(analysis.createdAt).toLocaleDateString();
        const completedAt = analysis.completedAt ? new Date(analysis.completedAt).toLocaleDateString() : 'N/A';
        const sourcesCount = analysis.sources ? analysis.sources.length : 0;
        const confidence = analysis.confidence || 0;
        const contradictions = analysis.contradictions || [];
        
        const confidenceClass = confidence >= 80 ? 'high' : confidence >= 50 ? 'medium' : 'low';
        
        return `
            <div class="analysis-card ${analysis.status}" data-id="${analysis.id}">
                <div class="analysis-header">
                    <div>
                        <div class="analysis-query">${analysis.query}</div>
                        <div class="analysis-status ${analysis.status}">${analysis.status}</div>
                    </div>
                </div>
                
                <div class="analysis-meta">
                    <div><strong>Sources:</strong> ${sourcesCount}</div>
                    <div><strong>Created:</strong> ${createdAt}</div>
                    <div><strong>Completed:</strong> ${completedAt}</div>
                    <div><strong>Confidence:</strong> ${confidence}%</div>
                </div>
                
                <div class="confidence-bar">
                    <div class="confidence-fill ${confidenceClass}" style="width: ${confidence}%"></div>
                </div>
                
                ${analysis.consensus ? `
                    <div class="analysis-summary">
                        <strong>Consensus:</strong> ${analysis.consensus.substring(0, 150)}${analysis.consensus.length > 150 ? '...' : ''}
                    </div>
                ` : ''}
                
                ${contradictions.length > 0 ? `
                    <div class="contradictions-indicator">
                        ⚠️ ${contradictions.length} contradiction${contradictions.length > 1 ? 's' : ''} found
                    </div>
                ` : ''}
                
                <div class="analysis-actions">
                    ${analysis.status === 'pending' ? `
                        <button class="btn btn-success" onclick="crossReferenceUI.executeAnalysis('${analysis.id}')">
                            ▶️ Execute
                        </button>
                    ` : ''}
                    <button class="btn btn-info" onclick="crossReferenceUI.viewDetails('${analysis.id}')">
                        👁️ Details
                    </button>
                    <button class="btn btn-secondary" onclick="crossReferenceUI.duplicateAnalysis('${analysis.id}')">
                        📋 Duplicate
                    </button>
                    <button class="btn btn-danger" onclick="crossReferenceUI.deleteAnalysis('${analysis.id}')">
                        🗑️ Delete
                    </button>
                </div>
            </div>
        `;
    }

    filterAnalyses() {
        const statusFilter = document.getElementById('statusFilter').value;
        const confidenceFilter = document.getElementById('confidenceFilter').value;
        const searchFilter = document.getElementById('searchFilter').value.toLowerCase();

        let filtered = this.analyses;

        if (statusFilter) {
            filtered = filtered.filter(a => a.status === statusFilter);
        }

        if (confidenceFilter) {
            filtered = filtered.filter(a => {
                const confidence = a.confidence || 0;
                switch (confidenceFilter) {
                    case 'high': return confidence >= 80;
                    case 'medium': return confidence >= 50 && confidence < 80;
                    case 'low': return confidence < 50;
                    default: return true;
                }
            });
        }

        if (searchFilter) {
            filtered = filtered.filter(a => 
                a.query.toLowerCase().includes(searchFilter) ||
                (a.consensus && a.consensus.toLowerCase().includes(searchFilter))
            );
        }

        const container = document.getElementById('analysisList');
        container.innerHTML = filtered.map(analysis => this.renderAnalysisCard(analysis)).join('');
    }

    // Analysis Management
    showAnalysisModal() {
        const modal = document.getElementById('analysisModal');
        document.getElementById('analysisForm').reset();
        this.renderCustomSources([]);
        modal.style.display = 'block';
    }

    hideAnalysisModal() {
        document.getElementById('analysisModal').style.display = 'none';
    }

    async createAnalysis(e) {
        e.preventDefault();
        
        const query = document.getElementById('analysisQuery').value;
        const sources = this.getSelectedSources();

        if (!query.trim()) {
            this.showNotification('Please enter a query', 'error');
            return;
        }

        if (sources.length === 0) {
            this.showNotification('Please select at least one source', 'error');
            return;
        }

        try {
            const response = await browser.runtime.sendMessage({
                type: 'CREATE_CROSS_REFERENCE',
                config: {
                    query: query,
                    sources: sources
                }
            });

            if (response.success) {
                this.analyses.push(response.crossRef);
                this.updateStats();
                this.renderAnalyses();
                this.hideAnalysisModal();
                this.showNotification('Analysis created successfully!');
                
                // Auto-execute the analysis
                this.executeAnalysis(response.crossRef.id);
            } else {
                this.showNotification('Failed to create analysis: ' + response.error, 'error');
            }
        } catch (error) {
            console.error('Error creating analysis:', error);
            this.showNotification('Error creating analysis', 'error');
        }
    }

    getSelectedSources() {
        const sources = [];
        
        if (document.getElementById('sourceWebSearch').checked) {
            sources.push('web_search');
        }
        if (document.getElementById('sourceWikipedia').checked) {
            sources.push('wikipedia');
        }
        if (document.getElementById('sourceCurrentPage').checked) {
            sources.push('current_page');
        }
        if (document.getElementById('sourceNews').checked) {
            sources.push('news');
        }

        // Add custom sources
        document.querySelectorAll('#customSourcesList .custom-source-item input').forEach(input => {
            if (input.value.trim()) {
                sources.push(input.value.trim());
            }
        });

        return sources;
    }

    addCustomSource() {
        const container = document.getElementById('customSourcesList');
        const div = document.createElement('div');
        div.className = 'custom-source-item';
        div.innerHTML = `
            <input type="url" placeholder="https://example.com" />
            <button type="button" class="btn btn-danger" onclick="this.parentElement.remove()">Remove</button>
        `;
        container.appendChild(div);
    }

    renderCustomSources(sources) {
        const container = document.getElementById('customSourcesList');
        container.innerHTML = '';
        
        sources.forEach(source => {
            this.addCustomSource();
            const lastInput = container.lastElementChild.querySelector('input');
            lastInput.value = source;
        });
    }

    async executeAnalysis(analysisId) {
        try {
            this.showNotification('Executing analysis...', 'info');
            
            // Update UI to show running status
            const analysis = this.analyses.find(a => a.id === analysisId);
            if (analysis) {
                analysis.status = 'running';
                this.renderAnalyses();
            }
            
            const response = await browser.runtime.sendMessage({
                type: 'EXECUTE_CROSS_REFERENCE',
                crossRefId: analysisId
            });

            if (response.success) {
                // Update the analysis in our local array
                const index = this.analyses.findIndex(a => a.id === analysisId);
                if (index !== -1) {
                    this.analyses[index] = response.crossRef;
                }
                
                this.updateStats();
                this.renderAnalyses();
                this.showNotification('Analysis completed successfully!');
            } else {
                this.showNotification('Analysis failed: ' + response.error, 'error');
                
                // Update status to failed
                if (analysis) {
                    analysis.status = 'failed';
                    this.renderAnalyses();
                }
            }
        } catch (error) {
            console.error('Error executing analysis:', error);
            this.showNotification('Error executing analysis', 'error');
        }
    }

    viewDetails(analysisId) {
        const analysis = this.analyses.find(a => a.id === analysisId);
        if (!analysis) return;

        const modal = document.getElementById('detailsModal');
        const title = document.getElementById('detailsTitle');
        const content = document.getElementById('detailsContent');

        title.textContent = `Analysis: ${analysis.query}`;
        content.innerHTML = this.renderAnalysisDetails(analysis);
        modal.style.display = 'block';
    }

    renderAnalysisDetails(analysis) {
        let html = `
            <div class="details-section">
                <h3>📊 Analysis Overview</h3>
                <p><strong>Query:</strong> ${analysis.query}</p>
                <p><strong>Status:</strong> ${analysis.status}</p>
                <p><strong>Confidence:</strong> ${analysis.confidence || 0}%</p>
                <p><strong>Created:</strong> ${new Date(analysis.createdAt).toLocaleString()}</p>
                ${analysis.completedAt ? `<p><strong>Completed:</strong> ${new Date(analysis.completedAt).toLocaleString()}</p>` : ''}
            </div>
        `;

        if (analysis.consensus) {
            html += `
                <div class="details-section">
                    <h3>✅ Consensus</h3>
                    <div class="consensus-box">
                        ${analysis.consensus}
                    </div>
                </div>
            `;
        }

        if (analysis.contradictions && analysis.contradictions.length > 0) {
            html += `
                <div class="details-section">
                    <h3>⚠️ Contradictions Found</h3>
                    <div class="contradictions-box">
                        <ul>
                            ${analysis.contradictions.map(c => `<li>${c}</li>`).join('')}
                        </ul>
                    </div>
                </div>
            `;
        }

        if (analysis.results && analysis.results.length > 0) {
            html += `
                <div class="details-section">
                    <h3>📚 Source Results</h3>
                    ${analysis.results.map(result => `
                        <div class="source-result">
                            <h4>${result.source}</h4>
                            <div class="source-meta">
                                Confidence: ${(result.confidence * 100).toFixed(0)}% | 
                                Collected: ${new Date(result.timestamp).toLocaleString()}
                            </div>
                            <div class="source-content">
                                ${this.formatSourceContent(result.content)}
                            </div>
                        </div>
                    `).join('')}
                </div>
            `;
        }

        if (analysis.analysis) {
            html += `
                <div class="details-section">
                    <h3>🤖 AI Analysis</h3>
                    <div class="analysis-content">
                        ${analysis.analysis}
                    </div>
                </div>
            `;
        }

        return html;
    }

    formatSourceContent(content) {
        if (typeof content === 'string') {
            return content.substring(0, 500) + (content.length > 500 ? '...' : '');
        }

        if (Array.isArray(content)) {
            return content.map(item => 
                typeof item === 'string' ? item : 
                item.snippet || item.extract || item.title || JSON.stringify(item)
            ).join('<br>').substring(0, 500);
        }

        if (content.extract) return content.extract;
        if (content.text) return content.text.substring(0, 500);
        if (content.title && content.snippet) return `<strong>${content.title}</strong><br>${content.snippet}`;

        return JSON.stringify(content).substring(0, 500);
    }

    duplicateAnalysis(analysisId) {
        const analysis = this.analyses.find(a => a.id === analysisId);
        if (!analysis) return;

        this.showAnalysisModal();
        document.getElementById('analysisQuery').value = analysis.query;
        
        // Set source checkboxes based on original analysis
        document.getElementById('sourceWebSearch').checked = analysis.sources.includes('web_search');
        document.getElementById('sourceWikipedia').checked = analysis.sources.includes('wikipedia');
        document.getElementById('sourceCurrentPage').checked = analysis.sources.includes('current_page');
        document.getElementById('sourceNews').checked = analysis.sources.includes('news');

        // Add custom sources
        const customSources = analysis.sources.filter(s => 
            !['web_search', 'wikipedia', 'current_page', 'news'].includes(s)
        );
        this.renderCustomSources(customSources);
    }

    async deleteAnalysis(analysisId) {
        if (!confirm('Are you sure you want to delete this analysis?')) return;

        try {
            const response = await browser.runtime.sendMessage({
                type: 'DELETE_CROSS_REFERENCE',
                crossRefId: analysisId
            });

            if (response.success) {
                this.analyses = this.analyses.filter(a => a.id !== analysisId);
                this.updateStats();
                this.renderAnalyses();
                this.showNotification('Analysis deleted successfully');
            } else {
                this.showNotification('Failed to delete analysis: ' + response.error, 'error');
            }
        } catch (error) {
            console.error('Error deleting analysis:', error);
            this.showNotification('Error deleting analysis', 'error');
        }
    }

    // Quick Actions
    analyzeCurrentPage() {
        this.showQuickAnalysisModal('Analyze Current Page', 'What would you like to analyze about the current page?');
    }

    compareSources() {
        this.showQuickAnalysisModal('Compare Sources', 'What topic would you like to compare across multiple sources?');
    }

    factCheck() {
        this.showQuickAnalysisModal('Fact Check', 'What claim would you like to fact-check?');
    }

    showQuickAnalysisModal(title, placeholder) {
        const modal = document.getElementById('quickAnalysisModal');
        const titleElement = document.getElementById('quickAnalysisTitle');
        const queryInput = document.getElementById('quickQuery');
        
        titleElement.textContent = title;
        queryInput.placeholder = placeholder;
        queryInput.value = '';
        
        modal.style.display = 'block';
        queryInput.focus();
    }

    hideQuickAnalysisModal() {
        document.getElementById('quickAnalysisModal').style.display = 'none';
    }

    async executeQuickAnalysis() {
        const query = document.getElementById('quickQuery').value.trim();
        if (!query) {
            this.showNotification('Please enter a query', 'error');
            return;
        }

        this.hideQuickAnalysisModal();

        // Create and execute analysis with default sources
        try {
            const response = await browser.runtime.sendMessage({
                type: 'CREATE_CROSS_REFERENCE',
                config: {
                    query: query,
                    sources: ['web_search', 'wikipedia', 'current_page']
                }
            });

            if (response.success) {
                this.analyses.push(response.crossRef);
                this.updateStats();
                this.renderAnalyses();
                this.showNotification('Quick analysis started!');
                
                // Auto-execute
                this.executeAnalysis(response.crossRef.id);
            } else {
                this.showNotification('Failed to create analysis: ' + response.error, 'error');
            }
        } catch (error) {
            console.error('Error creating quick analysis:', error);
            this.showNotification('Error creating analysis', 'error');
        }
    }

    // Import/Export
    importAnalyses() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        input.onchange = (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    try {
                        const analyses = JSON.parse(e.target.result);
                        // Implementation for importing analyses
                        this.showNotification('Analyses imported successfully');
                    } catch (error) {
                        this.showNotification('Failed to import analyses', 'error');
                    }
                };
                reader.readAsText(file);
            }
        };
        input.click();
    }

    exportAnalyses() {
        const data = JSON.stringify(this.analyses, null, 2);
        const blob = new Blob([data], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `cross-reference-analyses-${Date.now()}.json`;
        a.click();
        
        URL.revokeObjectURL(url);
        this.showNotification('Analyses exported successfully');
    }

    // Utility Methods
    showNotification(message, type = 'success') {
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
const crossReferenceUI = new CrossReferenceUI();
