// codebase/services/git-service.js
const fs = require('fs');
const path = require('path');
const simpleGit = require('simple-git');
const { v4: uuidv4 } = require('uuid');

// Constants
const REPO_DIR = path.join(__dirname, '..', 'repositories');
const TEMPLATES_DIR = path.join(__dirname, '..', 'templates');

// Default example files for new projects
const DEFAULT_TEMPLATE_FILES = {
    'example.js': `// example.js
import React, { useState } from 'react';

const MyComponent = () => {
    const [count, setCount] = useState(0);
    const [isVisible, setIsVisible] = useState(true);

    const handleIncrement = () => {
        setCount(prevCount => prevCount + 1);
    };

    const toggleVisibility = () => {
        setIsVisible(prev => !prev);
    };

    return (
        <div className="my-component">
            <h2>My Example Component</h2>

            {isVisible && (
                <div className="counter-section">
                    <p>Count: {count}</p>
                    <button onClick={handleIncrement}>
                        Increment
                    </button>
                </div>
            )}

            <button onClick={toggleVisibility}>
                {isVisible ? 'Hide' : 'Show'} Counter
            </button>
        </div>
    );
};

export default MyComponent;`,

    'App.js': `// App.js
import React from 'react';
import MyComponent from './example';

function App() {
  return (
    <div className="app">
      <h1>My React App</h1>
      <MyComponent />
    </div>
  );
}

export default App;`,

    'README.md': `# ReactStream Project

This is a project created with ReactStream.

## Getting Started

Edit the files in the editor and preview the changes in real-time.

## Files

- \`example.js\` - Main component example
- \`App.js\` - App component that uses the example
- \`README.md\` - This file

## Features

- Real-time preview
- Git-based version control
- Browser-based editing
`
};

// Ensure repository directory exists
const initializeRepositoryDir = () => {
    if (!fs.existsSync(REPO_DIR)) {
        fs.mkdirSync(REPO_DIR, { recursive: true });
        console.log(`Created repository directory at ${REPO_DIR}`);
    }

    // Create templates directory if it doesn't exist
    if (!fs.existsSync(TEMPLATES_DIR)) {
        fs.mkdirSync(TEMPLATES_DIR, { recursive: true });
        console.log(`Created templates directory at ${TEMPLATES_DIR}`);
    }
};

// Get full path to repository
const getRepoPath = (projectId) => {
    return path.join(REPO_DIR, projectId.toString());
};

// Create a new Git repository
const createRepository = async (projectId) => {
    const repoPath = getRepoPath(projectId);

    // Create directory if it doesn't exist
    if (!fs.existsSync(repoPath)) {
        fs.mkdirSync(repoPath, { recursive: true });
    }

    // Initialize git repository
    const git = simpleGit(repoPath);
    await git.init();

    // Set Git config
    await git.addConfig('user.name', 'ReactStream');
    await git.addConfig('user.email', 'reactstream@example.com');

    return repoPath;
};

// Initialize repository with template files
const initializeWithTemplate = async (repoPath, templateName = 'default') => {
    const git = simpleGit(repoPath);

    try {
        // Choose template based on name
        let templateFiles = DEFAULT_TEMPLATE_FILES;

        // Check if custom template exists
        const customTemplatePath = path.join(TEMPLATES_DIR, templateName);
        if (templateName !== 'default' && fs.existsSync(customTemplatePath)) {
            // Load custom template
            templateFiles = {};
            const files = fs.readdirSync(customTemplatePath);

            for (const file of files) {
                const filePath = path.join(customTemplatePath, file);
                if (fs.statSync(filePath).isFile()) {
                    templateFiles[file] = fs.readFileSync(filePath, 'utf8');
                }
            }
        }

        // Create files from template
        for (const [fileName, content] of Object.entries(templateFiles)) {
            const filePath = path.join(repoPath, fileName);
            fs.writeFileSync(filePath, content);
        }

        // Commit template files
        await git.add('.');
        await git.commit('Initial commit with template files');

        return true;
    } catch (error) {
        console.error('Error initializing repository with template:', error);
        throw error;
    }
};

// Clone a repository (for shared sessions)
const cloneRepository = async (sourceProjectId, targetProjectId) => {
    const sourceRepoPath = getRepoPath(sourceProjectId);
    const targetRepoPath = getRepoPath(targetProjectId);

    // Ensure source repository exists
    if (!fs.existsSync(sourceRepoPath)) {
        throw new Error('Source repository does not exist');
    }

    // Create target directory
    if (!fs.existsSync(targetRepoPath)) {
        fs.mkdirSync(targetRepoPath, { recursive: true });
    }

    // Copy files from source to target
    const files = fs.readdirSync(sourceRepoPath);

    for (const file of files) {
        const sourcePath = path.join(sourceRepoPath, file);
        const targetPath = path.join(targetRepoPath, file);

        // Skip .git directory
        if (file === '.git') continue;

        // Copy file or directory
        if (fs.statSync(sourcePath).isDirectory()) {
            fs.mkdirSync(targetPath, { recursive: true });
            // Recursive copy function would be needed for deep directories
        } else {
            fs.copyFileSync(sourcePath, targetPath);
        }
    }

    // Initialize new git repository
    await createRepository(targetProjectId);

    // Add and commit files
    const git = simpleGit(targetRepoPath);
    await git.add('.');
    await git.commit('Initial import from shared project');

    return targetRepoPath;
};

