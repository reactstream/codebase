// codebase/api/routes/session.js
const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');

// Import services
const sessionService = require('../../services/session-service');
const storageService = require('../../services/storage-service');

// Get current session info
router.get('/current', (req, res) => {
    try {
        if (!req.session.sessionId) {
            // Create a new session if one doesn't exist
            req.session.sessionId = uuidv4();
            req.session.projects = [];
            req.session.createdAt = new Date().toISOString();
        }

        res.json({
            session: {
                id: req.session.sessionId,
                createdAt: req.session.createdAt || new Date().toISOString(),
                projectCount: req.session.projects ? req.session.projects.length : 0
            }
        });
    } catch (error) {
        console.error('Error retrieving session info:', error);
        res.status(500).json({ error: 'Failed to get session information' });
    }
});

// Create a new session (force new session creation)
router.post('/', (req, res) => {
    try {
        // Generate a new session ID
        const sessionId = uuidv4();

        // Update session
        req.session.regenerate((err) => {
            if (err) {
                return res.status(500).json({ error: 'Failed to create new session' });
            }

            req.session.sessionId = sessionId;
            req.session.projects = [];
            req.session.createdAt = new Date().toISOString();

            res.status(201).json({
                message: 'New session created',
                session: {
                    id: sessionId,
                    createdAt: req.session.createdAt
                }
            });
        });
    } catch (error) {
        console.error('Error creating new session:', error);
        res.status(500).json({ error: 'Failed to create new session' });
    }
});

// Export session data (for backup/migration)
router.get('/export', async (req, res) => {
    try {
        const sessionId = req.session.sessionId;

        if (!sessionId) {
            return res.status(401).json({ error: 'No session found' });
        }

        // Get all projects for this session
        const projects = await storageService.getProjectsForSession(sessionId);

        // Export project data
        const exportData = {
            sessionId,
            createdAt: req.session.createdAt || new Date().toISOString(),
            exportedAt: new Date().toISOString(),
            projects: projects
        };

        // Set filename for download
        const filename = `reactstream-session-${sessionId.substring(0, 8)}.json`;
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.setHeader('Content-Type', 'application/json');

        res.json(exportData);
    } catch (error) {
        console.error('Error exporting session:', error);
        res.status(500).json({ error: 'Failed to export session data' });
    }
});

// Import session data
router.post('/import', async (req, res) => {
    try {
        const { sessionData } = req.body;

        if (!sessionData || !sessionData.projects) {
            return res.status(400).json({ error: 'Invalid session data' });
        }

        // Import projects
        const importedProjects = [];

        for (const project of sessionData.projects) {
            // Create project with the same ID but assign to current session
            const newProject = {
                ...project,
                id: project.id, // Maintain same ID to preserve references
                sessionId: req.session.sessionId,
                importedAt: new Date().toISOString()
            };

            await storageService.saveProject(newProject);
            importedProjects.push(newProject);

            // Add to session's projects array
            if (!req.session.projects.includes(project.id)) {
                req.session.projects.push(project.id);
            }
        }

        res.json({
            message: 'Session data imported successfully',
            importedProjects: importedProjects.length
        });
    } catch (error) {
        console.error('Error importing session:', error);
        res.status(500).json({ error: 'Failed to import session data' });
    }
});

// Delete session and all associated projects
router.delete('/current', async (req, res) => {
    try {
        const sessionId = req.session.sessionId;

        if (!sessionId) {
            return res.status(401).json({ error: 'No session found' });
        }

        // Get all projects for this session
        const projects = await storageService.getProjectsForSession(sessionId);

        // Delete all projects
        for (const project of projects) {
            await storageService.deleteProject(project.id);
        }

        // Destroy session
        req.session.destroy((err) => {
            if (err) {
                return res.status(500).json({ error: 'Failed to delete session' });
            }

            res.json({
                message: 'Session and all associated projects deleted successfully',
                deletedProjects: projects.length
            });
        });
    } catch (error) {
        console.error('Error deleting session:', error);
        res.status(500).json({ error: 'Failed to delete session' });
    }
});

// Generate a shareable link for a session
router.post('/share', async (req, res) => {
    try {
        const sessionId = req.session.sessionId;

        if (!sessionId) {
            return res.status(401).json({ error: 'No session found' });
        }

        // Generate a share token
        const shareToken = await sessionService.createShareToken(sessionId);

        // Construct shareable URL
        const shareUrl = `${req.protocol}://${req.get('host')}/shared/${shareToken}`;

        res.json({
            shareToken,
            shareUrl,
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days
        });
    } catch (error) {
        console.error('Error creating share link:', error);
        res.status(500).json({ error: 'Failed to create shareable link' });
    }
});

// Access a shared session
router.get('/shared/:token', async (req, res) => {
    try {
        const { token } = req.params;

        // Validate token and get associated session
        const sessionData = await sessionService.getSessionFromShareToken(token);

        if (!sessionData) {
            return res.status(404).json({ error: 'Shared session not found or expired' });
        }

        // Create a copy of all projects in the shared session for the current user
        const sourceSessionId = sessionData.sessionId;
        const targetSessionId = req.session.sessionId;

        // Get all projects from the source session
        const sourceProjects = await storageService.getProjectsForSession(sourceSessionId);

        // Copy projects to target session
        const copiedProjects = [];

        for (const sourceProject of sourceProjects) {
            // Clone project with new ID but same content
            const newProjectId = uuidv4();

            // Clone the Git repository
            await gitService.cloneRepository(sourceProject.id, newProjectId);

            // Create new project in storage
            const newProject = {
                id: newProjectId,
                name: `${sourceProject.name} (Copy)`,
                description: sourceProject.description,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                sessionId: targetSessionId,
                clonedFrom: sourceProject.id
            };

            await storageService.saveProject(newProject);
            copiedProjects.push(newProject);

            // Add to session's projects array
            if (!req.session.projects) req.session.projects = [];
            req.session.projects.push(newProjectId);
        }

        res.json({
            message: 'Shared session projects copied successfully',
            importedProjects: copiedProjects
        });
    } catch (error) {
        console.error('Error accessing shared session:', error);
        res.status(500).json({ error: 'Failed to access shared session' });
    }
});

module.exports = router;
