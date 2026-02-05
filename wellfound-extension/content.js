/**
 * Wellfound Jobs Scraper - Content Script
 */

(function () {
    'use strict';

    function scrapeJobs() {
        const jobs = [];

        // Job cards are divs with rounded border and bg-white
        const jobCards = document.querySelectorAll('div.mb-6.rounded.border, div[class*="mb-6"][class*="rounded"][class*="border"]');

        console.log(`Found ${jobCards.length} job cards`);

        jobCards.forEach(card => {
            try {
                // Company name in h2 with font-semibold
                const companyEl = card.querySelector('h2.font-semibold, h2.text-md');
                const company = companyEl?.textContent?.trim() || '';

                // Job title in a[href*="/jobs/"] with text-brand-burgandy
                const titleEl = card.querySelector('a[href*="/jobs/"].font-semibold, a.text-brand-burgandy');
                const title = titleEl?.textContent?.trim() || '';

                // Job URL
                let jobUrl = titleEl?.href || '';
                if (jobUrl && !jobUrl.startsWith('http')) {
                    jobUrl = 'https://wellfound.com' + jobUrl;
                }

                // Job type badge (Full-time, Part-time, etc.) in yellow badge
                const jobTypeBadge = card.querySelector('span[class*="bg-accent-yellow"], span.rounded-lg');
                const jobType = jobTypeBadge?.textContent?.trim() || '';

                // Salary - look for text containing $ within the job details section
                let salary = null;
                const salaryEl = card.querySelector('span:has(svg) + span, div.items-center span');
                const allSpans = card.querySelectorAll('span');
                allSpans.forEach(span => {
                    const text = span.textContent.trim();
                    if (text.includes('$') && text.includes('k')) {
                        salary = text;
                    }
                });

                // Location - look for text after location icon
                let location = 'Not specified';
                allSpans.forEach(span => {
                    const text = span.textContent.trim();
                    // Location patterns: "In office • City" or "Remote"
                    if (text.includes('In office') || text.includes('Remote') ||
                        (text.includes('•') && !text.includes('$'))) {
                        location = text;
                    }
                });

                // Check for remote
                const isRemote = card.textContent.toLowerCase().includes('remote');

                // Extract skills
                const skills = extractSkills(card.textContent);

                if (title && jobUrl) {
                    jobs.push({
                        company,
                        title,
                        location,
                        source: 'wellfound',
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

    function extractSkills(text) {
        const commonSkills = [
            'javascript', 'typescript', 'python', 'java', 'react', 'angular', 'vue',
            'node.js', 'nodejs', 'aws', 'azure', 'docker', 'kubernetes', 'sql',
            'postgresql', 'mongodb', 'git', 'linux', 'devops', 'go', 'rust', 'ruby',
            'full stack', '3d', 'ar', 'vr', 'unity'
        ];
        const lowerText = text.toLowerCase();
        return commonSkills.filter(skill => lowerText.includes(skill));
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
            const jobs = scrapeJobs();
            sendResponse({ ready: true, jobCount: jobs.length, url: window.location.href });
            return true;
        }
    });

    console.log('Wellfound Jobs Scraper loaded');
})();
