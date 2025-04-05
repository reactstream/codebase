// codebase/api/index.js
const express = require('express');
const router = express.Router();

// Import route modules
const projectRoutes = require('./routes/project');
const sessionRoutes = require('./routes/session');
const fileRoutes = require('./routes/file');

// Use route modules
router.use('/projects', projectRoutes);
router.use('/sessions', sessionRoutes);
router.use('/files', fileRoutes);

// API root endpoint
router.get('/', (req, res) => {
    res.json({
        message: 'Welcome to the ReactStream Codebase API',
        endpoints: {
            projects: '/api/projects',
            sessions: '/api/sessions',
            files: '/api/files'
        },
        version: '1.0.0'
    });
});

module.exports = router;
