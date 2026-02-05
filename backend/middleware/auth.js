/**
 * API Key Authentication Middleware
 */
const authenticateApiKey = (req, res, next) => {
    const apiKey = req.headers['x-api-key'];

    if (!apiKey) {
        return res.status(401).json({
            success: false,
            error: 'API key is required. Include X-API-Key header.'
        });
    }

    if (apiKey !== process.env.API_KEY) {
        return res.status(403).json({
            success: false,
            error: 'Invalid API key'
        });
    }

    next();
};

module.exports = { authenticateApiKey };
