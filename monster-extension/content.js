/**
 * Monster Jobs Scraper - Content Script
 * Uses data-testid selectors
 */

(function () {
    'use strict';

    function scrapeJobs() {
        const jobs = [];

        // Monster job cards - try multiple selectors
        const jobCards = document.querySelectorAll(
            '[data-testid="svx_jobCard"], article, .job-search-card, [class*="JobCard"]'
        );

        jobCards.forEach(card => {
            try {
                // Title
                const titleEl = card.querySelector('h2 a, [data-testid="jobTitle"], .job-title');
                const title = titleEl?.textContent?.trim() || '';

                // Company
                const companyEl = card.querySelector('[data-testid="company"], .company-name, [class*="company"]');
                const company = companyEl?.textContent?.trim() || '';

                // Location
                const locationEl = card.querySelector('[data-testid="jobDetailLocation"], .location, [class*="location"]');
                const location = locationEl?.textContent?.trim() || 'Not specified';

                // Job URL
                const linkEl = card.querySelector('a[href*="/job"], h2 a');
                const jobUrl = linkEl?.href || '';

                // Salary
                const salaryEl = card.querySelector('[data-testid="salary"], [class*="salary"]');
                const salary = salaryEl?.textContent?.trim() || null;

                // Check for remote
                const isRemote = card.textContent.toLowerCase().includes('remote');

                // Extract skills
                const skills = extractSkills(card.textContent);

                if (title && jobUrl && company) {
                    jobs.push({
                        company,
                        title,
                        location: isRemote && !location.toLowerCase().includes('remote')
                            ? `Remote / ${location}` : location,
                        source: 'monster',
                        skills,
                        job_url: jobUrl,
                        salary,
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
            'javascript', 'typescript', 'python', 'java', 'c#', 'c++', 'go', 'rust', 'ruby',
            'react', 'angular', 'vue', 'node.js', 'nodejs', 'aws', 'azure', 'docker',
            'kubernetes', 'sql', 'postgresql', 'mongodb', 'git', 'linux', 'devops',
            'excel', 'salesforce', 'sap', 'oracle', 'communication', 'leadership'
        ];
        const lowerText = text.toLowerCase();
        return commonSkills.filter(skill => lowerText.includes(skill));
    }

    // Listen for messages from popup
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        if (message.action === 'SCRAPE_PAGE') {
            const jobs = scrapeJobs();
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

    console.log('Monster Jobs Scraper loaded');
})();
