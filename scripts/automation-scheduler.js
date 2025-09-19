/**
 * LM Studio Extension - Automation Scheduler
 * Handles scheduled automation tasks and workflows
 */

class AutomationScheduler {
    constructor() {
        this.tasks = new Map();
        this.intervals = new Map();
        this.isInitialized = false;
        this.storage = browser.storage.local;
        
        this.init();
    }

    async init() {
        try {
            // Load existing tasks from storage
            await this.loadTasks();
            
            // Start all active scheduled tasks
            await this.startScheduledTasks();
            
            this.isInitialized = true;
            console.log('✅ Automation Scheduler initialized');
        } catch (error) {
            console.error('❌ Failed to initialize Automation Scheduler:', error);
        }
    }

    /**
     * Create a new scheduled automation task
     */
    async createTask(taskConfig) {
        const task = {
            id: this.generateTaskId(),
            name: taskConfig.name,
            description: taskConfig.description || '',
            type: taskConfig.type, // 'interval', 'daily', 'weekly', 'monthly', 'cron'
            schedule: taskConfig.schedule,
            actions: taskConfig.actions || [],
            enabled: taskConfig.enabled !== false,
            createdAt: new Date().toISOString(),
            lastRun: null,
            nextRun: this.calculateNextRun(taskConfig.type, taskConfig.schedule),
            runCount: 0,
            maxRuns: taskConfig.maxRuns || null,
            tags: taskConfig.tags || [],
            metadata: taskConfig.metadata || {}
        };

        this.tasks.set(task.id, task);
        await this.saveTasks();

        if (task.enabled) {
            this.scheduleTask(task);
        }

        console.log(`📅 Created automation task: ${task.name} (${task.id})`);
        return task;
    }

    /**
     * Schedule a task for execution
     */
    scheduleTask(task) {
        if (this.intervals.has(task.id)) {
            clearInterval(this.intervals.get(task.id));
        }

        const delay = this.getScheduleDelay(task.type, task.schedule);
        
        if (delay > 0) {
            const intervalId = setInterval(async () => {
                await this.executeTask(task.id);
            }, delay);
            
            this.intervals.set(task.id, intervalId);
            console.log(`⏰ Scheduled task ${task.name} with ${delay}ms interval`);
        }
    }

    /**
     * Execute a scheduled task
     */
    async executeTask(taskId) {
        const task = this.tasks.get(taskId);
        if (!task || !task.enabled) return;

        // Check if max runs reached
        if (task.maxRuns && task.runCount >= task.maxRuns) {
            await this.disableTask(taskId);
            return;
        }

        try {
            console.log(`🚀 Executing automation task: ${task.name}`);
            
            // Update task execution info
            task.lastRun = new Date().toISOString();
            task.runCount++;
            task.nextRun = this.calculateNextRun(task.type, task.schedule);

            // Execute each action in the task
            for (const action of task.actions) {
                await this.executeAction(action, task);
            }

            // Save updated task info
            await this.saveTasks();
            
            // Notify about successful execution
            this.notifyTaskExecution(task, 'success');
            
        } catch (error) {
            console.error(`❌ Failed to execute task ${task.name}:`, error);
            this.notifyTaskExecution(task, 'error', error.message);
        }
    }

    /**
     * Execute a single automation action
     */
    async executeAction(action, task) {
        switch (action.type) {
            case 'navigate':
                await this.actionNavigate(action);
                break;
            case 'click':
                await this.actionClick(action);
                break;
            case 'extract_data':
                await this.actionExtractData(action, task);
                break;
            case 'fill_form':
                await this.actionFillForm(action);
                break;
            case 'screenshot':
                await this.actionScreenshot(action, task);
                break;
            case 'wait':
                await this.actionWait(action);
                break;
            case 'script':
                await this.actionExecuteScript(action);
                break;
            case 'ai_analysis':
                await this.actionAIAnalysis(action, task);
                break;
            default:
                console.warn(`Unknown action type: ${action.type}`);
        }
    }

    /**
     * Navigation action
     */
    async actionNavigate(action) {
        const tab = await browser.tabs.create({
            url: action.url,
            active: action.active !== false
        });
        
        // Wait for page to load
        return new Promise((resolve) => {
            const listener = (tabId, changeInfo) => {
                if (tabId === tab.id && changeInfo.status === 'complete') {
                    browser.tabs.onUpdated.removeListener(listener);
                    resolve(tab);
                }
            };
            browser.tabs.onUpdated.addListener(listener);
        });
    }

    /**
     * Click action
     */
    async actionClick(action) {
        const tabs = await browser.tabs.query({ active: true, currentWindow: true });
        if (tabs.length === 0) return;

        await browser.tabs.sendMessage(tabs[0].id, {
            type: 'AUTOMATION_CLICK',
            selector: action.selector,
            waitFor: action.waitFor || 1000
        });
    }

    /**
     * Data extraction action
     */
    async actionExtractData(action, task) {
        const tabs = await browser.tabs.query({ active: true, currentWindow: true });
        if (tabs.length === 0) return;

        const data = await browser.tabs.sendMessage(tabs[0].id, {
            type: 'AUTOMATION_EXTRACT',
            selectors: action.selectors,
            format: action.format || 'json'
        });

        // Store extracted data
        const storageKey = `task_data_${task.id}_${Date.now()}`;
        await this.storage.set({ [storageKey]: data });
        
        return data;
    }

    /**
     * Form filling action
     */
    async actionFillForm(action) {
        const tabs = await browser.tabs.query({ active: true, currentWindow: true });
        if (tabs.length === 0) return;

        await browser.tabs.sendMessage(tabs[0].id, {
            type: 'AUTOMATION_FILL_FORM',
            fields: action.fields,
            submit: action.submit || false
        });
    }

