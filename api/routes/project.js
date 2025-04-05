// codebase/api/routes/project.js
const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const { nanoid } = require('nanoid');

// Import services
const gitService = require('../../services/git-service');
const storageService = require('../../services/storage-service');

// Get all projects for current session
router.get('/', async (req, res) => {
    try {
        const sessionId = req.session.sessionId;

        if (!sessionId) {
            return res.status(401).json({ error: 'No session found' });
        }

        const projects = await storageService.getProjectsForSession(sessionId);
        res.json({ projects });
    } catch (error) {
        console.error('Error fetching projects:', error);
        res.status(500).json({ error: 'Failed to fetch projects' });
    }
});

// Create a new project
router.post('/', async (req, res) => {
    try {
        const { name, description = '', template = 'default' } = req.body;
        const sessionId = req.session.sessionId;

        if (!name) {
            return res.status(400).json({ error: 'Project name is required' });
        }

        if (!sessionId) {
            return res.status(401).json({ error: 'No session found' });
        }

        // Generate a unique project ID
        const projectId = nanoid(10);

        // Create the project in git
        const repoPath = await gitService.createRepository(projectId);

        // Initialize with template
        await gitService.initializeWithTemplate(repoPath, template);

        // Store project metadata
        const project = {
            id: projectId,
            name,
            description,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            sessionId
        };

        await storageService.saveProject(project);

        // Add project to session
        if (!req.session.projects) {
            req.session.projects = [];
        }
        req.session.projects.push(projectId);

        res.status(201).json({ project });
    } catch (error) {
        console.error('Error creating project:', error);
        res.status(500).json({ error: 'Failed to create project' });
    }
});

// Get a specific project
router.get('/:projectId', async (req, res) => {
    try {
        const { projectId } = req.params;
        const sessionId = req.session.sessionId;

        // Verify project belongs to session
        const project = await storageService.getProject(projectId);

        if (!project) {
            return res.status(404).json({ error: 'Project not found' });
        }

        if (project.sessionId !== sessionId) {
            return res.status(403).json({ error: 'Access denied' });
        }

        res.json({ project });
    } catch (error) {
        console.error('Error fetching project:', error);
        res.status(500).json({ error: 'Failed to fetch project' });
    }
});

// Delete a project
router.delete('/:projectId', async (req, res) => {
    try {
        const { projectId } = req.params;
        const sessionId = req.session.sessionId;

        // Verify project belongs to session
        const project = await storageService.getProject(projectId);

        if (!project) {
            return res.status(404).json({ error: 'Project not found' });
        }

        if (project.sessionId !== sessionId) {
            return res.status(403).json({ error: 'Access denied' });
        }

        // Remove project from git
        await gitService.deleteRepository(projectId);

        // Remove project from storage
        await storageService.deleteProject(projectId);

        // Remove project from session
        req.session.projects = req.session.projects.filter(p => p !== projectId);

        res.json({ message: 'Project deleted successfully' });
    } catch (error) {
        console.error('Error deleting project:', error);
        res.status(500).json({ error: 'Failed to delete project' });
    }
});

// Get commit history for a project
router.get('/:projectId/history', async (req, res) => {
    try {
        const { projectId } = req.params;
        const sessionId = req.session.sessionId;

        // Verify project belongs to session
        const project = await storageService.getProject(projectId);

        if (!project) {
            return res.status(404).json({ error: 'Project not found' });
        }

        if (project.sessionId !== sessionId) {
            return res.status(403).json({ error: 'Access denied' });
        }

        // Get commit history
        const history = await gitService.getCommitHistory(projectId);

        res.json({ history });
    } catch (error) {
        console.error('Error fetching commit history:', error);
        res.status(500).json({ error: 'Failed to fetch commit history' });
    }
});

// Get list of files in a project
router.get('/:projectId/files', async (req, res) => {
    try {
        const { projectId } = req.params;
        const sessionId = req.session.sessionId;

        // Verify project belongs to session
        const project = await storageService.getProject(projectId);

        if (!project) {
            return res.status(404).json({ error: 'Project not found' });
        }

        if (project.sessionId !== sessionId) {
            return res.status(403).json({ error: 'Access denied' });
        }

        // Get file list
        const files = await gitService.listFiles(projectId);

        res.json({ files });
    } catch (error) {
        console.error('Error listing files:', error);
        res.status(500).json({ error: 'Failed to list files' });
    }
});

module.exports = router;
