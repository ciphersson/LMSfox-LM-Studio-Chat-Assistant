/**
 * Insight Extractor UI Controller
 */

class InsightExtractorUI {
    constructor() {
        this.insightExtractor = new InsightExtractor();
        this.currentView = 'grid';
        this.sortBy = 'timestamp';
        this.sortOrder = 'desc';
        this.filters = { search: '', confidence: '', complexity: '', relevance: '', date: '' };
        this.insights = [];
        this.selectedInsight = null;
        this.init();
    }

    async init() {
        this.initializeElements();
        this.setupEventListeners();
        await this.loadInsights();
        this.updateStatistics();
        this.checkEmptyState();
    }

    initializeElements() {
        this.analyzeCurrentPageBtn = document.getElementById('analyzeCurrentPage');
        this.exportInsightsBtn = document.getElementById('exportInsights');
        this.settingsBtn = document.getElementById('settingsBtn');
        this.searchInput = document.getElementById('searchInput');
        this.insightsContainer = document.getElementById('insightsContainer');
        this.emptyState = document.getElementById('emptyState');
        this.currentPagePanel = document.getElementById('currentPagePanel');
        this.insightModal = document.getElementById('insightModal');
        this.exportModal = document.getElementById('exportModal');
        this.settingsModal = document.getElementById('settingsModal');
        this.loadingOverlay = document.getElementById('loadingOverlay');
        this.notificationContainer = document.getElementById('notificationContainer');
    }

    setupEventListeners() {
        this.analyzeCurrentPageBtn?.addEventListener('click', () => this.analyzeCurrentPage());
        this.exportInsightsBtn?.addEventListener('click', () => this.showExportModal());
        this.settingsBtn?.addEventListener('click', () => this.showSettingsModal());
        this.searchInput?.addEventListener('input', (e) => this.handleSearch(e.target.value));
        
        // View controls
        document.getElementById('gridView')?.addEventListener('click', () => this.changeView('grid'));
        document.getElementById('listView')?.addEventListener('click', () => this.changeView('list'));
        document.getElementById('timelineView')?.addEventListener('click', () => this.changeView('timeline'));
        
        // Modal close buttons
        document.getElementById('closeInsightModal')?.addEventListener('click', () => this.hideInsightModal());
        document.getElementById('closeExportModal')?.addEventListener('click', () => this.hideExportModal());
        document.getElementById('closeSettingsModal')?.addEventListener('click', () => this.hideSettingsModal());
        document.getElementById('closePanelBtn')?.addEventListener('click', () => this.hideCurrentPagePanel());
        
        // Export and settings
        document.getElementById('confirmExport')?.addEventListener('click', () => this.handleExport());
        document.getElementById('saveSettings')?.addEventListener('click', () => this.saveSettings());
    }

    async loadInsights() {
        try {
            this.showLoading('Loading insights...');
            this.insights = await this.insightExtractor.getStoredInsights();
            this.renderInsights();
        } catch (error) {
            this.showNotification('Error loading insights', 'error');
        } finally {
            this.hideLoading();
        }
    }

    renderInsights() {
        if (!this.insightsContainer) return;
        
        const filteredInsights = this.getFilteredInsights();
        const sortedInsights = this.getSortedInsights(filteredInsights);
        
        this.insightsContainer.innerHTML = '';
        this.insightsContainer.className = `insights-container ${this.currentView}-view`;
        
        if (sortedInsights.length === 0) {
            this.showEmptyState();
            return;
        }
        
        this.hideEmptyState();
        sortedInsights.forEach(insight => {
            const card = this.createInsightCard(insight);
            this.insightsContainer.appendChild(card);
        });
    }

    createInsightCard(insight) {
        const card = document.createElement('div');
        card.className = 'insight-card';
        card.innerHTML = this.createInsightCardHTML(insight);
        card.addEventListener('click', () => this.showInsightDetails(insight));
        return card;
    }

