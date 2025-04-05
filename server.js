// codebase/server.js
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const session = require('express-session');
const MemoryStore = require('memorystore')(session);
const morgan = require('morgan');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config();

// Import API routes
const apiRoutes = require('./api');

// Import services
const { initializeRepositoryDir } = require('./services/git-service');
const { getSessionStore } = require('./services/session-service');

// Constants
const PORT = process.env.PORT || 3020;
const NODE_ENV = process.env.NODE_ENV || 'development';
const SESSION_SECRET = process.env.SESSION_SECRET || 'reactstream_secret_key';

// Ensure repositories directory exists
const REPO_DIR = path.join(__dirname, 'repositories');
if (!fs.existsSync(REPO_DIR)) {
    fs.mkdirSync(REPO_DIR, { recursive: true });
}

// Initialize Express app
const app = express();

// Configure middleware
app.use(morgan('dev'));
app.use(cors({
    origin: ['http://localhost:80', 'http://localhost:3010', 'http://editor', 'http://preview'],
    credentials: true
}));
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '50mb' }));

// Session configuration
app.use(session({
    genid: () => uuidv4(),
    store: new MemoryStore({
        checkPeriod: 86400000 // Prune expired entries every 24h
    }),
    secret: SESSION_SECRET,
    resave: false,
    saveUninitialized: true,
    cookie: {
        secure: NODE_ENV === 'production',
        maxAge: 7 * 24 * 60 * 60 * 1000 // 1 week
    }
}));

// Initialize session store
getSessionStore();

// Session middleware to create default project if none exists
app.use(async (req, res, next) => {
    // Ensure session has a sessionId
    if (!req.session.sessionId) {
        req.session.sessionId = uuidv4();
        req.session.projects = [];
    }

    next();
});

// API routes
app.use('/api', apiRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
    res.status(200).json({
        status: 'ok',
        service: 'codebase',
        timestamp: new Date().toISOString()
    });
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Error:', err);
    res.status(err.status || 500).json({
        error: {
            message: err.message || 'Internal Server Error',
            status: err.status || 500
        }
    });
});

// Initialize repository directory
initializeRepositoryDir();

// Start server
app.listen(PORT, () => {
    console.log(`Codebase service running on port ${PORT}`);
    console.log(`Environment: ${NODE_ENV}`);
});

// Handle process termination
process.on('SIGINT', () => {
    console.log('Shutting down codebase service...');
    process.exit(0);
});

process.on('SIGTERM', () => {
    console.log('Shutting down codebase service...');
    process.exit(0);
});
