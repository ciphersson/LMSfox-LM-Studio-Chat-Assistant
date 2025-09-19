/**
 * LM Studio Extension - Multi-Site Data Collection Pipeline
 * Handles coordinated data collection across multiple websites
 */

class DataCollectionPipeline {
    constructor() {
        this.pipelines = new Map();
        this.collectors = new Map();
        this.storage = browser.storage.local;
        this.isRunning = false;
        
        this.init();
    }

    async init() {
        try {
            await this.loadPipelines();
            console.log('✅ Data Collection Pipeline initialized');
        } catch (error) {
            console.error('❌ Failed to initialize Data Collection Pipeline:', error);
        }
    }

    /**
     * Create a new data collection pipeline
     */
    async createPipeline(config) {
        const pipeline = {
            id: this.generatePipelineId(),
            name: config.name,
            description: config.description || '',
            sites: config.sites || [], // Array of site configurations
            schedule: config.schedule || null,
            dataSchema: config.dataSchema || {},
            processors: config.processors || [], // Data processing steps
            outputs: config.outputs || [], // Where to save/send data
            enabled: config.enabled !== false,
            createdAt: new Date().toISOString(),
            lastRun: null,
            totalRecords: 0,
            metadata: config.metadata || {}
        };

        this.pipelines.set(pipeline.id, pipeline);
        await this.savePipelines();

        console.log(`📊 Created data collection pipeline: ${pipeline.name} (${pipeline.id})`);
        return pipeline;
    }

    /**
     * Execute a data collection pipeline
     */
    async executePipeline(pipelineId) {
        const pipeline = this.pipelines.get(pipelineId);
        if (!pipeline || !pipeline.enabled) return;

        try {
            console.log(`🚀 Executing pipeline: ${pipeline.name}`);
            
            pipeline.lastRun = new Date().toISOString();
            const collectedData = [];

            // Collect data from each site
            for (const siteConfig of pipeline.sites) {
                try {
                    const siteData = await this.collectFromSite(siteConfig, pipeline);
                    if (siteData && siteData.length > 0) {
                        collectedData.push(...siteData);
                    }
                } catch (error) {
                    console.error(`Failed to collect from ${siteConfig.url}:`, error);
                }
            }

            // Process collected data
            let processedData = collectedData;
            for (const processor of pipeline.processors) {
                processedData = await this.processData(processedData, processor, pipeline);
            }

            // Output processed data
            for (const output of pipeline.outputs) {
                await this.outputData(processedData, output, pipeline);
            }

            // Update pipeline stats
            pipeline.totalRecords += processedData.length;
            await this.savePipelines();

            console.log(`✅ Pipeline completed: ${processedData.length} records collected`);
            return processedData;

        } catch (error) {
            console.error(`❌ Pipeline execution failed:`, error);
            throw error;
        }
    }

    /**
     * Collect data from a single site
     */
    async collectFromSite(siteConfig, pipeline) {
        const collector = {
            url: siteConfig.url,
            selectors: siteConfig.selectors || {},
            pagination: siteConfig.pagination || null,
            waitTime: siteConfig.waitTime || 2000,
            maxPages: siteConfig.maxPages || 1,
            headers: siteConfig.headers || {},
            cookies: siteConfig.cookies || {}
        };

        const collectedData = [];
        let currentPage = 1;

        try {
            // Create new tab for collection
            const tab = await browser.tabs.create({
                url: collector.url,
                active: false
            });

            // Wait for page to load
            await this.waitForPageLoad(tab.id);
            await this.sleep(collector.waitTime);

            while (currentPage <= collector.maxPages) {
                console.log(`📄 Collecting from page ${currentPage} of ${collector.url}`);

                // Extract data from current page
                const pageData = await browser.tabs.sendMessage(tab.id, {
                    type: 'COLLECT_DATA',
                    selectors: collector.selectors,
                    schema: pipeline.dataSchema
                });

                if (pageData && pageData.length > 0) {
                    // Add metadata to each record
                    const enrichedData = pageData.map(record => ({
                        ...record,
                        _source: collector.url,
                        _collected_at: new Date().toISOString(),
                        _page: currentPage,
                        _pipeline: pipeline.id
                    }));
                    
                    collectedData.push(...enrichedData);
                }

                // Handle pagination
                if (collector.pagination && currentPage < collector.maxPages) {
                    const hasNextPage = await this.navigateToNextPage(tab.id, collector.pagination);
                    if (!hasNextPage) break;
                    
                    await this.sleep(collector.waitTime);
                    currentPage++;
                } else {
                    break;
                }
            }

            // Close the tab
            await browser.tabs.remove(tab.id);

        } catch (error) {
            console.error(`Collection error for ${collector.url}:`, error);
        }

        return collectedData;
    }