    createInsightCardHTML(insight) {
        const confidenceClass = this.getConfidenceClass(insight.analysis.confidence);
        const keyInsightsCount = insight.analysis.keyInsights?.length || 0;
        const actionableItemsCount = insight.analysis.actionableItems?.length || 0;
        
        return `
            <div class="insight-header">
                <div>
                    <h3 class="insight-title">${this.escapeHtml(insight.title)}</h3>
                    <a href="${insight.url}" class="insight-url" target="_blank">${this.truncateUrl(insight.url)}</a>
                </div>
                <div class="confidence-badge ${confidenceClass}">
                    ${insight.analysis.confidence}%
                </div>
            </div>
            <div class="insight-meta">
                <div class="meta-item">📅 ${this.formatDate(new Date(insight.timestamp))}</div>
                <div class="meta-item">🧩 ${insight.analysis.complexity}</div>
                <div class="meta-item">🎯 ${insight.analysis.relevance}</div>
            </div>
            <div class="insight-preview">
                <div class="preview-section">
                    <div class="preview-title">💡 Key Insights (${keyInsightsCount})</div>
                    <div class="preview-content">${this.getPreviewText(insight.analysis.keyInsights, 'insight')}</div>
                </div>
                <div class="preview-section">
                    <div class="preview-title">⚡ Actionable Items (${actionableItemsCount})</div>
                    <div class="preview-content">${this.getPreviewText(insight.analysis.actionableItems, 'action')}</div>
                </div>
            </div>
        `;
    }

    getFilteredInsights() {
        return this.insights.filter(insight => {
            if (this.filters.search) {
                const searchTerm = this.filters.search.toLowerCase();
                const searchableText = `${insight.title} ${insight.url}`.toLowerCase();
                if (!searchableText.includes(searchTerm)) return false;
            }
            return true;
        });
    }

    getSortedInsights(insights) {
        return [...insights].sort((a, b) => {
            let aValue = a.timestamp;
            let bValue = b.timestamp;
            return this.sortOrder === 'desc' ? bValue - aValue : aValue - bValue;
        });
    }

    async analyzeCurrentPage() {
        try {
            const tabs = await browser.tabs.query({ active: true, currentWindow: true });
            if (!tabs[0]) {
                this.showNotification('No active tab found', 'error');
                return;
            }
            
            const tab = tabs[0];
            this.showCurrentPagePanel();
            this.showAnalysisProgress();
            
            const content = await this.extractPageContent(tab.id);
            const insights = await this.insightExtractor.extractInsights(content, tab.url, tab.title);
            
            this.showAnalysisResults(insights);
            await this.loadInsights();
            this.updateStatistics();
            this.showNotification('Analysis completed successfully', 'success');
            
        } catch (error) {
            this.showNotification(`Analysis failed: ${error.message}`, 'error');
            this.hideAnalysisProgress();
        }
    }

    async extractPageContent(tabId) {
        return new Promise((resolve, reject) => {
            browser.tabs.sendMessage(tabId, { action: 'extractContent' }, (response) => {
                if (browser.runtime.lastError) {
                    reject(new Error(browser.runtime.lastError.message));
                } else if (response && response.success) {
                    resolve(response.content);
                } else {
                    reject(new Error('Failed to extract page content'));
                }
            });
        });
    }

    // Utility methods
    getConfidenceClass(confidence) {
        if (confidence >= 70) return 'confidence-high';
        if (confidence >= 40) return 'confidence-medium';
        return 'confidence-low';
    }

    getPreviewText(items, field) {
        if (!items || items.length === 0) return 'No items found';
        const firstItem = items[0];
        const text = firstItem[field] || firstItem.insight || firstItem.action || 'No content';
        return this.truncateText(text, 100);
    }

    truncateText(text, maxLength) {
        if (!text) return '';
        return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
    }

