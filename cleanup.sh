#!/bin/bash

# Comprehensive Dependency Cleanup and Reinstall Script

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check for required tools
if ! command -v npm &> /dev/null; then
    echo -e "${RED}npm is not installed. Please install Node.js and npm.${NC}"
    exit 1
fi

# Function to handle errors
handle_error() {
    echo -e "${RED}Error: $1${NC}"
    exit 1
}

# Clean up existing dependencies
cleanup_dependencies() {
    echo -e "${GREEN}Cleaning up existing dependencies...${NC}"
    rm -rf node_modules
    rm -f package-lock.json
    npm cache clean --force
}

# Install dependencies
install_dependencies() {
    echo -e "${GREEN}Installing dependencies...${NC}"
    npm install || handle_error "Failed to install dependencies"
}

# Update npm
update_npm() {
    echo -e "${GREEN}Updating npm to the latest version...${NC}"
    npm install -g npm@latest
}

# Install global dependencies
install_global_deps() {
    echo -e "${GREEN}Installing global development dependencies...${NC}"
    npm install -g nodemon webpack webpack-cli
}

# Main execution
main() {
    update_npm
    cleanup_dependencies
    install_global_deps
    install_dependencies

    echo -e "${GREEN}Dependency installation and cleanup complete!${NC}"
}

# Run the main function
main