    /**
     * Process collected data through processors
     */
    async processData(data, processor, pipeline) {
        switch (processor.type) {
            case 'filter':
                return this.filterData(data, processor.config);
            case 'transform':
                return this.transformData(data, processor.config);
            case 'deduplicate':
                return this.deduplicateData(data, processor.config);
            case 'enrich':
                return await this.enrichData(data, processor.config, pipeline);
            case 'ai_analysis':
                return await this.aiAnalyzeData(data, processor.config, pipeline);
            case 'validate':
                return this.validateData(data, processor.config);
            default:
                console.warn(`Unknown processor type: ${processor.type}`);
                return data;
        }
    }

    /**
     * Filter data based on conditions
     */
    filterData(data, config) {
        if (!config.conditions) return data;

        return data.filter(record => {
            return config.conditions.every(condition => {
                const value = this.getNestedValue(record, condition.field);
                
                switch (condition.operator) {
                    case 'equals':
                        return value === condition.value;
                    case 'contains':
                        return String(value).includes(condition.value);
                    case 'greater_than':
                        return Number(value) > Number(condition.value);
                    case 'less_than':
                        return Number(value) < Number(condition.value);
                    case 'exists':
                        return value !== undefined && value !== null;
                    case 'regex':
                        return new RegExp(condition.value).test(String(value));
                    default:
                        return true;
                }
            });
        });
    }

    /**
     * Transform data fields
     */
    transformData(data, config) {
        if (!config.transformations) return data;

        return data.map(record => {
            const transformed = { ...record };
            
            config.transformations.forEach(transform => {
                const value = this.getNestedValue(record, transform.source);
                
                switch (transform.type) {
                    case 'rename':
                        transformed[transform.target] = value;
                        delete transformed[transform.source];
                        break;
                    case 'convert_type':
                        transformed[transform.target || transform.source] = this.convertType(value, transform.targetType);
                        break;
                    case 'extract_regex':
                        const match = String(value).match(new RegExp(transform.pattern));
                        transformed[transform.target] = match ? match[1] || match[0] : null;
                        break;
                    case 'calculate':
                        transformed[transform.target] = this.calculateValue(record, transform.formula);
                        break;
                }
            });
            
            return transformed;
        });
    }

    /**
     * Remove duplicate records
     */
    deduplicateData(data, config) {
        const uniqueKey = config.uniqueField || 'id';
        const seen = new Set();
        
        return data.filter(record => {
            const key = this.getNestedValue(record, uniqueKey);
            if (seen.has(key)) {
                return false;
            }
            seen.add(key);
            return true;
        });
    }

    /**
     * Enrich data with additional information
     */
    async enrichData(data, config, pipeline) {
        const enriched = [];
        
        for (const record of data) {
            const enrichedRecord = { ...record };
            
            // Add external data sources
            if (config.sources) {
                for (const source of config.sources) {
                    try {
                        const additionalData = await this.fetchEnrichmentData(record, source);
                        Object.assign(enrichedRecord, additionalData);
                    } catch (error) {
                        console.warn(`Enrichment failed for source ${source.name}:`, error);
                    }
                }
            }
            
            enriched.push(enrichedRecord);
        }
        
        return enriched;
    }

