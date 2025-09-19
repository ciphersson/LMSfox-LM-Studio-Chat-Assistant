/**
 * LM Studio Extension - Automation UI Controller
 * Manages the automation tasks interface
 */

class AutomationUI {
    constructor() {
        this.tasks = [];
        this.currentTask = null;
        this.currentAction = null;
        
        this.init();
    }

    async init() {
        // Load existing tasks
        await this.loadTasks();
        
        // Setup event listeners
        this.setupEventListeners();
        
        // Render tasks
        this.renderTasks();
        
        console.log('✅ Automation UI initialized');
    }

    setupEventListeners() {
        // Header controls
        document.getElementById('new-task-btn').addEventListener('click', () => this.showTaskModal());
        document.getElementById('import-btn').addEventListener('click', () => this.importTasks());
        document.getElementById('export-btn').addEventListener('click', () => this.exportTasks());

        // Template buttons
        document.querySelectorAll('.template-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const template = e.target.dataset.template;
                this.createFromTemplate(template);
            });
        });

        // Search and filters
        document.getElementById('task-search').addEventListener('input', (e) => this.filterTasks());
        document.getElementById('category-filter').addEventListener('change', () => this.filterTasks());
        document.getElementById('status-filter').addEventListener('change', () => this.filterTasks());

        // View controls
        document.getElementById('grid-view').addEventListener('click', () => this.setView('grid'));
        document.getElementById('list-view').addEventListener('click', () => this.setView('list'));

        // Task modal
        document.getElementById('save-task-btn').addEventListener('click', () => this.saveTask());
        document.getElementById('cancel-task-btn').addEventListener('click', () => this.hideTaskModal());
        document.getElementById('add-action-btn').addEventListener('click', () => this.showActionModal());

        // Action modal
        document.getElementById('save-action-btn').addEventListener('click', () => this.saveAction());
        document.getElementById('cancel-action-btn').addEventListener('click', () => this.hideActionModal());
        document.getElementById('action-type').addEventListener('change', () => this.updateActionConfig());

        // Modal close buttons
        document.querySelectorAll('.modal-close').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const modal = e.target.closest('.modal');
                modal.style.display = 'none';
            });
        });

        // Click outside modal to close
        document.querySelectorAll('.modal').forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    modal.style.display = 'none';
                }
            });
        });
    }

    async loadTasks() {
        try {
            const response = await browser.runtime.sendMessage({
                action: 'GET_AUTOMATION_TASKS'
            });
            
            if (response && response.success) {
                this.tasks = response.tasks || [];
            }
        } catch (error) {
            console.error('Failed to load tasks:', error);
        }
    }

    renderTasks() {
        const container = document.getElementById('tasks-container');
        
        if (this.tasks.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <h3>No automation tasks yet</h3>
                    <p>Create your first automation task to get started</p>
                    <button class="btn-primary" onclick="automationUI.showTaskModal()">Create Task</button>
                </div>
            `;
            return;
        }

        container.innerHTML = this.tasks.map(task => this.renderTaskCard(task)).join('');
    }

    renderTaskCard(task) {
        const statusClass = task.enabled ? 'enabled' : 'disabled';
        const nextRun = task.nextRun ? new Date(task.nextRun).toLocaleString() : 'Not scheduled';
        
        return `
            <div class="task-card ${task.enabled ? '' : 'disabled'}" data-task-id="${task.id}">
                <div class="task-header">
                    <div>
                        <div class="task-title">${task.name}</div>
                        <div class="task-status ${statusClass}">${task.enabled ? 'Enabled' : 'Disabled'}</div>
                    </div>
                </div>
                
                <div class="task-description">${task.description || 'No description'}</div>
                
                <div class="task-schedule">
                    ⏰ ${this.formatSchedule(task.type, task.schedule)}
                </div>
                
                <div class="task-stats">
                    <div class="stat-item">
                        <div class="stat-value">${task.runCount}</div>
                        <div class="stat-label">Runs</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-value">${task.actions.length}</div>
                        <div class="stat-label">Actions</div>
                    </div>
                </div>
                
                <div class="task-tags">
                    ${task.tags.map(tag => `<span class="task-tag">${tag}</span>`).join('')}
                </div>
                
                <div class="task-actions">
                    <button class="task-btn edit" onclick="automationUI.editTask('${task.id}')">✏️ Edit</button>
                    <button class="task-btn toggle" onclick="automationUI.toggleTask('${task.id}')">
                        ${task.enabled ? '⏸️ Disable' : '▶️ Enable'}
                    </button>
                    <button class="task-btn delete" onclick="automationUI.deleteTask('${task.id}')">🗑️ Delete</button>
                </div>
            </div>
        `;
    }

    formatSchedule(type, schedule) {
        switch (type) {
            case 'interval':
                return `Every ${schedule} seconds`;
            case 'daily':
                return `Daily at ${schedule.hour || 0}:${String(schedule.minute || 0).padStart(2, '0')}`;
            case 'weekly':
                return 'Weekly';
            case 'monthly':
                return 'Monthly';
            default:
                return 'Unknown schedule';
        }
    }

    showTaskModal(task = null) {
        this.currentTask = task;
        const modal = document.getElementById('task-modal');
        const title = document.getElementById('modal-title');
        
        if (task) {
            title.textContent = 'Edit Automation Task';
            this.populateTaskForm(task);
        } else {
            title.textContent = 'Create New Automation Task';
            this.clearTaskForm();
        }
        
        modal.style.display = 'block';
    }

    hideTaskModal() {
        document.getElementById('task-modal').style.display = 'none';
        this.currentTask = null;
    }

    populateTaskForm(task) {
        document.getElementById('task-name').value = task.name;
        document.getElementById('task-description').value = task.description || '';
        document.getElementById('task-type').value = task.type;
        document.getElementById('task-schedule').value = task.schedule;
        document.getElementById('task-tags').value = task.tags.join(', ');
        
        this.renderActions(task.actions);
    }

    clearTaskForm() {
        document.getElementById('task-form').reset();
        document.getElementById('actions-container').innerHTML = '';
    }

    renderActions(actions = []) {
        const container = document.getElementById('actions-container');
        container.innerHTML = actions.map((action, index) => `
            <div class="action-item" data-index="${index}">
                <div class="action-header">
                    <span class="action-type">${this.getActionTypeLabel(action.type)}</span>
                    <button class="action-remove" onclick="automationUI.removeAction(${index})">Remove</button>
                </div>
                <div class="action-config">${this.getActionConfigSummary(action)}</div>
            </div>
        `).join('');
    }

    getActionTypeLabel(type) {
        const labels = {
            'navigate': 'Navigate to URL',
            'click': 'Click Element',
            'extract_data': 'Extract Data',
            'fill_form': 'Fill Form',
            'screenshot': 'Take Screenshot',
            'wait': 'Wait',
            'script': 'Execute Script',
            'ai_analysis': 'AI Analysis'
        };
        return labels[type] || type;
    }

    getActionConfigSummary(action) {
        switch (action.type) {
            case 'navigate':
                return `URL: ${action.url}`;
            case 'click':
                return `Selector: ${action.selector}`;
            case 'extract_data':
                return `Selectors: ${Object.keys(action.selectors || {}).join(', ')}`;
            case 'fill_form':
                return `Fields: ${Object.keys(action.fields || {}).length}`;
            case 'wait':
                return `Duration: ${action.duration}ms`;
            case 'ai_analysis':
                return `Prompt: ${action.prompt?.substring(0, 50)}...`;
            default:
                return 'Configured';
        }
    }

    showActionModal() {
        this.currentAction = null;
        document.getElementById('action-modal').style.display = 'block';
        document.getElementById('action-form').reset();
        this.updateActionConfig();
    }

    hideActionModal() {
        document.getElementById('action-modal').style.display = 'none';
        this.currentAction = null;
    }

    updateActionConfig() {
        const actionType = document.getElementById('action-type').value;
        const configContainer = document.getElementById('action-config');
        
        const configs = {
            'navigate': `
                <div class="form-group">
                    <label for="action-url">URL</label>
                    <input type="url" id="action-url" required placeholder="https://example.com">
                </div>
                <div class="form-group">
                    <label>
                        <input type="checkbox" id="action-active"> Open in active tab
                    </label>
                </div>
            `,
            'click': `
                <div class="form-group">
                    <label for="action-selector">CSS Selector</label>
                    <input type="text" id="action-selector" required placeholder="#button, .class, [data-id]">
                </div>
                <div class="form-group">
                    <label for="action-wait">Wait before click (ms)</label>
                    <input type="number" id="action-wait" value="1000">
                </div>
            `,
            'extract_data': `
                <div class="form-group">
                    <label for="action-selectors">Data Selectors (JSON)</label>
                    <textarea id="action-selectors" rows="4" placeholder='{"title": "h1", "price": ".price"}'></textarea>
                </div>
                <div class="form-group">
                    <label for="action-format">Output Format</label>
                    <select id="action-format">
                        <option value="json">JSON</option>
                        <option value="string">String</option>
                    </select>
                </div>
            `,
            'fill_form': `
                <div class="form-group">
                    <label for="action-fields">Form Fields (JSON)</label>
                    <textarea id="action-fields" rows="4" placeholder='{"#name": "John Doe", "#email": "john@example.com"}'></textarea>
                </div>
                <div class="form-group">
                    <label>
                        <input type="checkbox" id="action-submit"> Submit form after filling
                    </label>
                </div>
            `,
            'wait': `
                <div class="form-group">
                    <label for="action-duration">Wait Duration (ms)</label>
                    <input type="number" id="action-duration" required value="1000">
                </div>
            `,
            'script': `
                <div class="form-group">
                    <label for="action-code">JavaScript Code</label>
                    <textarea id="action-code" rows="6" placeholder="console.log('Hello from automation');"></textarea>
                </div>
            `,
            'ai_analysis': `
                <div class="form-group">
                    <label for="action-prompt">Analysis Prompt</label>
                    <textarea id="action-prompt" rows="4" placeholder="Analyze this page and extract key insights..."></textarea>
                </div>
            `
        };
        
        configContainer.innerHTML = configs[actionType] || '';
    }

    async saveAction() {
        const actionType = document.getElementById('action-type').value;
        const action = { type: actionType };
        
        // Collect action-specific configuration
        switch (actionType) {
            case 'navigate':
                action.url = document.getElementById('action-url').value;
                action.active = document.getElementById('action-active').checked;
                break;
            case 'click':
                action.selector = document.getElementById('action-selector').value;
                action.waitFor = parseInt(document.getElementById('action-wait').value);
                break;
            case 'extract_data':
                try {
                    action.selectors = JSON.parse(document.getElementById('action-selectors').value);
                    action.format = document.getElementById('action-format').value;
                } catch (e) {
                    alert('Invalid JSON in selectors field');
                    return;
                }
                break;
            case 'fill_form':
                try {
                    action.fields = JSON.parse(document.getElementById('action-fields').value);
                    action.submit = document.getElementById('action-submit').checked;
                } catch (e) {
                    alert('Invalid JSON in fields');
                    return;
                }
                break;
            case 'wait':
                action.duration = parseInt(document.getElementById('action-duration').value);
                break;
            case 'script':
                action.code = document.getElementById('action-code').value;
                break;
            case 'ai_analysis':
                action.prompt = document.getElementById('action-prompt').value;
                break;
        }
        
        // Add action to current task's actions
        const actionsContainer = document.getElementById('actions-container');
        const currentActions = Array.from(actionsContainer.children).map((item, index) => {
            return this.currentTask?.actions?.[index] || {};
        });
        
        currentActions.push(action);
        this.renderActions(currentActions);
        this.hideActionModal();
    }

    removeAction(index) {
        const actionsContainer = document.getElementById('actions-container');
        const actionItems = Array.from(actionsContainer.children);
        if (actionItems[index]) {
            actionItems[index].remove();
        }
    }

    async saveTask() {
        const form = document.getElementById('task-form');
        if (!form.checkValidity()) {
            form.reportValidity();
            return;
        }
        
        // Collect actions
        const actionsContainer = document.getElementById('actions-container');
        const actions = Array.from(actionsContainer.children).map((item, index) => {
            return this.currentTask?.actions?.[index] || {};
        });
        
        const taskConfig = {
            name: document.getElementById('task-name').value,
            description: document.getElementById('task-description').value,
            type: document.getElementById('task-type').value,
            schedule: this.parseSchedule(),
            tags: document.getElementById('task-tags').value.split(',').map(t => t.trim()).filter(t => t),
            actions: actions
        };
        
        try {
            const response = await browser.runtime.sendMessage({
                action: 'CREATE_AUTOMATION_TASK',
                taskConfig: taskConfig
            });
            
            if (response && response.success) {
                await this.loadTasks();
                this.renderTasks();
                this.hideTaskModal();
            } else {
                alert('Failed to save task: ' + (response?.error || 'Unknown error'));
            }
        } catch (error) {
            console.error('Failed to save task:', error);
            alert('Failed to save task');
        }
    }

    parseSchedule() {
        const type = document.getElementById('task-type').value;
        const value = document.getElementById('task-schedule').value;
        
        switch (type) {
            case 'interval':
                return parseInt(value);
            case 'daily':
                return { hour: parseInt(value), minute: 0 };
            case 'weekly':
            case 'monthly':
                return parseInt(value);
            default:
                return value;
        }
    }

    async toggleTask(taskId) {
        const task = this.tasks.find(t => t.id === taskId);
        if (!task) return;
        
        try {
            const action = task.enabled ? 'DISABLE_AUTOMATION_TASK' : 'ENABLE_AUTOMATION_TASK';
            const response = await browser.runtime.sendMessage({
                action: action,
                taskId: taskId
            });
            
            if (response && response.success) {
                await this.loadTasks();
                this.renderTasks();
            }
        } catch (error) {
            console.error('Failed to toggle task:', error);
        }
    }

    async deleteTask(taskId) {
        if (!confirm('Are you sure you want to delete this task?')) return;
        
        try {
            const response = await browser.runtime.sendMessage({
                action: 'DELETE_AUTOMATION_TASK',
                taskId: taskId
            });
            
            if (response && response.success) {
                await this.loadTasks();
                this.renderTasks();
            }
        } catch (error) {
            console.error('Failed to delete task:', error);
        }
    }

    editTask(taskId) {
        const task = this.tasks.find(t => t.id === taskId);
        if (task) {
            this.showTaskModal(task);
        }
    }

    createFromTemplate(templateName) {
        const templates = {
            'price-monitor': {
                name: 'Price Monitor',
                description: 'Monitor product prices and get notifications',
                type: 'interval',
                schedule: 3600, // 1 hour
                tags: ['monitoring', 'price'],
                actions: [
                    { type: 'navigate', url: 'https://example-store.com/product' },
                    { type: 'extract_data', selectors: { price: '.price' }, format: 'json' },
                    { type: 'ai_analysis', prompt: 'Check if the price has changed significantly' }
                ]
            },
            'news-scraper': {
                name: 'News Scraper',
                description: 'Collect latest news articles',
                type: 'daily',
                schedule: { hour: 9, minute: 0 },
                tags: ['scraping', 'news'],
                actions: [
                    { type: 'navigate', url: 'https://news-site.com' },
                    { type: 'extract_data', selectors: { headlines: '.headline', links: '.article-link' } }
                ]
            },
            'form-filler': {
                name: 'Form Auto-Filler',
                description: 'Automatically fill forms with predefined data',
                type: 'interval',
                schedule: 300, // 5 minutes
                tags: ['automation', 'forms'],
                actions: [
                    { type: 'fill_form', fields: { '#name': 'Auto User', '#email': 'auto@example.com' }, submit: false }
                ]
            },
            'page-analyzer': {
                name: 'Page Analyzer',
                description: 'Analyze web pages with AI',
                type: 'interval',
                schedule: 1800, // 30 minutes
                tags: ['analysis', 'ai'],
                actions: [
                    { type: 'screenshot' },
                    { type: 'ai_analysis', prompt: 'Analyze this webpage for key insights and changes' }
                ]
            }
        };
        
        const template = templates[templateName];
        if (template) {
            this.showTaskModal();
            setTimeout(() => this.populateTaskForm(template), 100);
        }
    }

    filterTasks() {
        const search = document.getElementById('task-search').value.toLowerCase();
        const category = document.getElementById('category-filter').value;
        const status = document.getElementById('status-filter').value;
        
        let filtered = this.tasks;
        
        if (search) {
            filtered = filtered.filter(task => 
                task.name.toLowerCase().includes(search) ||
                task.description.toLowerCase().includes(search) ||
                task.tags.some(tag => tag.toLowerCase().includes(search))
            );
        }
        
        if (category !== 'all') {
            filtered = filtered.filter(task => task.tags.includes(category));
        }
        
        if (status !== 'all') {
            filtered = filtered.filter(task => {
                if (status === 'enabled') return task.enabled;
                if (status === 'disabled') return !task.enabled;
                return true;
            });
        }
        
        // Render filtered tasks
        const container = document.getElementById('tasks-container');
        if (filtered.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <h3>No tasks match your filters</h3>
                    <p>Try adjusting your search or filter criteria</p>
                </div>
            `;
        } else {
            container.innerHTML = filtered.map(task => this.renderTaskCard(task)).join('');
        }
    }

    setView(viewType) {
        document.querySelectorAll('.view-btn').forEach(btn => btn.classList.remove('active'));
        document.getElementById(`${viewType}-view`).classList.add('active');
        
        const container = document.getElementById('tasks-container');
        if (viewType === 'list') {
            container.style.gridTemplateColumns = '1fr';
        } else {
            container.style.gridTemplateColumns = 'repeat(auto-fill, minmax(300px, 1fr))';
        }
    }

    async exportTasks() {
        const dataStr = JSON.stringify(this.tasks, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        
        const link = document.createElement('a');
        link.href = URL.createObjectURL(dataBlob);
        link.download = `lm-studio-automation-tasks-${new Date().toISOString().split('T')[0]}.json`;
        link.click();
    }

    async importTasks() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        
        input.onchange = async (e) => {
            const file = e.target.files[0];
            if (!file) return;
            
            try {
                const text = await file.text();
                const importedTasks = JSON.parse(text);
                
                for (const task of importedTasks) {
                    await browser.runtime.sendMessage({
                        action: 'CREATE_AUTOMATION_TASK',
                        taskConfig: task
                    });
                }
                
                await this.loadTasks();
                this.renderTasks();
                alert(`Imported ${importedTasks.length} tasks successfully`);
            } catch (error) {
                alert('Failed to import tasks: ' + error.message);
            }
        };
        
        input.click();
    }
}

// Initialize automation UI
const automationUI = new AutomationUI();
