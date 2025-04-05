// codebase/api/routes/file.js
const express = require('express');
const router = express.Router();
const path = require('path');

// Import services
const gitService = require('../../services/git-service');
const storageService = require('../../services/storage-service');

// Get file content
router.get('/:projectId/:filePath(*)', async (req, res) => {
    try {
        const { projectId, filePath } = req.params;
        const sessionId = req.session.sessionId;

        // Verify project belongs to session
        const project = await storageService.getProject(projectId);

        if (!project) {
            return res.status(404).json({ error: 'Project not found' });
        }

        if (project.sessionId !== sessionId) {
            return res.status(403).json({ error: 'Access denied' });
        }

        // Get file content
        const fileContent = await gitService.getFileContent(projectId, filePath);

        if (fileContent === null) {
            return res.status(404).json({ error: 'File not found' });
        }

        // Determine content type based on file extension
        const ext = path.extname(filePath).toLowerCase();
        let contentType = 'text/plain';

        if (ext === '.js' || ext === '.jsx') contentType = 'application/javascript';
        else if (ext === '.json') contentType = 'application/json';
        else if (ext === '.html') contentType = 'text/html';
        else if (ext === '.css') contentType = 'text/css';

        res.setHeader('Content-Type', contentType);
        res.send(fileContent);
    } catch (error) {
        console.error('Error fetching file:', error);
        res.status(500).json({ error: 'Failed to fetch file content' });
    }
});

// Create or update file
router.put('/:projectId/:filePath(*)', async (req, res) => {
    try {
        const { projectId, filePath } = req.params;
        const { content, commitMessage = `Update ${filePath}` } = req.body;
        const sessionId = req.session.sessionId;

        if (content === undefined) {
            return res.status(400).json({ error: 'File content is required' });
        }

        // Verify project belongs to session
        const project = await storageService.getProject(projectId);

        if (!project) {
            return res.status(404).json({ error: 'Project not found' });
        }

        if (project.sessionId !== sessionId) {
            return res.status(403).json({ error: 'Access denied' });
        }

        // Save file and commit changes
        await gitService.saveFile(projectId, filePath, content, commitMessage);

        // Update project's updatedAt timestamp
        project.updatedAt = new Date().toISOString();
        await storageService.updateProject(project);

        res.json({
            success: true,
            message: 'File saved successfully',
            file: {
                path: filePath,
                updatedAt: new Date().toISOString()
            }
        });
    } catch (error) {
        console.error('Error saving file:', error);
        res.status(500).json({ error: 'Failed to save file' });
    }
});

// Delete file
router.delete('/:projectId/:filePath(*)', async (req, res) => {
    try {
        const { projectId, filePath } = req.params;
        const { commitMessage = `Delete ${filePath}` } = req.body;
        const sessionId = req.session.sessionId;

        // Verify project belongs to session
        const project = await storageService.getProject(projectId);

        if (!project) {
            return res.status(404).json({ error: 'Project not found' });
        }

        if (project.sessionId !== sessionId) {
            return res.status(403).json({ error: 'Access denied' });
        }

        // Delete file and commit changes
        await gitService.deleteFile(projectId, filePath, commitMessage);

        // Update project's updatedAt timestamp
        project.updatedAt = new Date().toISOString();
        await storageService.updateProject(project);

        res.json({
            success: true,
            message: 'File deleted successfully'
        });
    } catch (error) {
        console.error('Error deleting file:', error);
        res.status(500).json({ error: 'Failed to delete file' });
    }
});

// Get file history
router.get('/:projectId/:filePath(*)/history', async (req, res) => {
    try {
        const { projectId, filePath } = req.params;
        const sessionId = req.session.sessionId;

        // Verify project belongs to session
        const project = await storageService.getProject(projectId);

        if (!project) {
            return res.status(404).json({ error: 'Project not found' });
        }

        if (project.sessionId !== sessionId) {
            return res.status(403).json({ error: 'Access denied' });
        }

        // Get file history
        const history = await gitService.getFileHistory(projectId, filePath);

        res.json({ history });
    } catch (error) {
        console.error('Error fetching file history:', error);
        res.status(500).json({ error: 'Failed to fetch file history' });
    }
});

module.exports = router;