    /**
     * Screenshot action
     */
    async actionScreenshot(action, task) {
        const dataUrl = await browser.tabs.captureVisibleTab();
        
        // Store screenshot
        const storageKey = `task_screenshot_${task.id}_${Date.now()}`;
        await this.storage.set({ [storageKey]: dataUrl });
        
        return dataUrl;
    }

    /**
     * Wait action
     */
    async actionWait(action) {
        const delay = action.duration || 1000;
        return new Promise(resolve => setTimeout(resolve, delay));
    }

    /**
     * Execute script action
     */
    async actionExecuteScript(action) {
        const tabs = await browser.tabs.query({ active: true, currentWindow: true });
        if (tabs.length === 0) return;

        return await browser.tabs.executeScript(tabs[0].id, {
            code: action.code
        });
    }

    /**
     * AI Analysis action
     */
    async actionAIAnalysis(action, task) {
        const tabs = await browser.tabs.query({ active: true, currentWindow: true });
        if (tabs.length === 0) return;

        // Get page content
        const content = await browser.tabs.sendMessage(tabs[0].id, {
            type: 'GET_PAGE_CONTENT'
        });

        // Send to LM Studio for analysis
        try {
            const response = await fetch('http://localhost:1234/v1/chat/completions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    messages: [
                        {
                            role: 'system',
                            content: action.prompt || 'Analyze the following web page content and provide insights.'
                        },
                        {
                            role: 'user',
                            content: `Page Title: ${content.title}\n\nContent: ${content.text}`
                        }
                    ],
                    temperature: 0.7,
                    max_tokens: 1000
                })
            });

            const result = await response.json();
            const analysis = result.choices[0].message.content;

            // Store analysis
            const storageKey = `task_analysis_${task.id}_${Date.now()}`;
            await this.storage.set({ [storageKey]: { content, analysis } });

            return analysis;
        } catch (error) {
            console.error('AI Analysis failed:', error);
            throw error;
        }
    }

    /**
     * Calculate schedule delay in milliseconds
     */
    getScheduleDelay(type, schedule) {
        switch (type) {
            case 'interval':
                return schedule * 1000; // schedule in seconds
            case 'daily':
                return 24 * 60 * 60 * 1000; // 24 hours
            case 'weekly':
                return 7 * 24 * 60 * 60 * 1000; // 7 days
            case 'monthly':
                return 30 * 24 * 60 * 60 * 1000; // 30 days
            default:
                return 0;
        }
    }

    /**
     * Calculate next run time
     */
    calculateNextRun(type, schedule) {
        const now = new Date();
        
        switch (type) {
            case 'interval':
                return new Date(now.getTime() + (schedule * 1000)).toISOString();
            case 'daily':
                const tomorrow = new Date(now);
                tomorrow.setDate(tomorrow.getDate() + 1);
                tomorrow.setHours(schedule.hour || 0, schedule.minute || 0, 0, 0);
                return tomorrow.toISOString();
            case 'weekly':
                const nextWeek = new Date(now);
                nextWeek.setDate(nextWeek.getDate() + 7);
                return nextWeek.toISOString();
            default:
                return null;
        }
    }

    /**
     * Task management methods
     */
    async enableTask(taskId) {
        const task = this.tasks.get(taskId);
        if (task) {
            task.enabled = true;
            this.scheduleTask(task);
            await this.saveTasks();
        }
    }

    async disableTask(taskId) {
        const task = this.tasks.get(taskId);
        if (task) {
            task.enabled = false;
            if (this.intervals.has(taskId)) {
                clearInterval(this.intervals.get(taskId));
                this.intervals.delete(taskId);
            }
            await this.saveTasks();
        }
    }

    async deleteTask(taskId) {
        if (this.intervals.has(taskId)) {
            clearInterval(this.intervals.get(taskId));
            this.intervals.delete(taskId);
        }
        this.tasks.delete(taskId);
        await this.saveTasks();
    }

    /**
     * Get all tasks
     */
    getAllTasks() {
        return Array.from(this.tasks.values());
    }

    /**
     * Get task by ID
     */
    getTask(taskId) {
        return this.tasks.get(taskId);
    }

    /**
     * Storage methods
     */
    async loadTasks() {
        try {
            const result = await this.storage.get('automation_tasks');
            if (result.automation_tasks) {
                const tasks = JSON.parse(result.automation_tasks);
                tasks.forEach(task => this.tasks.set(task.id, task));
            }
        } catch (error) {
            console.error('Failed to load automation tasks:', error);
        }
    }

    async saveTasks() {
        try {
            const tasks = Array.from(this.tasks.values());
            await this.storage.set({ automation_tasks: JSON.stringify(tasks) });
        } catch (error) {
            console.error('Failed to save automation tasks:', error);
        }
    }

    async startScheduledTasks() {
        for (const task of this.tasks.values()) {
            if (task.enabled) {
                this.scheduleTask(task);
            }
        }
    }

    /**
     * Utility methods
     */
    generateTaskId() {
        return 'task_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    notifyTaskExecution(task, status, message = '') {
        // Send notification about task execution
        browser.notifications.create({
            type: 'basic',
            iconUrl: 'icons/icon-48.png',
            title: `Automation Task ${status === 'success' ? 'Completed' : 'Failed'}`,
            message: `${task.name}: ${message || (status === 'success' ? 'Executed successfully' : 'Execution failed')}`
        });
    }
}

// Export for use in background script
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AutomationScheduler;
}