    /**
     * AI analysis of collected data
     */
    async aiAnalyzeData(data, config, pipeline) {
        try {
            const prompt = config.prompt || 'Analyze this data and extract insights';
            const dataString = JSON.stringify(data.slice(0, 10), null, 2); // Limit for API
            
            const response = await fetch('http://localhost:1234/v1/chat/completions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    messages: [
                        { role: 'system', content: prompt },
                        { role: 'user', content: `Data to analyze:\n${dataString}` }
                    ],
                    temperature: 0.3,
                    max_tokens: 1000
                })
            });

            const result = await response.json();
            const analysis = result.choices[0].message.content;

            // Add analysis to each record or as metadata
            return data.map(record => ({
                ...record,
                _ai_analysis: analysis
            }));

        } catch (error) {
            console.error('AI analysis failed:', error);
            return data;
        }
    }

    /**
     * Validate data against schema
     */
    validateData(data, config) {
        if (!config.schema) return data;

        return data.filter(record => {
            return Object.entries(config.schema).every(([field, rules]) => {
                const value = this.getNestedValue(record, field);
                
                if (rules.required && (value === undefined || value === null)) {
                    return false;
                }
                
                if (rules.type && typeof value !== rules.type) {
                    return false;
                }
                
                if (rules.minLength && String(value).length < rules.minLength) {
                    return false;
                }
                
                if (rules.pattern && !new RegExp(rules.pattern).test(String(value))) {
                    return false;
                }
                
                return true;
            });
        });
    }

    /**
     * Output processed data
     */
    async outputData(data, output, pipeline) {
        switch (output.type) {
            case 'storage':
                await this.saveToStorage(data, output.config, pipeline);
                break;
            case 'csv':
                await this.exportToCsv(data, output.config, pipeline);
                break;
            case 'json':
                await this.exportToJson(data, output.config, pipeline);
                break;
            case 'webhook':
                await this.sendToWebhook(data, output.config, pipeline);
                break;
            case 'email':
                await this.sendByEmail(data, output.config, pipeline);
                break;
            default:
                console.warn(`Unknown output type: ${output.type}`);
        }
    }

    /**
     * Save data to browser storage
     */
    async saveToStorage(data, config, pipeline) {
        const storageKey = config.key || `pipeline_${pipeline.id}_${Date.now()}`;
        await this.storage.set({ [storageKey]: data });
        console.log(`💾 Saved ${data.length} records to storage: ${storageKey}`);
    }

    /**
     * Export data to CSV
     */
    async exportToCsv(data, config, pipeline) {
        if (data.length === 0) return;

        const headers = Object.keys(data[0]);
        const csvContent = [
            headers.join(','),
            ...data.map(row => headers.map(header => 
                JSON.stringify(row[header] || '')
            ).join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        
        const filename = config.filename || `${pipeline.name}_${Date.now()}.csv`;
        
        // Trigger download
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        link.click();
        
        console.log(`📄 Exported ${data.length} records to CSV: ${filename}`);
    }

    /**
     * Export data to JSON
     */
    async exportToJson(data, config, pipeline) {
        const jsonContent = JSON.stringify(data, null, 2);
        const blob = new Blob([jsonContent], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const filename = config.filename || `${pipeline.name}_${Date.now()}.json`;
        
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        link.click();
        
        console.log(`📄 Exported ${data.length} records to JSON: ${filename}`);
    }

    /**
     * Send data to webhook
     */
    async sendToWebhook(data, config, pipeline) {
        try {
            const response = await fetch(config.url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...config.headers
                },
                body: JSON.stringify({
                    pipeline: pipeline.name,
                    timestamp: new Date().toISOString(),
                    data: data
                })
            });

            if (response.ok) {
                console.log(`🌐 Sent ${data.length} records to webhook: ${config.url}`);
            } else {
                throw new Error(`Webhook failed: ${response.status}`);
            }
        } catch (error) {
            console.error('Webhook delivery failed:', error);
        }
    }

    /**
     * Utility methods
     */
    async waitForPageLoad(tabId) {
        return new Promise((resolve) => {
            const listener = (changedTabId, changeInfo) => {
                if (changedTabId === tabId && changeInfo.status === 'complete') {
                    browser.tabs.onUpdated.removeListener(listener);
                    resolve();
                }
            };
            browser.tabs.onUpdated.addListener(listener);
        });
    }

    async navigateToNextPage(tabId, paginationConfig) {
        try {
            const result = await browser.tabs.sendMessage(tabId, {
                type: 'NAVIGATE_NEXT_PAGE',
                config: paginationConfig
            });
            return result && result.success;
        } catch (error) {
            return false;
        }
    }

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    getNestedValue(obj, path) {
        return path.split('.').reduce((current, key) => current?.[key], obj);
    }

    convertType(value, targetType) {
        switch (targetType) {
            case 'number':
                return Number(value);
            case 'string':
                return String(value);
            case 'boolean':
                return Boolean(value);
            case 'date':
                return new Date(value);
            default:
                return value;
        }
    }

    calculateValue(record, formula) {
        // Simple formula evaluation (extend as needed)
        try {
            return eval(formula.replace(/\{(\w+)\}/g, (match, field) => {
                return JSON.stringify(this.getNestedValue(record, field));
            }));
        } catch (error) {
            return null;
        }
    }

    async fetchEnrichmentData(record, source) {
        // Implement external data source fetching
        // This could include APIs, databases, etc.
        return {};
    }

    /**
     * Pipeline management
     */
    async enablePipeline(pipelineId) {
        const pipeline = this.pipelines.get(pipelineId);
        if (pipeline) {
            pipeline.enabled = true;
            await this.savePipelines();
        }
    }

    async disablePipeline(pipelineId) {
        const pipeline = this.pipelines.get(pipelineId);
        if (pipeline) {
            pipeline.enabled = false;
            await this.savePipelines();
        }
    }

    async deletePipeline(pipelineId) {
        this.pipelines.delete(pipelineId);
        await this.savePipelines();
    }

    getAllPipelines() {
        return Array.from(this.pipelines.values());
    }

    getPipeline(pipelineId) {
        return this.pipelines.get(pipelineId);
    }

    /**
     * Storage methods
     */
    async loadPipelines() {
        try {
            const result = await this.storage.get('data_collection_pipelines');
            if (result.data_collection_pipelines) {
                const pipelines = JSON.parse(result.data_collection_pipelines);
                pipelines.forEach(pipeline => this.pipelines.set(pipeline.id, pipeline));
            }
        } catch (error) {
            console.error('Failed to load pipelines:', error);
        }
    }

    async savePipelines() {
        try {
            const pipelines = Array.from(this.pipelines.values());
            await this.storage.set({ data_collection_pipelines: JSON.stringify(pipelines) });
        } catch (error) {
            console.error('Failed to save pipelines:', error);
        }
    }

    generatePipelineId() {
        return 'pipeline_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }
}

// Export for use in background script
if (typeof module !== 'undefined' && module.exports) {
    module.exports = DataCollectionPipeline;
}
