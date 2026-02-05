/**
 * Y Combinator Jobs Scraper - Content Script
 * Targets: ycombinator.com/jobs, workatastartup.com, news.ycombinator.com/jobs
 */

(function () {
    'use strict';

    function detectSite() {
        const host = window.location.hostname;
        const path = window.location.pathname;
        if (host.includes('workatastartup')) return 'workatastartup';
        if (host === 'www.ycombinator.com' || host === 'ycombinator.com') return 'ycombinator_jobs';
        if (host.includes('news.ycombinator')) return 'hackernews';
        return null;
    }

    // For ycombinator.com/jobs page
    function scrapeYCombinatorJobs() {
        const jobs = [];

        // Job cards are <li> with bg-beige-lighter class
        const jobCards = document.querySelectorAll('li.bg-beige-lighter, li[class*="bg-beige"]');

        console.log(`Found ${jobCards.length} job cards on YC Jobs`);

        jobCards.forEach(card => {
            try {
                // Company name in span.font-bold
                const companyEl = card.querySelector('span.font-bold');
                let company = companyEl?.textContent?.trim() || '';
                // Remove batch info like (S24)
                company = company.replace(/\s*\([A-Z]\d+\)\s*$/, '').trim();

                // Job title in a[href*="/jobs/"] with font-semibold
                const titleEl = card.querySelector('a[href*="/jobs/"].font-semibold, a.text-linkColor');
                const title = titleEl?.textContent?.trim() || '';

                // Job URL
                let jobUrl = titleEl?.href || '';
                if (jobUrl && !jobUrl.startsWith('http')) {
                    jobUrl = 'https://www.ycombinator.com' + jobUrl;
                }

                // Get all the detail divs (Full-time, Design, Salary, Location)
                const detailDivs = card.querySelectorAll('.flex.flex-wrap > div.whitespace-nowrap, .flex.items-center > div');
                let location = 'Not specified';
                let salary = null;
                let jobType = '';

                detailDivs.forEach(div => {
                    const text = div.textContent.trim();
                    // Salary contains $
                    if (text.includes('$')) {
                        salary = text;
                    }
                    // Location contains state/country (comma or 2-letter abbreviation)
                    else if (text.includes(',') || /\b[A-Z]{2}\b/.test(text) || text.toLowerCase().includes('remote')) {
                        location = text;
                    }
                    // Job type
                    else if (text.toLowerCase().includes('time') || text === 'Full-time' || text === 'Part-time' || text === 'Contract') {
                        jobType = text;
                    }
                });

                const isRemote = card.textContent.toLowerCase().includes('remote');
                const skills = extractSkills(card.textContent);

                if (title && jobUrl) {
                    jobs.push({
                        company,
                        title,
                        location,
                        source: 'ycombinator',
                        skills,
                        job_url: jobUrl,
                        salary,
                        job_type: jobType,
                        remote: isRemote
                    });
                }
            } catch (error) {
                console.error('Error parsing job card:', error);
            }
        });

        return jobs;
    }

    // For workatastartup.com
    function scrapeWorkAtAStartup() {
        const jobs = [];

        const jobCards = document.querySelectorAll('div.bg-beige-lighter, div[class*="bg-beige"]');

        console.log(`Found ${jobCards.length} job cards on WAAS`);

        jobCards.forEach(card => {
            try {
                const companyEl = card.querySelector('.company-details span.font-bold, .company-details a span');
                let company = companyEl?.textContent?.trim() || '';
                company = company.replace(/\s*\([A-Z]\d+\)\s*$/, '').trim();

                const titleEl = card.querySelector('a[data-jobid].font-bold, .job-name a');
                const title = titleEl?.textContent?.trim() || '';
                const jobUrl = titleEl?.href || '';

                const detailSpans = card.querySelectorAll('.job-details span, p.job-details span');
                let location = 'Not specified';

                detailSpans.forEach(span => {
                    const text = span.textContent.trim();
                    if (text.includes(',') || /\b[A-Z]{2}\b/.test(text)) {
                        location = text;
                    }
                });

                const isRemote = card.textContent.toLowerCase().includes('remote');
                if (isRemote && !location.toLowerCase().includes('remote')) {
                    location = `Remote / ${location}`;
                }

                if (title && jobUrl) {
                    jobs.push({ company, title, location, source: 'ycombinator', skills: extractSkills(card.textContent), job_url: jobUrl, remote: isRemote });
                }
            } catch (e) { console.error(e); }
        });

        return jobs;
    }

    // For news.ycombinator.com/jobs
    function scrapeHackerNews() {
        const jobs = [];
        const rows = document.querySelectorAll('.athing, tr.athing');

        rows.forEach(row => {
            try {
                const titleCell = row.querySelector('.titleline a, .title a, td.title a');
                if (!titleCell) return;

                const text = titleCell.textContent.trim();
                const jobUrl = titleCell.href;

                let company = '', title = '', location = 'Not specified';

                const hiringMatch = text.match(/^(.+?)\s*(?:\(YC\s*[A-Z]?\d+\))?\s*(?:is\s+hiring|hiring)[:\s\-–]+(.+)$/i);
                if (hiringMatch) {
                    company = hiringMatch[1].replace(/\(YC\s*[A-Z]?\d+\)/i, '').trim();
                    title = hiringMatch[2].trim();
                } else {
                    title = text;
                    company = 'YC Startup';
                }

                if (title && jobUrl) {
                    jobs.push({ company, title, location, source: 'ycombinator', skills: extractSkills(text), job_url: jobUrl });
                }
            } catch (e) { console.error(e); }
        });

        return jobs;
    }

    function scrapeJobs() {
        const site = detectSite();
        console.log('Detected site:', site);

        switch (site) {
            case 'ycombinator_jobs': return scrapeYCombinatorJobs();
            case 'workatastartup': return scrapeWorkAtAStartup();
            case 'hackernews': return scrapeHackerNews();
            default: return [];
        }
    }

    function extractSkills(text) {
        const skills = ['javascript', 'typescript', 'python', 'java', 'react', 'node.js', 'aws', 'docker', 'go', 'rust', 'ruby', 'rails', 'kubernetes', 'ml', 'ai', 'full stack', 'backend', 'frontend', 'design'];
        const lowerText = text.toLowerCase();
        return skills.filter(s => lowerText.includes(s));
    }

    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        if (message.action === 'SCRAPE_PAGE') {
            const jobs = scrapeJobs();
            console.log('Scraped jobs:', jobs);
            chrome.runtime.sendMessage({ action: 'JOBS_SCRAPED', jobs, url: window.location.href });
            sendResponse({ success: true, count: jobs.length, jobs });
            return true;
        }
        if (message.action === 'GET_STATUS') {
            sendResponse({ ready: true, jobCount: scrapeJobs().length, site: detectSite(), url: window.location.href });
            return true;
        }
    });

    console.log('YC Jobs Scraper loaded on', detectSite());
})();
