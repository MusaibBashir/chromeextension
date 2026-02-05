/**
 * Wellfound Jobs Scraper - Popup Script
 */
const $ = id => document.getElementById(id);
let scrapedJobs = [];

function showMessage(text, type = 'success') {
    $('messageBox').innerHTML = `<div class="message ${type}">${text}</div>`;
    setTimeout(() => $('messageBox').innerHTML = '', 4000);
}

function escapeHtml(text) { const div = document.createElement('div'); div.textContent = text || ''; return div.innerHTML; }

function updateJobList(jobs) {
    $('jobList').innerHTML = jobs.slice(0, 10).map(job => `
        <div class="job-item">
            <div class="job-title">${escapeHtml(job.title)}</div>
            <div class="job-meta">${escapeHtml(job.company)} • ${escapeHtml(job.location)}</div>
            ${job.salary || job.equity ? `<div class="job-extra">${[job.salary, job.equity].filter(Boolean).join(' • ')}</div>` : ''}
        </div>
    `).join('') + (jobs.length > 10 ? `<div class="job-item">...and ${jobs.length - 10} more</div>` : '');
}

async function checkApiHealth() {
    $('apiStatus').textContent = 'Checking...'; $('apiStatus').className = 'value pending';
    chrome.runtime.sendMessage({ action: 'CHECK_API' }, r => {
        $('apiStatus').textContent = r?.success ? 'Connected' : 'Disconnected';
        $('apiStatus').className = 'value ' + (r?.success ? 'success' : 'error');
    });
}

async function loadSettings() {
    const result = await chrome.storage.sync.get(['apiUrl', 'apiKey']);
    $('apiUrl').value = result.apiUrl || 'http://localhost:3001';
    $('apiKey').value = result.apiKey || '';
}

$('saveSettings').addEventListener('click', async () => {
    await chrome.storage.sync.set({ apiUrl: $('apiUrl').value.trim(), apiKey: $('apiKey').value.trim() });
    showMessage('Settings saved!'); checkApiHealth();
});

$('scrapeBtn').addEventListener('click', async () => {
    $('scrapeBtn').disabled = true; $('scrapeBtn').textContent = 'Scraping...';
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    chrome.tabs.sendMessage(tab.id, { action: 'SCRAPE_PAGE' }, response => {
        $('scrapeBtn').disabled = false; $('scrapeBtn').textContent = 'Scrape This Page';
        if (chrome.runtime.lastError) { showMessage('Navigate to Wellfound first', 'error'); return; }
        if (response?.success) {
            scrapedJobs = response.jobs; $('jobCount').textContent = response.count;
            $('sendBtn').disabled = response.count === 0; updateJobList(scrapedJobs);
            showMessage(response.count > 0 ? `Found ${response.count} jobs!` : 'No jobs found. Scroll down to load more.', response.count > 0 ? 'success' : 'error');
        }
    });
});

$('sendBtn').addEventListener('click', () => {
    if (scrapedJobs.length === 0) return;
    $('sendBtn').disabled = true; $('sendBtn').textContent = 'Sending...';
    chrome.runtime.sendMessage({ action: 'SEND_TO_API', jobs: scrapedJobs }, response => {
        $('sendBtn').textContent = 'Send to API';
        if (response?.success) {
            const r = response.result.data; showMessage(`Sent! Created: ${r.created}, Updated: ${r.updated}`);
            scrapedJobs = []; $('jobCount').textContent = '0'; $('sendBtn').disabled = true; $('jobList').innerHTML = '';
        } else { $('sendBtn').disabled = false; showMessage(response?.error || 'Failed to send', 'error'); }
    });
});

loadSettings(); checkApiHealth();
chrome.storage.local.get(['lastScrapedJobs'], result => {
    if (result.lastScrapedJobs?.length) { scrapedJobs = result.lastScrapedJobs; $('jobCount').textContent = scrapedJobs.length; $('sendBtn').disabled = false; updateJobList(scrapedJobs); }
});
