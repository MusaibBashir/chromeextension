/**
 * LinkedIn Jobs Scraper - Content Script
 */

(function () {
    'use strict';

    function scrapeJobs() {
        const jobs = [];

        // LinkedIn job cards - multiple selector strategies
        const jobCards = document.querySelectorAll(
            '.job-card-container, ' +
            '.jobs-search-results__list-item, ' +
            '[data-job-id], ' +
            '.scaffold-layout__list-item, ' +
            '.jobs-search-results-list__list-item'
        );

        console.log(`Found ${jobCards.length} job cards`);

        jobCards.forEach(card => {
            try {
                // Job title
                const titleEl = card.querySelector(
                    '.job-card-list__title, ' +
                    '.job-card-container__link, ' +
                    'a[data-control-name="job_card_title"], ' +
                    '.artdeco-entity-lockup__title, ' +
                    'strong'
                );
                const title = titleEl?.textContent?.trim() || '';

                // Company name
                const companyEl = card.querySelector(
                    '.job-card-container__company-name, ' +
                    '.artdeco-entity-lockup__subtitle, ' +
                    '.job-card-container__primary-description, ' +
                    'a[data-tracking-control-name="public_jobs_jserp-result_job-search-card-subtitle"]'
                );
                const company = companyEl?.textContent?.trim() || '';

                // Location
                const locationEl = card.querySelector(
                    '.job-card-container__metadata-item, ' +
                    '.artdeco-entity-lockup__caption, ' +
                    '.job-card-container__metadata-wrapper span'
                );
                let location = locationEl?.textContent?.trim() || 'Not specified';

                // Job URL
                const linkEl = card.querySelector('a[href*="/jobs/view/"], a[href*="/jobs/collections/"]');
                let jobUrl = linkEl?.href || '';

                // Also check data-job-id attribute
                const jobId = card.getAttribute('data-job-id') || card.querySelector('[data-job-id]')?.getAttribute('data-job-id');
                if (!jobUrl && jobId) {
                    jobUrl = `https://www.linkedin.com/jobs/view/${jobId}`;
                }

                // Remote check
                const isRemote = card.textContent.toLowerCase().includes('remote');
                if (isRemote && !location.toLowerCase().includes('remote')) {
                    location = `Remote / ${location}`;
                }

                // Extract job type if available
                const metadataItems = card.querySelectorAll('.job-card-container__metadata-item, li');
                let jobType = '';
                metadataItems.forEach(item => {
                    const text = item.textContent.trim().toLowerCase();
                    if (text.includes('full-time') || text.includes('part-time') || text.includes('contract') || text.includes('internship')) {
                        jobType = item.textContent.trim();
                    }
                });

                // Skills extraction
                const skills = extractSkills(card.textContent);

                if (title && (company || jobUrl)) {
                    jobs.push({
                        company,
                        title,
                        location,
                        source: 'linkedin',
                        skills,
                        job_url: jobUrl,
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
            'javascript', 'typescript', 'python', 'java', 'c#', 'c++', 'go', 'rust', 'ruby',
            'react', 'angular', 'vue', 'node.js', 'nodejs', 'aws', 'azure', 'docker',
            'kubernetes', 'sql', 'postgresql', 'mongodb', 'git', 'linux', 'devops',
            'machine learning', 'ai', 'data science', 'agile', 'scrum'
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

    console.log('LinkedIn Jobs Scraper loaded');
})();
