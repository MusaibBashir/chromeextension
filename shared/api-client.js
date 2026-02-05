/**
 * Shared API Client for Job Scraper Chrome Extensions
 * Copy this file into each extension's directory
 */

const DEFAULT_API_URL = 'http://localhost:3001';

class JobScraperAPI {
    constructor() {
        this.apiUrl = DEFAULT_API_URL;
        this.apiKey = null;
    }

    /**
     * Initialize the API client with stored settings
     */
    async init() {
        const settings = await chrome.storage.sync.get(['apiUrl', 'apiKey']);
        this.apiUrl = settings.apiUrl || DEFAULT_API_URL;
        this.apiKey = settings.apiKey || null;
        return this;
    }

    /**
     * Save API settings
     */
    async saveSettings(apiUrl, apiKey) {
        await chrome.storage.sync.set({ apiUrl, apiKey });
        this.apiUrl = apiUrl;
        this.apiKey = apiKey;
    }

    /**
     * Get current settings
     */
    async getSettings() {
        return chrome.storage.sync.get(['apiUrl', 'apiKey']);
    }

    /**
     * POST a single job to the API
     */
    async postJob(jobData) {
        if (!this.apiKey) {
            throw new Error('API key not configured. Please set up the extension.');
        }

        const response = await fetch(`${this.apiUrl}/api/jobs`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-API-Key': this.apiKey
            },
            body: JSON.stringify(jobData)
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({ error: 'Unknown error' }));
            throw new Error(error.error || `HTTP ${response.status}`);
        }

        return response.json();
    }

    /**
     * POST multiple jobs in batch
     */
    async postJobsBatch(jobs) {
        if (!this.apiKey) {
            throw new Error('API key not configured. Please set up the extension.');
        }

        const response = await fetch(`${this.apiUrl}/api/jobs/batch`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-API-Key': this.apiKey
            },
            body: JSON.stringify({ jobs })
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({ error: 'Unknown error' }));
            throw new Error(error.error || `HTTP ${response.status}`);
        }

        return response.json();
    }

    /**
     * Check API health
     */
    async checkHealth() {
        try {
            const response = await fetch(`${this.apiUrl}/health`);
            return response.ok;
        } catch {
            return false;
        }
    }
}

// Export for use in extensions
if (typeof module !== 'undefined' && module.exports) {
    module.exports = JobScraperAPI;
}
