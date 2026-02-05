/**
 * Y Combinator Jobs Scraper - Background Service Worker
 */

const DEFAULT_API_URL = 'https://jobs-api.acrosstek.in';
const DEFAULT_API_KEY = 'tmdAKfxWYVVIoJg950cX2dNJSasj/mOmoB1D0CSIpFI=';

async function getSettings() {
    const result = await chrome.storage.sync.get(['apiUrl', 'apiKey']);
    return {
        apiUrl: result.apiUrl || DEFAULT_API_URL,
        apiKey: result.apiKey || DEFAULT_API_KEY
    };
}

async function postJobs(jobs) {
    const { apiUrl, apiKey } = await getSettings();
    if (!apiKey) throw new Error('API key not configured');

    const response = await fetch(`${apiUrl}/api/jobs/batch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-API-Key': apiKey },
        body: JSON.stringify({ jobs })
    });

    if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error || `HTTP ${response.status}`);
    }
    return response.json();
}

function updateBadge(count, color = '#FF6600') {
    chrome.action.setBadgeText({ text: count > 0 ? String(count) : '' });
    chrome.action.setBadgeBackgroundColor({ color });
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'JOBS_SCRAPED') {
        updateBadge(message.jobs.length);
        chrome.storage.local.set({ lastScrapedJobs: message.jobs, lastScrapedUrl: message.url, lastScrapedTime: Date.now() });
        sendResponse({ success: true });
        return true;
    }

    if (message.action === 'SEND_TO_API') {
        postJobs(message.jobs)
            .then(result => { updateBadge(0); sendResponse({ success: true, result }); })
            .catch(error => { updateBadge('!', '#f44336'); sendResponse({ success: false, error: error.message }); });
        return true;
    }

    if (message.action === 'CHECK_API') {
        getSettings().then(async ({ apiUrl }) => {
            try {
                const response = await fetch(`${apiUrl}/health`);
                const data = await response.json();
                sendResponse({ success: response.ok, data });
            } catch (error) { sendResponse({ success: false, error: error.message }); }
        });
        return true;
    }
});

console.log('YC Jobs background service started');
