const Joi = require('joi');

/**
 * Validation schema for job data
 */
const jobValidationSchema = Joi.object({
    company: Joi.string().required().max(200).trim(),
    title: Joi.string().required().max(300).trim(),
    location: Joi.string().max(200).trim().default('Not specified'),
    source: Joi.string().required().valid('stackoverflow', 'ycombinator', 'wellfound', 'monster'),
    skills: Joi.array().items(Joi.string().max(100).trim()).default([]),
    job_url: Joi.string().uri().required(),
    salary: Joi.string().max(100).allow(null, ''),
    equity: Joi.string().max(100).allow(null, ''),
    job_type: Joi.string().max(50).allow(null, ''),
    remote: Joi.boolean().allow(null),
    raw_data: Joi.object().allow(null)
});

/**
 * Validate job data middleware
 */
const validateJob = (req, res, next) => {
    const { error, value } = jobValidationSchema.validate(req.body, {
        abortEarly: false,
        stripUnknown: true
    });

    if (error) {
        const errorMessages = error.details.map(detail => detail.message);
        return res.status(400).json({
            success: false,
            error: 'Validation failed',
            details: errorMessages
        });
    }

    req.body = value;
    next();
};

/**
 * Validation schema for batch job submission
 */
const batchJobValidationSchema = Joi.object({
    jobs: Joi.array().items(jobValidationSchema).min(1).max(100).required()
});

const validateBatchJobs = (req, res, next) => {
    const { error, value } = batchJobValidationSchema.validate(req.body, {
        abortEarly: false,
        stripUnknown: true
    });

    if (error) {
        const errorMessages = error.details.map(detail => detail.message);
        return res.status(400).json({
            success: false,
            error: 'Validation failed',
            details: errorMessages
        });
    }

    req.body = value;
    next();
};

module.exports = { validateJob, validateBatchJobs };
