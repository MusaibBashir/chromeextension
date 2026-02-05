require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const { authenticateApiKey } = require('./middleware/auth');
const jobsRouter = require('./routes/jobs');

const app = express();
const PORT = process.env.PORT || 3001;

// Security middleware
app.use(helmet());

// CORS configuration - allow Chrome extensions
app.use(cors({
    origin: (origin, callback) => {
        // Allow requests with no origin (like Chrome extensions)
        if (!origin) return callback(null, true);

        // Allow Chrome extension origins
        if (origin.startsWith('chrome-extension://')) {
            return callback(null, true);
        }

        // Allow localhost for development
        if (origin.includes('localhost') || origin.includes('127.0.0.1')) {
            return callback(null, true);
        }

        callback(new Error('Not allowed by CORS'));
    },
    credentials: true
}));

// Rate limiting
const limiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 100, // 100 requests per minute
    message: {
        success: false,
        error: 'Too many requests, please try again later'
    }
});
app.use(limiter);

// Body parsing
app.use(express.json({ limit: '10mb' }));

// Health check endpoint (no auth required)
app.get('/health', (req, res) => {
    res.json({
        success: true,
        status: 'healthy',
        timestamp: new Date().toISOString(),
        mongodb: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
    });
});

// API routes (auth required)
app.use('/api/jobs', authenticateApiKey, jobsRouter);

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Unhandled error:', err);
    res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        success: false,
        error: 'Endpoint not found'
    });
});

// MongoDB connection
const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });
        console.log('✅ MongoDB connected successfully');
    } catch (error) {
        console.error('❌ MongoDB connection error:', error.message);
        process.exit(1);
    }
};

// Start server
const startServer = async () => {
    await connectDB();

    app.listen(PORT, () => {
        console.log(`🚀 Job Scraper API running on port ${PORT}`);
        console.log(`📊 Health check: http://localhost:${PORT}/health`);
        console.log(`📝 Jobs API: http://localhost:${PORT}/api/jobs`);
        if (process.env.N8N_WEBHOOK_URL) {
            console.log(`🔗 n8n webhook: ${process.env.N8N_WEBHOOK_URL}`);
        }
    });
};

startServer();
