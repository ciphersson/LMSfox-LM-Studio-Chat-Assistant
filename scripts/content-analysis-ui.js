// Content Analysis UI Controller
class ContentAnalysisUI {
    constructor() {
        this.analyses = [];
        this.filteredAnalyses = [];
        this.currentFilters = {
            search: '',
            contentType: '',
            dateRange: '',
            sortBy: 'timestamp',
            sortOrder: 'desc'
        };
        this.currentAnalysisId = null;
        this.settings = {
            autoAnalyze: true,
            summaryLength: 'medium',
            includeKeyPoints: true,
            includeActionItems: true,
            includeInsights: true,
            analysisDelay: 2
        };
        
        this.init();
    }

    async init() {
        this.setupEventListeners();
        await this.loadAnalyses();
        await this.loadSettings();
        this.renderAnalyses();
        this.updateStats();
        this.updateCurrentPageInfo();
    }

    setupEventListeners() {
        // Header actions
        document.getElementById('analyzeCurrentPageBtn').addEventListener('click', () => this.analyzeCurrentPage());
        document.getElementById('settingsBtn').addEventListener('click', () => this.showSettingsModal());
        document.getElementById('exportAnalysisBtn').addEventListener('click', () => this.showExportModal());

        // Search and filters
        document.getElementById('searchInput').addEventListener('input', (e) => this.updateFilter('search', e.target.value));
        document.getElementById('contentTypeFilter').addEventListener('change', (e) => this.updateFilter('contentType', e.target.value));
        document.getElementById('dateFilter').addEventListener('change', (e) => this.updateFilter('dateRange', e.target.value));
        document.getElementById('sortByFilter').addEventListener('change', (e) => this.updateFilter('sortBy', e.target.value));
        document.getElementById('sortOrderFilter').addEventListener('change', (e) => this.updateFilter('sortOrder', e.target.value));

        // Modal controls
        this.setupModalControls();

        // Form submissions
        document.getElementById('settingsForm').addEventListener('submit', (e) => this.handleSettingsSubmit(e));
        document.getElementById('exportForm').addEventListener('submit', (e) => this.handleExportSubmit(e));

        // Analysis details actions
        document.getElementById('editAnalysisBtn').addEventListener('click', () => this.editCurrentAnalysis());
        document.getElementById('deleteAnalysisBtn').addEventListener('click', () => this.deleteCurrentAnalysis());
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
        document.getElementById('cancelSettingsBtn').addEventListener('click', () => {
            document.getElementById('settingsModal').style.display = 'none';
        });
        document.getElementById('cancelExportBtn').addEventListener('click', () => {
            document.getElementById('exportModal').style.display = 'none';
        });

        // Click outside to close
        window.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal')) {
                e.target.style.display = 'none';
            }
        });
    }

    async loadAnalyses() {
        try {
            const response = await browser.runtime.sendMessage({
                type: 'GET_CONTENT_ANALYSES'
            });

            if (response.success) {
                this.analyses = response.analyses || [];
                this.applyFilters();
            } else {
                this.showNotification('Failed to load analyses: ' + response.error, 'error');
            }
        } catch (error) {
            console.error('Error loading analyses:', error);
            this.showNotification('Error loading analyses', 'error');
        }
    }

    async loadSettings() {
        try {
            const response = await browser.runtime.sendMessage({
                type: 'GET_ANALYZER_SETTINGS'
            });

            if (response.success && response.settings) {
                this.settings = { ...this.settings, ...response.settings };
                this.populateSettingsForm();
            }
        } catch (error) {
            console.error('Error loading settings:', error);
        }
    }

    updateFilter(type, value) {
        this.currentFilters[type] = value;
        this.applyFilters();
        this.renderAnalyses();
    }

    applyFilters() {
        let filtered = [...this.analyses];

        // Search filter
        if (this.currentFilters.search) {
            const searchTerm = this.currentFilters.search.toLowerCase();
            filtered = filtered.filter(analysis => {
                const searchableText = [
                    analysis.title,
                    analysis.summary || '',
                    analysis.keyPoints?.join(' ') || '',
                    analysis.url
                ].join(' ').toLowerCase();
                return searchableText.includes(searchTerm);
            });
        }

        // Content type filter
        if (this.currentFilters.contentType) {
            filtered = filtered.filter(a => a.contentType === this.currentFilters.contentType);
        }

        // Date range filter
        if (this.currentFilters.dateRange) {
            const now = new Date();
            const filterDate = new Date();
            
            switch (this.currentFilters.dateRange) {
                case 'today':
                    filterDate.setHours(0, 0, 0, 0);
                    break;
                case 'week':
                    filterDate.setDate(now.getDate() - 7);
                    break;
                case 'month':
                    filterDate.setMonth(now.getMonth() - 1);
                    break;
                case 'year':
                    filterDate.setFullYear(now.getFullYear() - 1);
                    break;
            }
            
            if (this.currentFilters.dateRange !== '') {
                filtered = filtered.filter(a => new Date(a.timestamp) >= filterDate);
            }
        }

        // Sort
        filtered.sort((a, b) => {
            let aVal = a[this.currentFilters.sortBy];
            let bVal = b[this.currentFilters.sortBy];
            
            if (this.currentFilters.sortBy === 'timestamp') {
                aVal = new Date(aVal);
                bVal = new Date(bVal);
            }
            
            if (this.currentFilters.sortOrder === 'desc') {
                return bVal > aVal ? 1 : -1;
            } else {
                return aVal > bVal ? 1 : -1;
            }
        });

        this.filteredAnalyses = filtered;
    }

    renderAnalyses() {
        const grid = document.getElementById('analysisGrid');
        
        if (this.filteredAnalyses.length === 0) {
            grid.innerHTML = `
                <div class="empty-state">
                    <h3>No analyses found</h3>
                    <p>Try adjusting your filters or analyze a new page.</p>
                    <button class="btn btn-primary" onclick="contentAnalysisUI.analyzeCurrentPage()">
                        🔍 Analyze Current Page
                    </button>
                </div>
            `;
            return;
        }

        grid.innerHTML = this.filteredAnalyses.map(analysis => this.createAnalysisCard(analysis)).join('');
    }

    createAnalysisCard(analysis) {
        const typeClass = analysis.contentType || 'general_webpage';
        const summary = analysis.summary || 'No summary available';
        const keyPointsCount = analysis.keyPoints?.length || 0;
        const actionItemsCount = analysis.actionItems?.length || 0;
        
        return `
            <div class="analysis-card ${typeClass}" onclick="contentAnalysisUI.showAnalysisDetails('${analysis.id}')">
                <div class="analysis-header">
                    <div class="analysis-type">${this.getContentTypeName(analysis.contentType)}</div>
                </div>
                
                <div class="analysis-title">${this.escapeHtml(analysis.title)}</div>
                
                <a href="${analysis.url}" class="analysis-url" target="_blank" onclick="event.stopPropagation()">
                    ${this.truncateUrl(analysis.url)}
                </a>
                
                <div class="analysis-summary">
                    ${this.escapeHtml(summary)}
                </div>
                
                <div class="analysis-stats">
                    <div class="stat-badge">📊 ${analysis.wordCount} words</div>
                    <div class="stat-badge">⏱️ ${analysis.readingTime} min</div>
                    ${analysis.sentiment ? `<div class="stat-badge sentiment-${analysis.sentiment}">😊 ${analysis.sentiment}</div>` : ''}
                </div>
                
                <div class="analysis-meta">
                    <div class="meta-item">
                        <span>💡 ${keyPointsCount} key points</span>
                    </div>
                    <div class="meta-item">
                        <span>✅ ${actionItemsCount} actions</span>
                    </div>
                    <div class="meta-item">
                        <span>📅 ${new Date(analysis.timestamp).toLocaleDateString()}</span>
                    </div>
                    <div class="meta-item">
                        <span>📖 Score: ${analysis.readabilityScore || 'N/A'}</span>
                    </div>
                </div>
                
                <div class="analysis-actions" onclick="event.stopPropagation()">
                    <button class="btn btn-info" onclick="contentAnalysisUI.showAnalysisDetails('${analysis.id}')">
                        👁️ View
                    </button>
                    <button class="btn btn-secondary" onclick="contentAnalysisUI.copyAnalysis('${analysis.id}')">
                        📋 Copy
                    </button>
                    <button class="btn btn-danger" onclick="contentAnalysisUI.deleteAnalysis('${analysis.id}')">
                        🗑️ Delete
                    </button>
                </div>
            </div>
        `;
    }

    updateStats() {
        const totalAnalyses = this.analyses.length;
        
        // Calculate weekly analyses
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        const weeklyAnalyses = this.analyses.filter(a => new Date(a.timestamp) >= weekAgo).length;
        
        // Calculate average reading time
        const avgReadingTime = totalAnalyses > 0 ? 
            Math.round(this.analyses.reduce((sum, a) => sum + (a.readingTime || 0), 0) / totalAnalyses) : 0;
        
        // Find most common content type
        const typeCounts = {};
        this.analyses.forEach(a => {
            const type = a.contentType || 'general_webpage';
            typeCounts[type] = (typeCounts[type] || 0) + 1;
        });
        const commonType = Object.keys(typeCounts).length > 0 ? 
            Object.keys(typeCounts).reduce((a, b) => typeCounts[a] > typeCounts[b] ? a : b) : '-';
        
        document.getElementById('totalAnalyses').textContent = totalAnalyses;
        document.getElementById('weeklyAnalyses').textContent = weeklyAnalyses;
        document.getElementById('avgReadingTime').textContent = `${avgReadingTime} min`;
        document.getElementById('commonType').textContent = this.getContentTypeName(commonType);
    }

    async updateCurrentPageInfo() {
        try {
            const tabs = await browser.tabs.query({ active: true, currentWindow: true });
            if (tabs.length === 0) return;

            const tab = tabs[0];
            document.getElementById('currentPageTitle').textContent = tab.title;
            document.getElementById('currentPageMeta').textContent = new URL(tab.url).hostname;
            document.getElementById('currentPageStatus').textContent = 'Ready to analyze';
        } catch (error) {
            console.error('Error getting current page info:', error);
        }
    }

    async analyzeCurrentPage() {
        this.showLoadingOverlay('Analyzing current page...');
        
        try {
            const tabs = await browser.tabs.query({ active: true, currentWindow: true });
            if (tabs.length === 0) {
                throw new Error('No active tab found');
            }

            const tab = tabs[0];
            document.getElementById('currentPageStatus').textContent = 'Analyzing...';
            document.getElementById('currentPageStatus').className = 'page-status analyzing';

            const response = await browser.runtime.sendMessage({
                type: 'ANALYZE_CURRENT_PAGE',
                tabId: tab.id,
                options: {
                    types: ['summary', 'keypoints', 'actionitems', 'insights'],
                    summaryLength: this.settings.summaryLength
                }
            });

            this.hideLoadingOverlay();

            if (response.success) {
                this.showNotification('Page analyzed successfully!', 'success');
                document.getElementById('currentPageStatus').textContent = 'Analysis complete';
                document.getElementById('currentPageStatus').className = 'page-status';
                
                await this.loadAnalyses();
                this.renderAnalyses();
                this.updateStats();
            } else {
                throw new Error(response.error || 'Analysis failed');
            }
        } catch (error) {
            this.hideLoadingOverlay();
            console.error('Error analyzing page:', error);
            this.showNotification('Failed to analyze page: ' + error.message, 'error');
            document.getElementById('currentPageStatus').textContent = 'Analysis failed';
            document.getElementById('currentPageStatus').className = 'page-status error';
        }
    }

    showAnalysisDetails(analysisId) {
        const analysis = this.analyses.find(a => a.id === analysisId);
        if (!analysis) return;

        this.currentAnalysisId = analysisId;
        
        const modal = document.getElementById('analysisModal');
        const title = document.getElementById('analysisModalTitle');
        const content = document.getElementById('analysisDetailsContent');

        title.textContent = analysis.title;
        content.innerHTML = this.createAnalysisDetailsHTML(analysis);
        modal.style.display = 'block';
    }

    createAnalysisDetailsHTML(analysis) {
        return `
            <div class="analysis-details">
                <div class="analysis-section">
                    <h3>📊 Overview</h3>
                    <div class="analysis-metadata">
                        <div class="metadata-item">
                            <div class="metadata-label">Content Type</div>
                            <div class="metadata-value">${this.getContentTypeName(analysis.contentType)}</div>
                        </div>
                        <div class="metadata-item">
                            <div class="metadata-label">Word Count</div>
                            <div class="metadata-value">${analysis.wordCount} words</div>
                        </div>
                        <div class="metadata-item">
                            <div class="metadata-label">Reading Time</div>
                            <div class="metadata-value">${analysis.readingTime} minutes</div>
                        </div>
                        <div class="metadata-item">
                            <div class="metadata-label">Readability Score</div>
                            <div class="metadata-value">${analysis.readabilityScore || 'N/A'}</div>
                        </div>
                        <div class="metadata-item">
                            <div class="metadata-label">Sentiment</div>
                            <div class="metadata-value">
                                <span class="sentiment-indicator sentiment-${analysis.sentiment || 'neutral'}">
                                    ${this.getSentimentEmoji(analysis.sentiment)} ${analysis.sentiment || 'neutral'}
                                </span>
                            </div>
                        </div>
                        <div class="metadata-item">
                            <div class="metadata-label">Analyzed</div>
                            <div class="metadata-value">${new Date(analysis.timestamp).toLocaleString()}</div>
                        </div>
                    </div>
                    <div class="metadata-item">
                        <div class="metadata-label">URL</div>
                        <div class="metadata-value">
                            <a href="${analysis.url}" target="_blank">${analysis.url}</a>
                        </div>
                    </div>
                </div>

                ${analysis.summary ? `
                    <div class="analysis-section">
                        <h3>📝 Summary</h3>
                        <p>${this.escapeHtml(analysis.summary)}</p>
                    </div>
                ` : ''}

                ${analysis.keyPoints && analysis.keyPoints.length > 0 ? `
                    <div class="analysis-section">
                        <h3>💡 Key Points</h3>
                        <ul class="key-points-list">
                            ${analysis.keyPoints.map(point => `<li>${this.escapeHtml(point)}</li>`).join('')}
                        </ul>
                    </div>
                ` : ''}

                ${analysis.actionItems && analysis.actionItems.length > 0 ? `
                    <div class="analysis-section">
                        <h3>✅ Action Items</h3>
                        <ul class="action-items-list">
                            ${analysis.actionItems.map(item => `<li>${this.escapeHtml(item)}</li>`).join('')}
                        </ul>
                    </div>
                ` : ''}

                ${analysis.insights && analysis.insights.length > 0 ? `
                    <div class="analysis-section">
                        <h3>🔍 Insights</h3>
                        <ul class="insights-list">
                            ${analysis.insights.map(insight => `<li>${this.escapeHtml(insight)}</li>`).join('')}
                        </ul>
                    </div>
                ` : ''}

                ${analysis.topics && analysis.topics.length > 0 ? `
                    <div class="analysis-section">
                        <h3>🏷️ Topics</h3>
                        <div class="topics-list">
                            ${analysis.topics.map(topic => `<span class="topic-tag">${this.escapeHtml(topic)}</span>`).join('')}
                        </div>
                    </div>
                ` : ''}
            </div>
        `;
    }

    // Utility methods
    getContentTypeName(type) {
        const types = {
            'academic_paper': 'Academic Paper',
            'news_article': 'News Article',
            'blog_post': 'Blog Post',
            'documentation': 'Documentation',
            'product_page': 'Product Page',
            'general_webpage': 'General Webpage'
        };
        return types[type] || 'Unknown';
    }

    getSentimentEmoji(sentiment) {
        const emojis = {
            'positive': '😊',
            'negative': '😞',
            'neutral': '😐'
        };
        return emojis[sentiment] || '😐';
    }

    truncateUrl(url) {
        if (url.length <= 50) return url;
        return url.substring(0, 47) + '...';
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    async copyToClipboard(text) {
        try {
            await navigator.clipboard.writeText(text);
        } catch (error) {
            console.error('Failed to copy to clipboard:', error);
        }
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

    showLoadingOverlay(text) {
        const overlay = document.getElementById('loadingOverlay');
        const loadingText = overlay.querySelector('.loading-text');
        loadingText.textContent = text;
        overlay.style.display = 'flex';
    }

    hideLoadingOverlay() {
        document.getElementById('loadingOverlay').style.display = 'none';
    }

    // Placeholder methods for features to be implemented
    async copyAnalysis(analysisId) {
        this.showNotification('Copy feature not yet implemented', 'info');
    }

    async deleteAnalysis(analysisId) {
        this.showNotification('Delete feature not yet implemented', 'info');
    }

    editCurrentAnalysis() {
        this.showNotification('Edit feature not yet implemented', 'info');
    }

    async deleteCurrentAnalysis() {
        this.showNotification('Delete feature not yet implemented', 'info');
    }

    showSettingsModal() {
        this.showNotification('Settings modal not yet implemented', 'info');
    }

    populateSettingsForm() {
        // To be implemented
    }

    async handleSettingsSubmit(e) {
        e.preventDefault();
        this.showNotification('Settings save not yet implemented', 'info');
    }

    showExportModal() {
        this.showNotification('Export modal not yet implemented', 'info');
    }

    async handleExportSubmit(e) {
        e.preventDefault();
        this.showNotification('Export feature not yet implemented', 'info');
    }
}

// Initialize the UI when the page loads
let contentAnalysisUI;
document.addEventListener('DOMContentLoaded', () => {
    contentAnalysisUI = new ContentAnalysisUI();
});
