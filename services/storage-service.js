// codebase/services/storage-service.js
const fs = require('fs');
const path = require('path');

// In-memory storage for projects (in production, use a database)
let projectsStore = {};

// File-based storage path
const STORAGE_DIR = path.join(__dirname, '..', 'data');
const PROJECTS_FILE = path.join(STORAGE_DIR, 'projects.json');

// Initialize storage
const initializeStorage = () => {
    if (!fs.existsSync(STORAGE_DIR)) {
        fs.mkdirSync(STORAGE_DIR, { recursive: true });
    }

    // Load existing projects if file exists
    if (fs.existsSync(PROJECTS_FILE)) {
        try {
            const data = fs.readFileSync(PROJECTS_FILE, 'utf8');
            projectsStore = JSON.parse(data);
        } catch (error) {
            console.error('Error loading projects file:', error);
            projectsStore = {};
        }
    }
};

// Save projects to file
const saveProjectsToFile = () => {
    try {
        fs.writeFileSync(PROJECTS_FILE, JSON.stringify(projectsStore, null, 2));
    } catch (error) {
        console.error('Error saving projects to file:', error);
    }
};

// Save a project
const saveProject = async (project) => {
    if (!project.id) {
        throw new Error('Project ID is required');
    }

    projectsStore[project.id] = project;
    saveProjectsToFile();

    return project;
};

// Get a project by ID
const getProject = async (projectId) => {
    return projectsStore[projectId] || null;
};

// Update a project
const updateProject = async (project) => {
    if (!project.id || !projectsStore[project.id]) {
        throw new Error('Project not found');
    }

    projectsStore[project.id] = {
        ...projectsStore[project.id],
        ...project,
        updatedAt: new Date().toISOString()
    };

    saveProjectsToFile();

    return projectsStore[project.id];
};

// Delete a project
const deleteProject = async (projectId) => {
    if (projectsStore[projectId]) {
        delete projectsStore[projectId];
        saveProjectsToFile();
        return true;
    }

    return false;
};

// Get all projects for a session
const getProjectsForSession = async (sessionId) => {
    return Object.values(projectsStore).filter(project => project.sessionId === sessionId);
};

// Initialize storage on module load
initializeStorage();

module.exports = {
    saveProject,
    getProject,
    updateProject,
    deleteProject,
    getProjectsForSession
};
