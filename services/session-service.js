// codebase/services/session-service.js
const crypto = require('crypto');

// In-memory storage for session data and share tokens
let sessionStore = {};
let shareTokens = {};

// Get session store
const getSessionStore = () => {
    return sessionStore;
};

// Save session data
const saveSessionData = (sessionId, data) => {
    sessionStore[sessionId] = {
        ...sessionStore[sessionId],
        ...data,
        updatedAt: new Date().toISOString()
    };

    return sessionStore[sessionId];
};

// Get session data
const getSessionData = (sessionId) => {
    return sessionStore[sessionId] || null;
};

// Delete session data
const deleteSessionData = (sessionId) => {
    if (sessionStore[sessionId]) {
        delete sessionStore[sessionId];
        return true;
    }

    return false;
};

// Create a share token for a session
const createShareToken = (sessionId) => {
    // Generate a random token
    const token = crypto.randomBytes(32).toString('hex');

    // Store the token with session ID and expiration time (7 days)
    shareTokens[token] = {
        sessionId,
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
    };

    return token;
};

// Get session from share token
const getSessionFromShareToken = (token) => {
    const tokenData = shareTokens[token];

    if (!tokenData) {
        return null;
    }

    // Check if token has expired
    if (new Date(tokenData.expiresAt) < new Date()) {
        delete shareTokens[token];
        return null;
    }

    return tokenData;
};

// Delete share token
const deleteShareToken = (token) => {
    if (shareTokens[token]) {
        delete shareTokens[token];
        return true;
    }

    return false;
};

module.exports = {
    getSessionStore,
    saveSessionData,
    getSessionData,
    deleteSessionData,
    createShareToken,
    getSessionFromShareToken,
    deleteShareToken
};
