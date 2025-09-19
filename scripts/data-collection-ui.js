/**
 * LM Studio Extension - Data Collection Pipeline UI Controller
 */

class DataCollectionUI {
    constructor() {
        this.pipelines = [];
        this.currentPipeline = null;
        this.currentSite = null;
        this.currentProcessor = null;
        this.currentOutput = null;
        
        this.init();
    }

    async init() {
        this.setupEventListeners();
        await this.loadPipelines();
        this.updateStats();
        this.renderPipelines();
    }

    setupEventListeners() {
        // Header actions
        document.getElementById('createPipelineBtn').addEventListener('click', () => this.showPipelineModal());
        document.getElementById('importPipelinesBtn').addEventListener('click', () => this.importPipelines());
        document.getElementById('exportPipelinesBtn').addEventListener('click', () => this.exportPipelines());

        // Filters
        document.getElementById('statusFilter').addEventListener('change', () => this.filterPipelines());
        document.getElementById('searchFilter').addEventListener('input', () => this.filterPipelines());

        // Template buttons
        document.querySelectorAll('.template-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const template = e.target.dataset.template;
                this.createFromTemplate(template);
            });
        });

        // Pipeline modal
        document.getElementById('pipelineForm').addEventListener('submit', (e) => this.savePipeline(e));
        document.getElementById('cancelBtn').addEventListener('click', () => this.hidePipelineModal());

        // Site modal
        document.getElementById('addSiteBtn').addEventListener('click', () => this.showSiteModal());
        document.getElementById('siteForm').addEventListener('submit', (e) => this.saveSite(e));
        document.getElementById('cancelSiteBtn').addEventListener('click', () => this.hideSiteModal());
        document.getElementById('addSelectorBtn').addEventListener('click', () => this.addSelectorField());

        // Processor modal
        document.getElementById('addProcessorBtn').addEventListener('click', () => this.showProcessorModal());
        document.getElementById('processorForm').addEventListener('submit', (e) => this.saveProcessor(e));
        document.getElementById('cancelProcessorBtn').addEventListener('click', () => this.hideProcessorModal());
        document.getElementById('processorType').addEventListener('change', () => this.updateProcessorConfig());

        // Output modal
        document.getElementById('addOutputBtn').addEventListener('click', () => this.showOutputModal());
        document.getElementById('outputForm').addEventListener('submit', (e) => this.saveOutput(e));
        document.getElementById('cancelOutputBtn').addEventListener('click', () => this.hideOutputModal());
        document.getElementById('outputType').addEventListener('change', () => this.updateOutputConfig());

        // Schedule configuration
        document.getElementById('scheduleType').addEventListener('change', () => this.updateScheduleConfig());

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

    async loadPipelines() {
        try {
            const response = await browser.runtime.sendMessage({
                type: 'GET_DATA_PIPELINES'
            });

            if (response.success) {
                this.pipelines = response.pipelines || [];
            } else {
                console.error('Failed to load pipelines:', response.error);
                this.showNotification('Failed to load pipelines', 'error');
            }
        } catch (error) {
            console.error('Error loading pipelines:', error);
            this.showNotification('Error loading pipelines', 'error');
        }
    }

    updateStats() {
        const totalPipelines = this.pipelines.length;
        const activePipelines = this.pipelines.filter(p => p.enabled).length;
        const totalRecords = this.pipelines.reduce((sum, p) => sum + (p.totalRecords || 0), 0);

        document.getElementById('totalPipelines').textContent = totalPipelines;
        document.getElementById('activePipelines').textContent = activePipelines;
        document.getElementById('totalRecords').textContent = totalRecords.toLocaleString();
    }

    renderPipelines() {
        const container = document.getElementById('pipelineList');
        
        if (this.pipelines.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <h3>No Data Collection Pipelines</h3>
                    <p>Create your first pipeline to start collecting data from websites.</p>
                    <button class="btn btn-primary" onclick="dataCollectionUI.showPipelineModal()">
                        ➕ Create Pipeline
                    </button>
                </div>
            `;
            return;
        }

        container.innerHTML = this.pipelines.map(pipeline => this.renderPipelineCard(pipeline)).join('');
    }

    renderPipelineCard(pipeline) {
        const lastRun = pipeline.lastRun ? new Date(pipeline.lastRun).toLocaleDateString() : 'Never';
        const sitesCount = pipeline.sites ? pipeline.sites.length : 0;
        
        return `
            <div class="pipeline-card ${pipeline.enabled ? '' : 'disabled'}" data-id="${pipeline.id}">
                <div class="pipeline-header">
                    <div>
                        <div class="pipeline-title">${pipeline.name}</div>
                        <div class="pipeline-status ${pipeline.enabled ? 'enabled' : 'disabled'}">
                            ${pipeline.enabled ? 'Enabled' : 'Disabled'}
                        </div>
                    </div>
                </div>
                
                <div class="pipeline-description">
                    ${pipeline.description || 'No description provided'}
                </div>
                
                <div class="pipeline-meta">
                    <div><strong>Sites:</strong> ${sitesCount}</div>
                    <div><strong>Records:</strong> ${(pipeline.totalRecords || 0).toLocaleString()}</div>
                    <div><strong>Last Run:</strong> ${lastRun}</div>
                    <div><strong>Created:</strong> ${new Date(pipeline.createdAt).toLocaleDateString()}</div>
                </div>
                
                <div class="pipeline-actions">
                    <button class="btn btn-success" onclick="dataCollectionUI.executePipeline('${pipeline.id}')">
                        ▶️ Run
                    </button>
                    <button class="btn btn-secondary" onclick="dataCollectionUI.editPipeline('${pipeline.id}')">
                        ✏️ Edit
                    </button>
                    <button class="btn btn-warning" onclick="dataCollectionUI.togglePipeline('${pipeline.id}')">
                        ${pipeline.enabled ? '⏸️ Disable' : '▶️ Enable'}
                    </button>
                    <button class="btn btn-danger" onclick="dataCollectionUI.deletePipeline('${pipeline.id}')">
                        🗑️ Delete
                    </button>
                </div>
            </div>
        `;
    }

    filterPipelines() {
        const statusFilter = document.getElementById('statusFilter').value;
        const searchFilter = document.getElementById('searchFilter').value.toLowerCase();

        let filtered = this.pipelines;

        if (statusFilter) {
            filtered = filtered.filter(p => {
                if (statusFilter === 'enabled') return p.enabled;
                if (statusFilter === 'disabled') return !p.enabled;
                return true;
            });
        }

        if (searchFilter) {
            filtered = filtered.filter(p => 
                p.name.toLowerCase().includes(searchFilter) ||
                (p.description && p.description.toLowerCase().includes(searchFilter))
            );
        }

        const container = document.getElementById('pipelineList');
        container.innerHTML = filtered.map(pipeline => this.renderPipelineCard(pipeline)).join('');
    }

    // Pipeline Management
    showPipelineModal(pipeline = null) {
        this.currentPipeline = pipeline;
        const modal = document.getElementById('pipelineModal');
        const title = document.getElementById('modalTitle');
        
        title.textContent = pipeline ? 'Edit Pipeline' : 'Create Data Collection Pipeline';
        
        if (pipeline) {
            document.getElementById('pipelineName').value = pipeline.name;
            document.getElementById('pipelineDescription').value = pipeline.description || '';
            document.getElementById('scheduleType').value = pipeline.schedule?.type || '';
            
            this.renderSitesList(pipeline.sites || []);
            this.renderProcessorsList(pipeline.processors || []);
            this.renderOutputsList(pipeline.outputs || []);
            this.updateScheduleConfig();
        } else {
            document.getElementById('pipelineForm').reset();
            this.renderSitesList([]);
            this.renderProcessorsList([]);
            this.renderOutputsList([]);
        }
        
        modal.style.display = 'block';
    }

    hidePipelineModal() {
        document.getElementById('pipelineModal').style.display = 'none';
        this.currentPipeline = null;
    }

    async savePipeline(e) {
        e.preventDefault();
        
        const config = {
            name: document.getElementById('pipelineName').value,
            description: document.getElementById('pipelineDescription').value,
            sites: this.getCurrentSites(),
            processors: this.getCurrentProcessors(),
            outputs: this.getCurrentOutputs(),
            schedule: this.getCurrentSchedule(),
            enabled: true
        };

        try {
            if (this.currentPipeline) {
                // Update existing pipeline
                config.id = this.currentPipeline.id;
                // Implementation for update would go here
                this.showNotification('Pipeline update not yet implemented', 'warning');
            } else {
                // Create new pipeline
                const response = await browser.runtime.sendMessage({
                    type: 'CREATE_DATA_PIPELINE',
                    config: config
                });

                if (response.success) {
                    this.pipelines.push(response.pipeline);
                    this.updateStats();
                    this.renderPipelines();
                    this.hidePipelineModal();
                    this.showNotification('Pipeline created successfully!');
                } else {
                    this.showNotification('Failed to create pipeline: ' + response.error, 'error');
                }
            }
        } catch (error) {
            console.error('Error saving pipeline:', error);
            this.showNotification('Error saving pipeline', 'error');
        }
    }

    async executePipeline(pipelineId) {
        try {
            this.showNotification('Executing pipeline...', 'info');
            
            const response = await browser.runtime.sendMessage({
                type: 'EXECUTE_DATA_PIPELINE',
                pipelineId: pipelineId
            });

            if (response.success) {
                this.showNotification(`Pipeline executed successfully! Collected ${response.data.length} records.`);
                await this.loadPipelines();
                this.updateStats();
                this.renderPipelines();
            } else {
                this.showNotification('Pipeline execution failed: ' + response.error, 'error');
            }
        } catch (error) {
            console.error('Error executing pipeline:', error);
            this.showNotification('Error executing pipeline', 'error');
        }
    }

    editPipeline(pipelineId) {
        const pipeline = this.pipelines.find(p => p.id === pipelineId);
        if (pipeline) {
            this.showPipelineModal(pipeline);
        }
    }

    async togglePipeline(pipelineId) {
        const pipeline = this.pipelines.find(p => p.id === pipelineId);
        if (!pipeline) return;

        try {
            const action = pipeline.enabled ? 'DISABLE_DATA_PIPELINE' : 'ENABLE_DATA_PIPELINE';
            const response = await browser.runtime.sendMessage({
                type: action,
                pipelineId: pipelineId
            });

            if (response.success) {
                pipeline.enabled = !pipeline.enabled;
                this.updateStats();
                this.renderPipelines();
                this.showNotification(`Pipeline ${pipeline.enabled ? 'enabled' : 'disabled'}`);
            } else {
                this.showNotification('Failed to toggle pipeline: ' + response.error, 'error');
            }
        } catch (error) {
            console.error('Error toggling pipeline:', error);
            this.showNotification('Error toggling pipeline', 'error');
        }
    }

    async deletePipeline(pipelineId) {
        if (!confirm('Are you sure you want to delete this pipeline?')) return;

        try {
            const response = await browser.runtime.sendMessage({
                type: 'DELETE_DATA_PIPELINE',
                pipelineId: pipelineId
            });

            if (response.success) {
                this.pipelines = this.pipelines.filter(p => p.id !== pipelineId);
                this.updateStats();
                this.renderPipelines();
                this.showNotification('Pipeline deleted successfully');
            } else {
                this.showNotification('Failed to delete pipeline: ' + response.error, 'error');
            }
        } catch (error) {
            console.error('Error deleting pipeline:', error);
            this.showNotification('Error deleting pipeline', 'error');
        }
    }

    // Site Management
    showSiteModal(site = null) {
        this.currentSite = site;
        const modal = document.getElementById('siteModal');
        
        if (site) {
            document.getElementById('siteUrl').value = site.url;
            document.getElementById('waitTime').value = site.waitTime || 2000;
            document.getElementById('maxPages').value = site.maxPages || 1;
            document.getElementById('containerSelector').value = site.selectors?.container || '';
            document.getElementById('nextSelector').value = site.pagination?.nextSelector || '';
            document.getElementById('nextText').value = site.pagination?.nextText || '';
            
            this.renderSelectorsList(site.selectors?.fields || {});
        } else {
            document.getElementById('siteForm').reset();
            this.renderSelectorsList({});
        }
        
        modal.style.display = 'block';
    }

    hideSiteModal() {
        document.getElementById('siteModal').style.display = 'none';
        this.currentSite = null;
    }

    saveSite(e) {
        e.preventDefault();
        
        const siteConfig = {
            url: document.getElementById('siteUrl').value,
            waitTime: parseInt(document.getElementById('waitTime').value),
            maxPages: parseInt(document.getElementById('maxPages').value),
            selectors: {
                container: document.getElementById('containerSelector').value,
                fields: this.getCurrentSelectors()
            },
            pagination: {
                nextSelector: document.getElementById('nextSelector').value,
                nextText: document.getElementById('nextText').value
            }
        };

        // Add to sites list
        const sitesList = document.getElementById('sitesList');
        const siteElement = this.createSiteElement(siteConfig);
        sitesList.appendChild(siteElement);
        
        this.hideSiteModal();
        this.showNotification('Site configuration saved');
    }

    renderSitesList(sites) {
        const container = document.getElementById('sitesList');
        container.innerHTML = '';
        
        sites.forEach(site => {
            const element = this.createSiteElement(site);
            container.appendChild(element);
        });
    }

    createSiteElement(site) {
        const div = document.createElement('div');
        div.className = 'dynamic-item';
        div.innerHTML = `
            <div class="dynamic-item-content">
                <strong>${site.url}</strong><br>
                <small>Max Pages: ${site.maxPages}, Wait: ${site.waitTime}ms</small>
            </div>
            <div class="dynamic-item-actions">
                <button class="btn btn-secondary" onclick="dataCollectionUI.editSite(this)">Edit</button>
                <button class="btn btn-danger" onclick="this.parentElement.parentElement.remove()">Remove</button>
            </div>
        `;
        div.dataset.config = JSON.stringify(site);
        return div;
    }

    addSelectorField() {
        const container = document.getElementById('selectorsList');
        const div = document.createElement('div');
        div.className = 'form-group';
        div.innerHTML = `
            <div style="display: flex; gap: 10px; align-items: end;">
                <div style="flex: 1;">
                    <label>Field Name:</label>
                    <input type="text" class="selector-field" placeholder="e.g., title, price">
                </div>
                <div style="flex: 2;">
                    <label>CSS Selector:</label>
                    <input type="text" class="selector-value" placeholder="e.g., h1, .price">
                </div>
                <div>
                    <label>Type:</label>
                    <select class="selector-type">
                        <option value="text">Text</option>
                        <option value="link">Link</option>
                        <option value="image">Image</option>
                        <option value="number">Number</option>
                        <option value="attribute">Attribute</option>
                    </select>
                </div>
                <button type="button" class="btn btn-danger" onclick="this.parentElement.parentElement.remove()">Remove</button>
            </div>
        `;
        container.appendChild(div);
    }

    renderSelectorsList(selectors) {
        const container = document.getElementById('selectorsList');
        container.innerHTML = '';
        
        Object.entries(selectors).forEach(([field, selector]) => {
            this.addSelectorField();
            const lastGroup = container.lastElementChild;
            lastGroup.querySelector('.selector-field').value = field;
            lastGroup.querySelector('.selector-value').value = selector;
        });
    }

    getCurrentSelectors() {
        const selectors = {};
        document.querySelectorAll('#selectorsList .form-group').forEach(group => {
            const field = group.querySelector('.selector-field').value;
            const value = group.querySelector('.selector-value').value;
            if (field && value) {
                selectors[field] = value;
            }
        });
        return selectors;
    }

    getCurrentSites() {
        const sites = [];
        document.querySelectorAll('#sitesList .dynamic-item').forEach(item => {
            const config = JSON.parse(item.dataset.config);
            sites.push(config);
        });
        return sites;
    }

    getCurrentProcessors() {
        const processors = [];
        document.querySelectorAll('#processorsList .dynamic-item').forEach(item => {
            const config = JSON.parse(item.dataset.config);
            processors.push(config);
        });
        return processors;
    }

    getCurrentOutputs() {
        const outputs = [];
        document.querySelectorAll('#outputsList .dynamic-item').forEach(item => {
            const config = JSON.parse(item.dataset.config);
            outputs.push(config);
        });
        return outputs;
    }

    getCurrentSchedule() {
        const scheduleType = document.getElementById('scheduleType').value;
        if (!scheduleType) return null;

        return {
            type: scheduleType,
            // Add schedule-specific configuration based on type
        };
    }

    // Processor Management
    showProcessorModal() {
        document.getElementById('processorModal').style.display = 'block';
    }

    hideProcessorModal() {
        document.getElementById('processorModal').style.display = 'none';
    }

    saveProcessor(e) {
        e.preventDefault();
        // Implementation for processor saving
        this.hideProcessorModal();
    }

    updateProcessorConfig() {
        // Update processor configuration UI based on selected type
    }

    renderProcessorsList(processors) {
        const container = document.getElementById('processorsList');
        container.innerHTML = '';
        // Implementation for rendering processors list
    }

    // Output Management
    showOutputModal() {
        document.getElementById('outputModal').style.display = 'block';
    }

    hideOutputModal() {
        document.getElementById('outputModal').style.display = 'none';
    }

    saveOutput(e) {
        e.preventDefault();
        // Implementation for output saving
        this.hideOutputModal();
    }

    updateOutputConfig() {
        // Update output configuration UI based on selected type
    }

    renderOutputsList(outputs) {
        const container = document.getElementById('outputsList');
        container.innerHTML = '';
        // Implementation for rendering outputs list
    }

    updateScheduleConfig() {
        const scheduleType = document.getElementById('scheduleType').value;
        const configDiv = document.getElementById('scheduleConfig');
        
        if (!scheduleType) {
            configDiv.style.display = 'none';
            return;
        }

        configDiv.style.display = 'block';
        // Add schedule-specific configuration UI
    }

    // Template Management
    createFromTemplate(templateName) {
        const templates = {
            'news-scraper': {
                name: 'News Scraper',
                description: 'Collect news articles from news websites',
                sites: [{
                    url: 'https://example-news-site.com',
                    selectors: {
                        container: '.article-card',
                        fields: {
                            title: 'h2',
                            summary: '.summary',
                            link: 'a',
                            date: '.date'
                        }
                    },
                    maxPages: 3
                }],
                processors: [
                    { type: 'filter', config: { conditions: [{ field: 'title', operator: 'exists' }] } },
                    { type: 'deduplicate', config: { uniqueField: 'link' } }
                ],
                outputs: [
                    { type: 'storage', config: { key: 'news_articles' } }
                ]
            },
            'product-monitor': {
                name: 'Product Price Monitor',
                description: 'Monitor product prices across e-commerce sites',
                sites: [{
                    url: 'https://example-shop.com/products',
                    selectors: {
                        container: '.product-item',
                        fields: {
                            name: '.product-name',
                            price: '.price',
                            availability: '.stock-status',
                            link: 'a'
                        }
                    }
                }],
                processors: [
                    { type: 'transform', config: { transformations: [{ source: 'price', type: 'convert_type', targetType: 'number' }] } }
                ],
                outputs: [
                    { type: 'csv', config: { filename: 'product_prices.csv' } }
                ]
            }
            // Add more templates as needed
        };

        const template = templates[templateName];
        if (template) {
            this.showPipelineModal();
            document.getElementById('pipelineName').value = template.name;
            document.getElementById('pipelineDescription').value = template.description;
            this.renderSitesList(template.sites);
            this.renderProcessorsList(template.processors);
            this.renderOutputsList(template.outputs);
        }
    }

    // Import/Export
    importPipelines() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        input.onchange = (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    try {
                        const pipelines = JSON.parse(e.target.result);
                        // Implementation for importing pipelines
                        this.showNotification('Pipelines imported successfully');
                    } catch (error) {
                        this.showNotification('Failed to import pipelines', 'error');
                    }
                };
                reader.readAsText(file);
            }
        };
        input.click();
    }

    exportPipelines() {
        const data = JSON.stringify(this.pipelines, null, 2);
        const blob = new Blob([data], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `data-collection-pipelines-${Date.now()}.json`;
        a.click();
        
        URL.revokeObjectURL(url);
        this.showNotification('Pipelines exported successfully');
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
const dataCollectionUI = new DataCollectionUI();
