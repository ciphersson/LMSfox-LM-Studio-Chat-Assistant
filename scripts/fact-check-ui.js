// Fact-Checking UI Controller
class FactCheckUI {
    constructor() {
        this.factChecks = [];
        this.filteredFactChecks = [];
        this.currentFilter = {
            verdict: '',
            verification: '',
            search: ''
        };
        
        this.init();
    }

    async init() {
        this.setupEventListeners();
        await this.loadFactChecks();
        this.renderFactChecks();
        this.updateStats();
    }

    setupEventListeners() {
        // Header actions
        document.getElementById('newFactCheckBtn').addEventListener('click', () => this.showFactCheckModal());
        document.getElementById('quickCheckBtn').addEventListener('click', () => this.showQuickCheckModal());
        document.getElementById('exportFactChecksBtn').addEventListener('click', () => this.exportFactChecks());

        // Filters
        document.getElementById('verdictFilter').addEventListener('change', (e) => this.updateFilter('verdict', e.target.value));
        document.getElementById('verificationFilter').addEventListener('change', (e) => this.updateFilter('verification', e.target.value));
        document.getElementById('searchFilter').addEventListener('input', (e) => this.updateFilter('search', e.target.value));

        // Quick actions
        document.getElementById('checkCurrentPageBtn').addEventListener('click', () => this.checkCurrentPage());
        document.getElementById('checkSelectedTextBtn').addEventListener('click', () => this.checkSelectedText());
        document.getElementById('checkClipboardBtn').addEventListener('click', () => this.checkClipboard());

        // Modal controls
        this.setupModalControls();

        // Form submissions
        document.getElementById('factCheckForm').addEventListener('submit', (e) => this.handleFactCheckSubmit(e));
        document.getElementById('executeQuickCheckBtn').addEventListener('click', () => this.executeQuickCheck());
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
        document.getElementById('cancelFactCheckBtn').addEventListener('click', () => {
            document.getElementById('factCheckModal').style.display = 'none';
        });
        document.getElementById('cancelQuickCheckBtn').addEventListener('click', () => {
            document.getElementById('quickCheckModal').style.display = 'none';
        });

        // Custom source management
        document.getElementById('addCustomSourceBtn').addEventListener('click', () => this.addCustomSource());

        // Click outside to close
        window.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal')) {
                e.target.style.display = 'none';
            }
        });
    }

    async loadFactChecks() {
        try {
            const response = await browser.runtime.sendMessage({
                type: 'GET_FACT_CHECKS'
            });

            if (response.success) {
                this.factChecks = response.factChecks || [];
                this.applyFilters();
            } else {
                this.showNotification('Failed to load fact checks: ' + response.error, 'error');
            }
        } catch (error) {
            console.error('Error loading fact checks:', error);
            this.showNotification('Error loading fact checks', 'error');
        }
    }

    updateFilter(type, value) {
        this.currentFilter[type] = value;
        this.applyFilters();
        this.renderFactChecks();
    }

    applyFilters() {
        this.filteredFactChecks = this.factChecks.filter(factCheck => {
            // Verdict filter
            if (this.currentFilter.verdict && factCheck.verdict !== this.currentFilter.verdict) {
                return false;
            }

            // Verification level filter
            if (this.currentFilter.verification && factCheck.verificationLevel !== this.currentFilter.verification) {
                return false;
            }

            // Search filter
            if (this.currentFilter.search) {
                const searchTerm = this.currentFilter.search.toLowerCase();
                const searchableText = [
                    factCheck.claim,
                    factCheck.context || '',
                    factCheck.verdict,
                    factCheck.reasoning || ''
                ].join(' ').toLowerCase();
                
                if (!searchableText.includes(searchTerm)) {
                    return false;
                }
            }

            return true;
        });
    }

    renderFactChecks() {
        const listContainer = document.getElementById('factCheckList');
        
        if (this.filteredFactChecks.length === 0) {
            listContainer.innerHTML = `
                <div class="empty-state">
                    <h3>No fact checks found</h3>
                    <p>Try adjusting your filters or create a new fact check.</p>
                    <button class="btn btn-primary" onclick="factCheckUI.showFactCheckModal()">
                        ➕ Create Fact Check
                    </button>
                </div>
            `;
            return;
        }

        listContainer.innerHTML = this.filteredFactChecks.map(factCheck => this.createFactCheckCard(factCheck)).join('');
    }

    createFactCheckCard(factCheck) {
        const statusClass = factCheck.status === 'running' ? 'running' : 
                           factCheck.status === 'completed' ? 'completed' : 
                           factCheck.status === 'failed' ? 'failed' : '';
        
        const verificationClass = factCheck.verificationLevel || 'unverified';
        const verdictClass = this.getVerdictClass(factCheck.verdict);
        
        const confidenceLevel = factCheck.confidence >= 70 ? 'high' : 
                               factCheck.confidence >= 40 ? 'medium' : 'low';

        const supportingCount = factCheck.evidence?.filter(e => e.category === 'supporting').length || 0;
        const contradictoryCount = factCheck.evidence?.filter(e => e.category === 'contradictory').length || 0;
        const reliableSourcesCount = factCheck.evidence?.filter(e => e.reliability === 'reliable').length || 0;

        return `
            <div class="fact-check-card ${statusClass} ${verificationClass}" onclick="factCheckUI.showFactCheckDetails('${factCheck.id}')">
                <div class="fact-check-header">
                    <div class="verification-badge ${verificationClass}">
                        ${this.formatVerificationLevel(factCheck.verificationLevel)}
                    </div>
                </div>
                
                <div class="fact-check-claim">
                    ${this.escapeHtml(factCheck.claim)}
                </div>

                ${factCheck.verdict ? `
                    <div class="verdict-section">
                        <div class="verdict-label ${verdictClass}">
                            ${this.getVerdictIcon(factCheck.verdict)} ${factCheck.verdict}
                        </div>
                    </div>
                ` : ''}

                <div class="confidence-section">
                    <div class="confidence-bar">
                        <div class="confidence-fill ${confidenceLevel}" style="width: ${factCheck.confidence || 0}%"></div>
                    </div>
                    <div class="confidence-text">${factCheck.confidence || 0}% confidence</div>
                </div>

                <div class="fact-check-meta">
                    <div>Created: ${new Date(factCheck.createdAt).toLocaleDateString()}</div>
                    <div>Sources: ${factCheck.sources?.length || 0}</div>
                </div>

                <div class="evidence-indicators">
                    <div class="evidence-indicator supporting">
                        ✅ ${supportingCount} Supporting
                    </div>
                    <div class="evidence-indicator contradictory">
                        ❌ ${contradictoryCount} Contradictory
                    </div>
                    <div class="evidence-indicator reliable-sources">
                        🔒 ${reliableSourcesCount} Reliable
                    </div>
                </div>

                <div class="fact-check-actions" onclick="event.stopPropagation()">
                    ${factCheck.status === 'pending' ? `
                        <button class="btn btn-primary" onclick="factCheckUI.executeFactCheck('${factCheck.id}')">
                            ▶️ Execute
                        </button>
                    ` : ''}
                    <button class="btn btn-info" onclick="factCheckUI.showFactCheckDetails('${factCheck.id}')">
                        👁️ Details
                    </button>
                    <button class="btn btn-danger" onclick="factCheckUI.deleteFactCheck('${factCheck.id}')">
                        🗑️ Delete
                    </button>
                </div>
            </div>
        `;
    }

    updateStats() {
        const total = this.factChecks.length;
        const verified = this.factChecks.filter(fc => 
            fc.verificationLevel === 'highly_verified' || fc.verificationLevel === 'verified'
        ).length;
        const falseClaims = this.factChecks.filter(fc => 
            fc.verdict && (fc.verdict.includes('False') || fc.verdict === 'False')
        ).length;
        const avgConfidence = total > 0 ? 
            Math.round(this.factChecks.reduce((sum, fc) => sum + (fc.confidence || 0), 0) / total) : 0;

        document.getElementById('totalFactChecks').textContent = total;
        document.getElementById('verifiedClaims').textContent = verified;
        document.getElementById('falseClaims').textContent = falseClaims;
        document.getElementById('avgConfidence').textContent = avgConfidence + '%';
    }

    showFactCheckModal() {
        document.getElementById('factCheckModal').style.display = 'block';
        this.resetFactCheckForm();
    }

    showQuickCheckModal() {
        document.getElementById('quickCheckModal').style.display = 'block';
        document.getElementById('quickClaimText').value = '';
    }

    resetFactCheckForm() {
        document.getElementById('factCheckForm').reset();
        document.getElementById('sourceFactCheckSites').checked = true;
        document.getElementById('sourceWikipedia').checked = true;
        document.getElementById('sourceAcademic').checked = true;
        document.getElementById('sourceWebSearch').checked = false;
        this.clearCustomSources();
    }

    addCustomSource() {
        const container = document.getElementById('customSourcesList');
        const sourceItem = document.createElement('div');
        sourceItem.className = 'custom-source-item';
        sourceItem.innerHTML = `
            <input type="url" placeholder="Enter URL..." required>
            <button type="button" class="btn btn-danger" onclick="this.parentElement.remove()">
                ❌
            </button>
        `;
        container.appendChild(sourceItem);
    }

    clearCustomSources() {
        document.getElementById('customSourcesList').innerHTML = '';
    }

    async handleFactCheckSubmit(e) {
        e.preventDefault();
        
        const formData = new FormData(e.target);
        const config = {
            claim: document.getElementById('claimText').value.trim(),
            context: document.getElementById('contextText').value.trim(),
            sources: this.getSelectedSources(),
            customSources: this.getCustomSources()
        };

        if (!config.claim) {
            this.showNotification('Please enter a claim to fact-check', 'error');
            return;
        }

        try {
            const response = await browser.runtime.sendMessage({
                type: 'CREATE_FACT_CHECK',
                config: config
            });

            if (response.success) {
                this.showNotification('Fact check created successfully', 'success');
                document.getElementById('factCheckModal').style.display = 'none';
                await this.loadFactChecks();
                this.renderFactChecks();
                this.updateStats();
            } else {
                this.showNotification('Failed to create fact check: ' + response.error, 'error');
            }
        } catch (error) {
            console.error('Error creating fact check:', error);
            this.showNotification('Error creating fact check', 'error');
        }
    }

    getSelectedSources() {
        const sources = [];
        if (document.getElementById('sourceFactCheckSites').checked) sources.push('fact_check_sites');
        if (document.getElementById('sourceWikipedia').checked) sources.push('wikipedia');
        if (document.getElementById('sourceAcademic').checked) sources.push('academic');
        if (document.getElementById('sourceWebSearch').checked) sources.push('web_search');
        return sources;
    }

    getCustomSources() {
        const customSources = [];
        document.querySelectorAll('#customSourcesList input').forEach(input => {
            if (input.value.trim()) {
                customSources.push(input.value.trim());
            }
        });
        return customSources;
    }

    async executeQuickCheck() {
        const claim = document.getElementById('quickClaimText').value.trim();
        
        if (!claim) {
            this.showNotification('Please enter a claim to fact-check', 'error');
            return;
        }

        const config = {
            claim: claim,
            sources: ['fact_check_sites', 'wikipedia', 'academic'],
            customSources: []
        };

        try {
            const response = await browser.runtime.sendMessage({
                type: 'CREATE_FACT_CHECK',
                config: config
            });

            if (response.success) {
                document.getElementById('quickCheckModal').style.display = 'none';
                this.showNotification('Quick fact check started', 'success');
                
                // Auto-execute the fact check
                await this.executeFactCheck(response.factCheck.id);
                
                await this.loadFactChecks();
                this.renderFactChecks();
                this.updateStats();
            } else {
                this.showNotification('Failed to create quick fact check: ' + response.error, 'error');
            }
        } catch (error) {
            console.error('Error creating quick fact check:', error);
            this.showNotification('Error creating quick fact check', 'error');
        }
    }

    async executeFactCheck(factCheckId) {
        try {
            this.showNotification('Executing fact check...', 'info');
            
            const response = await browser.runtime.sendMessage({
                type: 'EXECUTE_FACT_CHECK',
                factCheckId: factCheckId
            });

            if (response.success) {
                this.showNotification('Fact check completed successfully', 'success');
                await this.loadFactChecks();
                this.renderFactChecks();
                this.updateStats();
            } else {
                this.showNotification('Failed to execute fact check: ' + response.error, 'error');
            }
        } catch (error) {
            console.error('Error executing fact check:', error);
            this.showNotification('Error executing fact check', 'error');
        }
    }

    async deleteFactCheck(factCheckId) {
        if (!confirm('Are you sure you want to delete this fact check?')) {
            return;
        }

        try {
            const response = await browser.runtime.sendMessage({
                type: 'DELETE_FACT_CHECK',
                factCheckId: factCheckId
            });

            if (response.success) {
                this.showNotification('Fact check deleted successfully', 'success');
                await this.loadFactChecks();
                this.renderFactChecks();
                this.updateStats();
            } else {
                this.showNotification('Failed to delete fact check: ' + response.error, 'error');
            }
        } catch (error) {
            console.error('Error deleting fact check:', error);
            this.showNotification('Error deleting fact check', 'error');
        }
    }

    showFactCheckDetails(factCheckId) {
        const factCheck = this.factChecks.find(fc => fc.id === factCheckId);
        if (!factCheck) return;

        const modal = document.getElementById('detailsModal');
        const title = document.getElementById('detailsTitle');
        const content = document.getElementById('detailsContent');

        title.textContent = 'Fact Check Details';
        content.innerHTML = this.createFactCheckDetailsHTML(factCheck);
        modal.style.display = 'block';
    }

    createFactCheckDetailsHTML(factCheck) {
        const verdictClass = this.getVerdictClass(factCheck.verdict);
        const confidenceLevel = factCheck.confidence >= 70 ? 'high' : 
                               factCheck.confidence >= 40 ? 'medium' : 'low';

        return `
            <div class="details-section">
                <h3>📝 Claim</h3>
                <p>${this.escapeHtml(factCheck.claim)}</p>
                ${factCheck.context ? `
                    <h4>Context:</h4>
                    <p>${this.escapeHtml(factCheck.context)}</p>
                ` : ''}
            </div>

            ${factCheck.verdict ? `
                <div class="verdict-details">
                    <div class="verdict-label ${verdictClass}">
                        ${this.getVerdictIcon(factCheck.verdict)} ${factCheck.verdict}
                    </div>
                    <div class="confidence-section">
                        <div class="confidence-bar">
                            <div class="confidence-fill ${confidenceLevel}" style="width: ${factCheck.confidence}%"></div>
                        </div>
                        <div class="confidence-text">${factCheck.confidence}% confidence</div>
                    </div>
                    ${factCheck.reasoning ? `
                        <h4>Reasoning:</h4>
                        <p>${this.escapeHtml(factCheck.reasoning)}</p>
                    ` : ''}
                </div>
            ` : ''}

            ${factCheck.evidence && factCheck.evidence.length > 0 ? `
                <div class="details-section">
                    <h3>🔍 Evidence</h3>
                    <div class="evidence-section">
                        ${factCheck.evidence.map(evidence => `
                            <div class="evidence-item ${evidence.category === 'supporting' ? 'supporting-evidence' : 'contradictory-evidence'}">
                                <h4>${evidence.source}</h4>
                                <div class="evidence-meta">
                                    Category: ${evidence.category} | Reliability: ${evidence.reliability}
                                    ${evidence.url ? ` | <a href="${evidence.url}" target="_blank">View Source</a>` : ''}
                                </div>
                                <div class="evidence-content">${this.escapeHtml(evidence.content)}</div>
                                ${evidence.reliability === 'reliable' ? `
                                    <div class="reliability-indicators">
                                        <span class="reliability-tag reliable">Reliable Source</span>
                                    </div>
                                ` : ''}
                            </div>
                        `).join('')}
                    </div>
                </div>
            ` : ''}

            <div class="details-section">
                <h3>📊 Metadata</h3>
                <div class="fact-check-meta">
                    <div><strong>Created:</strong> ${new Date(factCheck.createdAt).toLocaleString()}</div>
                    <div><strong>Status:</strong> ${factCheck.status}</div>
                    <div><strong>Verification Level:</strong> ${this.formatVerificationLevel(factCheck.verificationLevel)}</div>
                    <div><strong>Sources Used:</strong> ${factCheck.sources?.join(', ') || 'None'}</div>
                    ${factCheck.customSources && factCheck.customSources.length > 0 ? `
                        <div><strong>Custom Sources:</strong> ${factCheck.customSources.length}</div>
                    ` : ''}
                </div>
            </div>
        `;
    }

    async checkCurrentPage() {
        try {
            const tabs = await browser.tabs.query({ active: true, currentWindow: true });
            if (tabs.length === 0) return;

            const response = await browser.tabs.sendMessage(tabs[0].id, {
                type: 'EXTRACT_RELEVANT_CONTENT',
                query: 'main claims and statements'
            });

            if (response && response.content) {
                this.showFactCheckModal();
                document.getElementById('claimText').value = response.content.substring(0, 500);
                document.getElementById('contextText').value = `From page: ${tabs[0].url}`;
            } else {
                this.showNotification('Could not extract content from current page', 'warning');
            }
        } catch (error) {
            console.error('Error checking current page:', error);
            this.showNotification('Error checking current page', 'error');
        }
    }

    async checkSelectedText() {
        try {
            const tabs = await browser.tabs.query({ active: true, currentWindow: true });
            if (tabs.length === 0) return;

            const response = await browser.tabs.executeScript(tabs[0].id, {
                code: 'window.getSelection().toString()'
            });

            if (response && response[0]) {
                this.showFactCheckModal();
                document.getElementById('claimText').value = response[0];
                document.getElementById('contextText').value = `Selected from: ${tabs[0].url}`;
            } else {
                this.showNotification('No text selected on current page', 'warning');
            }
        } catch (error) {
            console.error('Error checking selected text:', error);
            this.showNotification('Error checking selected text', 'error');
        }
    }

    async checkClipboard() {
        try {
            const text = await navigator.clipboard.readText();
            if (text) {
                this.showFactCheckModal();
                document.getElementById('claimText').value = text;
                document.getElementById('contextText').value = 'From clipboard';
            } else {
                this.showNotification('Clipboard is empty', 'warning');
            }
        } catch (error) {
            console.error('Error reading clipboard:', error);
            this.showNotification('Could not read clipboard', 'error');
        }
    }

    exportFactChecks() {
        const dataStr = JSON.stringify(this.factChecks, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        
        const link = document.createElement('a');
        link.href = URL.createObjectURL(dataBlob);
        link.download = `fact-checks-${new Date().toISOString().split('T')[0]}.json`;
        link.click();
        
        this.showNotification('Fact checks exported successfully', 'success');
    }

    getVerdictClass(verdict) {
        if (!verdict) return '';
        
        const verdictLower = verdict.toLowerCase();
        if (verdictLower.includes('true') && !verdictLower.includes('false')) {
            if (verdictLower.includes('mostly')) return 'verdict-mostly-true';
            if (verdictLower.includes('partially')) return 'verdict-partially-true';
            return 'verdict-true';
        }
        if (verdictLower.includes('false')) {
            if (verdictLower.includes('mostly')) return 'verdict-mostly-false';
            if (verdictLower.includes('partially')) return 'verdict-partially-false';
            return 'verdict-false';
        }
        if (verdictLower.includes('mixed')) return 'verdict-mixed';
        if (verdictLower.includes('insufficient')) return 'verdict-insufficient';
        
        return '';
    }

    getVerdictIcon(verdict) {
        if (!verdict) return '❓';
        
        const verdictLower = verdict.toLowerCase();
        if (verdictLower.includes('true') && !verdictLower.includes('false')) return '✅';
        if (verdictLower.includes('false')) return '❌';
        if (verdictLower.includes('mixed')) return '⚖️';
        if (verdictLower.includes('insufficient')) return '❓';
        
        return '❓';
    }

    formatVerificationLevel(level) {
        switch (level) {
            case 'highly_verified': return 'Highly Verified';
            case 'verified': return 'Verified';
            case 'partially_verified': return 'Partially Verified';
            case 'unverified': return 'Unverified';
            default: return 'Unknown';
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
let factCheckUI;
document.addEventListener('DOMContentLoaded', () => {
    factCheckUI = new FactCheckUI();
});
