FROM node:20-alpine

# Install git
RUN apk add --no-cache git

WORKDIR /app

# Copy package files
COPY package.json package-lock.json* ./

# Install dependencies
RUN npm install

# Copy source files
COPY . .

# Create required directories
RUN mkdir -p repositories data templates

# Set environment variables
ENV PORT=3020
ENV NODE_ENV=production

# Expose port
EXPOSE 3020

# Start server
CMD ["node", "server.js"]
