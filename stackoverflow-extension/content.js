/**
 * Stack Overflow Jobs Scraper - Content Script
 * Uses [data-jobkey] selector for reliable job detection
 */

(function () {
    'use strict';

    function scrapeJobs() {
        const jobs = [];

        // Use data-jobkey attribute - stable selector!
        const jobCards = document.querySelectorAll('[data-jobkey]');

        jobCards.forEach(card => {
            try {
                // Title is in h2
                const title = card.querySelector('h2')?.textContent?.trim() || '';

                // Company and location are in p tags
                const pTags = card.querySelectorAll('p');
                const company = pTags[0]?.textContent?.trim() || '';
                const location = pTags[1]?.textContent?.trim() || '';

                // Salary/job type from badges
                const badges = Array.from(card.querySelectorAll('.chakra-badge, [class*="badge"]'))
                    .map(b => b.textContent.trim());
                const salary = badges.find(b => b.includes('$')) || null;
                const jobType = badges.find(b => b.includes('time') || b.includes('Time')) || null;

                // Job key for URL
                const jobKey = card.getAttribute('data-jobkey');
                const jobUrl = `https://www.indeed.com/viewjob?jk=${jobKey}`;

                // Extract skills from visible text
                const skills = extractSkills(card.textContent);

                if (title && company) {
                    jobs.push({
                        company,
                        title,
                        location,
                        source: 'stackoverflow',
                        skills,
                        job_url: jobUrl,
                        salary,
                        job_type: jobType,
                        remote: location.toLowerCase().includes('remote')
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
            'kubernetes', 'sql', 'postgresql', 'mongodb', 'git', 'linux', 'devops'
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

    console.log('Stack Overflow Jobs Scraper loaded');
})();
