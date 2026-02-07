const express = require('express');
const router = express.Router();
const Job = require('../models/Job');
const SyncState = require('../models/SyncState');
const { validateJob, validateBatchJobs } = require('../middleware/validation');

/**
 * Forward job to n8n webhook
 */
const forwardToN8n = async (jobData) => {
    if (!process.env.N8N_WEBHOOK_URL) return null;

    try {
        const response = await fetch(process.env.N8N_WEBHOOK_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(jobData)
        });
        return response.ok;
    } catch (error) {
        console.error('n8n webhook error:', error.message);
        return false;
    }
};

/**
 * POST /api/jobs - Create a new job (single)
 */
router.post('/', validateJob, async (req, res) => {
    try {
        const jobData = {
            ...req.body,
            scraped_at: new Date()
        };

        // Upsert to handle duplicates gracefully
        const job = await Job.findOneAndUpdate(
            { job_url: jobData.job_url },
            jobData,
            { upsert: true, new: true, setDefaultsOnInsert: true }
        );

        // Forward to n8n
        const n8nResult = await forwardToN8n(job.toObject());

        res.status(201).json({
            success: true,
            data: job,
            n8n_forwarded: n8nResult
        });
    } catch (error) {
        console.error('Error creating job:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to save job',
            message: error.message
        });
    }
});

/**
 * POST /api/jobs/batch - Create multiple jobs
 */
router.post('/batch', validateBatchJobs, async (req, res) => {
    try {
        const { jobs } = req.body;
        const results = {
            created: 0,
            updated: 0,
            failed: 0,
            errors: []
        };

        for (const jobData of jobs) {
            try {
                const existingJob = await Job.findOne({ job_url: jobData.job_url });

                await Job.findOneAndUpdate(
                    { job_url: jobData.job_url },
                    { ...jobData, scraped_at: new Date() },
                    { upsert: true, new: true, setDefaultsOnInsert: true }
                );

                if (existingJob) {
                    results.updated++;
                } else {
                    results.created++;
                    // Only forward new jobs to n8n
                    await forwardToN8n(jobData);
                }
            } catch (error) {
                results.failed++;
                results.errors.push({
                    job_url: jobData.job_url,
                    error: error.message
                });
            }
        }

        res.status(201).json({
            success: true,
            data: results
        });
    } catch (error) {
        console.error('Error batch creating jobs:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to save jobs',
            message: error.message
        });
    }
});

/**
 * GET /api/jobs - Get all jobs with filtering
 */
router.get('/', async (req, res) => {
    try {
        const {
            source,
            company,
            search,
            limit = 50,
            offset = 0,
            sort = '-scraped_at'
        } = req.query;

        const query = {};

        if (source) query.source = source.toLowerCase();
        if (company) query.company = new RegExp(company, 'i');
        if (search) {
            query.$text = { $search: search };
        }

        const jobs = await Job.find(query)
            .sort(sort)
            .skip(parseInt(offset))
            .limit(parseInt(limit));

        const total = await Job.countDocuments(query);

        res.json({
            success: true,
            data: jobs,
            pagination: {
                total,
                limit: parseInt(limit),
                offset: parseInt(offset)
            }
        });
    } catch (error) {
        console.error('Error fetching jobs:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch jobs',
            message: error.message
        });
    }
});

/**
 * GET /api/jobs/stats - Get job statistics
 */
router.get('/stats', async (req, res) => {
    try {
        const stats = await Job.aggregate([
            {
                $group: {
                    _id: '$source',
                    count: { $sum: 1 },
                    latestScrape: { $max: '$scraped_at' }
                }
            }
        ]);

        const total = await Job.countDocuments();

        res.json({
            success: true,
            data: {
                total,
                bySource: stats.reduce((acc, item) => {
                    acc[item._id] = {
                        count: item.count,
                        latestScrape: item.latestScrape
                    };
                    return acc;
                }, {})
            }
        });
    } catch (error) {
        console.error('Error fetching stats:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch stats',
            message: error.message
        });
    }
});

/**
 * DELETE /api/jobs/:id - Delete a job
 */
router.delete('/:id', async (req, res) => {
    try {
        const job = await Job.findByIdAndDelete(req.params.id);

        if (!job) {
            return res.status(404).json({
                success: false,
                error: 'Job not found'
            });
        }

        res.json({
            success: true,
            message: 'Job deleted successfully'
        });
    } catch (error) {
        console.error('Error deleting job:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to delete job',
            message: error.message
        });
    }
});

/**
 * POST /api/jobs/sync-to-n8n - Sync jobs to n8n since last sync
 * Automatically tracks the last sync timestamp
 */
router.post('/sync-to-n8n', async (req, res) => {
    try {
        const { source, forceSince } = req.body;

        // Get or create sync state
        let syncState = await SyncState.findOne({ key: 'n8n_sync' });
        if (!syncState) {
            syncState = await SyncState.create({ key: 'n8n_sync' });
        }

        // Determine the "since" date
        let sinceDate = syncState.lastSyncAt;
        if (forceSince) {
            sinceDate = new Date(forceSince);
        }

        // Build query
        const query = {};
        if (sinceDate) {
            query.scraped_at = { $gt: sinceDate };
        }
        if (source) {
            query.source = source.toLowerCase();
        }

        // Get jobs to sync
        const jobs = await Job.find(query).sort({ scraped_at: 1 });

        if (jobs.length === 0) {
            return res.json({
                success: true,
                message: 'No new jobs to sync',
                data: {
                    synced: 0,
                    lastSyncAt: syncState.lastSyncAt,
                    nextSyncFrom: sinceDate
                }
            });
        }

        // Forward each job to n8n
        let successCount = 0;
        let failCount = 0;

        for (const job of jobs) {
            const result = await forwardToN8n(job.toObject());
            if (result) {
                successCount++;
            } else {
                failCount++;
            }
        }

        // Update sync state
        const now = new Date();
        syncState.lastSyncAt = now;
        syncState.lastSyncCount = successCount;
        syncState.totalSynced += successCount;
        await syncState.save();

        res.json({
            success: true,
            message: `Synced ${successCount} jobs to n8n`,
            data: {
                synced: successCount,
                failed: failCount,
                total: jobs.length,
                lastSyncAt: now,
                totalSyncedAllTime: syncState.totalSynced
            }
        });
    } catch (error) {
        console.error('Error syncing to n8n:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to sync jobs',
            message: error.message
        });
    }
});

/**
 * GET /api/jobs/sync-status - Get sync status
 */
router.get('/sync-status', async (req, res) => {
    try {
        let syncState = await SyncState.findOne({ key: 'n8n_sync' });

        if (!syncState) {
            return res.json({
                success: true,
                data: {
                    lastSyncAt: null,
                    lastSyncCount: 0,
                    totalSynced: 0,
                    pendingJobs: await Job.countDocuments()
                }
            });
        }

        // Count pending jobs (since last sync)
        const pendingQuery = syncState.lastSyncAt
            ? { scraped_at: { $gt: syncState.lastSyncAt } }
            : {};
        const pendingJobs = await Job.countDocuments(pendingQuery);

        res.json({
            success: true,
            data: {
                lastSyncAt: syncState.lastSyncAt,
                lastSyncCount: syncState.lastSyncCount,
                totalSynced: syncState.totalSynced,
                pendingJobs
            }
        });
    } catch (error) {
        console.error('Error getting sync status:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get sync status',
            message: error.message
        });
    }
});

module.exports = router;