// Delete a repository
const deleteRepository = async (projectId) => {
    const repoPath = getRepoPath(projectId);

    if (fs.existsSync(repoPath)) {
        // Recursive function to delete directory and its contents
        const deleteFolderRecursive = (folderPath) => {
            if (fs.existsSync(folderPath)) {
                fs.readdirSync(folderPath).forEach((file) => {
                    const curPath = path.join(folderPath, file);
                    if (fs.lstatSync(curPath).isDirectory()) {
                        // Recursive call for directories
                        deleteFolderRecursive(curPath);
                    } else {
                        // Delete file
                        fs.unlinkSync(curPath);
                    }
                });
                // Delete empty folder
                fs.rmdirSync(folderPath);
            }
        };

        deleteFolderRecursive(repoPath);
        return true;
    }

    return false;
};

// Get file content
const getFileContent = async (projectId, filePath) => {
    const repoPath = getRepoPath(projectId);
    const fullPath = path.join(repoPath, filePath);

    // Check if file exists
    if (!fs.existsSync(fullPath)) {
        return null;
    }

    return fs.readFileSync(fullPath, 'utf8');
};

// Save file and commit changes
const saveFile = async (projectId, filePath, content, commitMessage) => {
    const repoPath = getRepoPath(projectId);
    const fullPath = path.join(repoPath, filePath);

    // Ensure parent directory exists
    const dirPath = path.dirname(fullPath);
    if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
    }

    // Write file
    fs.writeFileSync(fullPath, content);

    // Commit changes
    const git = simpleGit(repoPath);
    await git.add(filePath);
    await git.commit(commitMessage);

    return true;
};

// Delete file and commit changes
const deleteFile = async (projectId, filePath, commitMessage) => {
    const repoPath = getRepoPath(projectId);
    const fullPath = path.join(repoPath, filePath);

    // Check if file exists
    if (!fs.existsSync(fullPath)) {
        throw new Error('File does not exist');
    }

    // Remove file
    fs.unlinkSync(fullPath);

    // Commit changes
    const git = simpleGit(repoPath);
    await git.rm(filePath);
    await git.commit(commitMessage);

    return true;
};

// List files in repository
const listFiles = async (projectId) => {
    const repoPath = getRepoPath(projectId);

    // Check if repository exists
    if (!fs.existsSync(repoPath)) {
        throw new Error('Repository does not exist');
    }

    // Get list of files (excluding .git directory)
    const results = [];

    const readDirRecursive = (dir, rootDir = '') => {
        const files = fs.readdirSync(dir);

        for (const file of files) {
            const fullPath = path.join(dir, file);
            const relativePath = path.join(rootDir, file);

            // Skip .git directory
            if (file === '.git') continue;

            if (fs.statSync(fullPath).isDirectory()) {
                // Recursive call for directories
                readDirRecursive(fullPath, relativePath);
            } else {
                results.push({
                    path: relativePath,
                    type: 'file',
                    size: fs.statSync(fullPath).size,
                    updatedAt: fs.statSync(fullPath).mtime.toISOString()
                });
            }
        }
    };

    readDirRecursive(repoPath);

    return results;
};

// Get commit history for repository
const getCommitHistory = async (projectId) => {
    const repoPath = getRepoPath(projectId);
    const git = simpleGit(repoPath);

    // Get commit log
    const log = await git.log();

    return log.all.map(commit => ({
        hash: commit.hash,
        date: commit.date,
        message: commit.message,
        author: commit.author_name
    }));
};

// Get file history
const getFileHistory = async (projectId, filePath) => {
    const repoPath = getRepoPath(projectId);
    const git = simpleGit(repoPath);

    // Get file history
    const log = await git.log({ file: filePath });

    return log.all.map(commit => ({
        hash: commit.hash,
        date: commit.date,
        message: commit.message,
        author: commit.author_name
    }));
};

module.exports = {
    initializeRepositoryDir,
    createRepository,
    initializeWithTemplate,
    cloneRepository,
    deleteRepository,
    getFileContent,
    saveFile,
    deleteFile,
    listFiles,
    getCommitHistory,
    getFileHistory
};