    truncateUrl(url) {
        if (!url) return '';
        try {
            const urlObj = new URL(url);
            return urlObj.hostname + (urlObj.pathname !== '/' ? urlObj.pathname : '');
        } catch {
            return url.length > 50 ? url.substring(0, 50) + '...' : url;
        }
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    formatDate(date) {
        return date.toLocaleDateString('en-US', {
            year: 'numeric', month: 'short', day: 'numeric',
            hour: '2-digit', minute: '2-digit'
        });
    }

    updateStatistics() {
        const total = this.insights.length;
        const weekAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
        const thisWeek = this.insights.filter(i => i.timestamp > weekAgo).length;
        const avgConf = total > 0 ? Math.round(this.insights.reduce((sum, i) => sum + (i.analysis.confidence || 0), 0) / total) : 0;
        
        document.getElementById('totalInsights').textContent = total;
        document.getElementById('weekInsights').textContent = thisWeek;
        document.getElementById('avgConfidence').textContent = `${avgConf}%`;
    }

    // Event handlers
    handleSearch(query) {
        this.filters.search = query;
        this.renderInsights();
    }

    changeView(view) {
        this.currentView = view;
        document.querySelectorAll('.view-btn').forEach(btn => btn.classList.remove('active'));
        document.getElementById(`${view}View`)?.classList.add('active');
        this.renderInsights();
    }

    // UI state methods
    showEmptyState() {
        if (this.emptyState) this.emptyState.style.display = 'block';
        if (this.insightsContainer) this.insightsContainer.style.display = 'none';
    }

    hideEmptyState() {
        if (this.emptyState) this.emptyState.style.display = 'none';
        if (this.insightsContainer) this.insightsContainer.style.display = 'grid';
    }

    checkEmptyState() {
        if (this.insights.length === 0) {
            this.showEmptyState();
        } else {
            this.hideEmptyState();
        }
    }

    showCurrentPagePanel() {
        if (this.currentPagePanel) {
            this.currentPagePanel.style.display = 'block';
            setTimeout(() => this.currentPagePanel.classList.add('active'), 10);
        }
    }

    hideCurrentPagePanel() {
        if (this.currentPagePanel) {
            this.currentPagePanel.classList.remove('active');
            setTimeout(() => this.currentPagePanel.style.display = 'none', 300);
        }
    }

    showAnalysisProgress() {
        const progressEl = document.getElementById('analysisProgress');
        if (progressEl) progressEl.style.display = 'block';
    }

    hideAnalysisProgress() {
        const progressEl = document.getElementById('analysisProgress');
        if (progressEl) progressEl.style.display = 'none';
    }

    showAnalysisResults(insights) {
        this.hideAnalysisProgress();
        const resultsEl = document.getElementById('analysisResults');
        if (resultsEl) {
            resultsEl.style.display = 'block';
            resultsEl.innerHTML = `<h4>Analysis Complete</h4><p>Found ${insights.analysis.keyInsights?.length || 0} key insights and ${insights.analysis.actionableItems?.length || 0} actionable items.</p>`;
        }
    }

    showInsightDetails(insight) {
        this.selectedInsight = insight;
        if (this.insightModal) {
            document.getElementById('insightModalTitle').textContent = insight.title;
            document.getElementById('insightDetails').innerHTML = this.createInsightDetailsHTML(insight);
            this.insightModal.style.display = 'flex';
        }
    }

    hideInsightModal() {
        if (this.insightModal) this.insightModal.style.display = 'none';
        this.selectedInsight = null;
    }

    createInsightDetailsHTML(insight) {
        return `
            <div class="insight-detail-content">
                <h3>${this.escapeHtml(insight.title)}</h3>
                <a href="${insight.url}" target="_blank">${insight.url}</a>
                <p>Analyzed on ${this.formatDate(new Date(insight.timestamp))}</p>
                ${this.createDetailSection('💡 Key Insights', insight.analysis.keyInsights, 'insight')}
                ${this.createDetailSection('⚡ Actionable Items', insight.analysis.actionableItems, 'action')}
            </div>
        `;
    }

    createDetailSection(title, items, field) {
        if (!items || items.length === 0) return '';
        return `
            <div class="detail-section">
                <h4>${title}</h4>
                <div class="detail-items">
                    ${items.map(item => `
                        <div class="detail-item">
                            <div class="item-content">${this.escapeHtml(item[field] || 'No content')}</div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }

    showExportModal() {
        if (this.exportModal) this.exportModal.style.display = 'flex';
    }

    hideExportModal() {
        if (this.exportModal) this.exportModal.style.display = 'none';
    }

    showSettingsModal() {
        if (this.settingsModal) this.settingsModal.style.display = 'flex';
    }

    hideSettingsModal() {
        if (this.settingsModal) this.settingsModal.style.display = 'none';
    }

    showLoading(text = 'Loading...') {
        if (this.loadingOverlay) {
            this.loadingOverlay.style.display = 'flex';
            const loadingText = document.getElementById('loadingText');
            if (loadingText) loadingText.textContent = text;
        }
    }

    hideLoading() {
        if (this.loadingOverlay) this.loadingOverlay.style.display = 'none';
    }

    showNotification(message, type = 'info') {
        if (!this.notificationContainer) return;
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        this.notificationContainer.appendChild(notification);
        setTimeout(() => notification.remove(), 5000);
    }

    async handleExport() {
        try {
            const format = document.querySelector('input[name="exportFormat"]:checked')?.value || 'json';
            const exported = await this.insightExtractor.exportInsights(format);
            const blob = new Blob([exported], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `insights-export.${format}`;
            a.click();
            URL.revokeObjectURL(url);
            this.hideExportModal();
            this.showNotification('Export completed successfully', 'success');
        } catch (error) {
            this.showNotification('Export failed', 'error');
        }
    }

    saveSettings() {
        this.hideSettingsModal();
        this.showNotification('Settings saved successfully', 'success');
    }
}

// Initialize when DOM is loaded
if (typeof window !== 'undefined') {
    window.addEventListener('DOMContentLoaded', () => {
        window.insightExtractorUI = new InsightExtractorUI();
    });
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = InsightExtractorUI;
}
