#!/bin/bash

# Fail on any error
set -e

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if running as root
if [[ $EUID -ne 0 ]]; then
   echo -e "${YELLOW}This script must be run as root. Use sudo.${NC}"
   exit 1
fi

# Application Configuration
APP_NAME="reactstream"
APP_DIR="/opt/reactstream"
DOMAIN="www.reactstream.com"
USER="reactstream"

# Deployment Function
deploy_application() {
    echo -e "${GREEN}Starting ReactStream Production Deployment${NC}"

    # Prepare system
    prepare_system

    # Create application user if not exists
    if ! id "$USER" &>/dev/null; then
        useradd -m -s /bin/bash "$USER"
    fi

    # Clone or update repository
    if [ ! -d "$APP_DIR" ]; then
        git clone https://github.com/reactstream/server.git "$APP_DIR"
    else
        cd "$APP_DIR"
        git pull origin main
    fi

    # Set correct permissions
    chown -R "$USER:$USER" "$APP_DIR"

    # Install dependencies
    cd "$APP_DIR"
    sudo -u "$USER" npm ci
    sudo -u "$USER" npm run build

    # Setup environment file
    create_env_file

    # Setup systemd service
    create_systemd_service

    # Setup Nginx configuration
    configure_nginx

    # Setup SSL with Certbot
    setup_ssl

    # Restart services
    systemctl restart "$APP_NAME"
    systemctl restart nginx

    echo -e "${GREEN}Deployment Complete!${NC}"
}

# System Preparation
prepare_system() {
    echo -e "${GREEN}Preparing System${NC}"

    # Update system
    apt-get update
    apt-get upgrade -y

    # Install core dependencies
    apt-get install -y \
        git \
        nodejs \
        npm \
        nginx \
        certbot \
        python3-certbot-nginx

    # Install global npm packages
    npm install -g pm2
}

# Create Environment File
create_env_file() {
    cat > "$APP_DIR/.env" << EOL
SERVER_PORT=8080
DEV_SERVER_PORT=3010
NODE_ENV=production
ENABLE_DEBUG=false
AUTO_FIX=false
VERBOSE_OUTPUT=false
CORS_ORIGIN=https://$DOMAIN
SESSION_SECRET=$(openssl rand -hex 32)
TEMP_DIR=$APP_DIR/temp
LOGS_DIR=$APP_DIR/logs
EOL
    chown "$USER:$USER" "$APP_DIR/.env"
    chmod 600 "$APP_DIR/.env"
}

# Create Systemd Service
create_systemd_service() {
    cat > "/etc/systemd/system/$APP_NAME.service" << EOL
[Unit]
Description=ReactStream Web Application
After=network.target

[Service]
Type=simple
User=$USER
WorkingDirectory=$APP_DIR
ExecStart=/usr/bin/npm start
Restart=on-failure
RestartSec=10

[Install]
WantedBy=multi-user.target
EOL

    systemctl daemon-reload
    systemctl enable "$APP_NAME"
}

# Configure Nginx
configure_nginx() {
    cat > "/etc/nginx/sites-available/$DOMAIN" << EOL
server {
    listen 80;
    server_name $DOMAIN www.$DOMAIN;
    return 301 https://$DOMAIN\$request_uri;
}

server {
    listen 443 ssl;
    server_name $DOMAIN www.$DOMAIN;

    ssl_certificate /etc/letsencrypt/live/$DOMAIN/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/$DOMAIN/privkey.pem;

    location / {
        proxy_pass http://localhost:8080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
    }
}
EOL

    # Enable site
    ln -sf "/etc/nginx/sites-available/$DOMAIN" "/etc/nginx/sites-enabled/$DOMAIN"
}

# SSL Setup with Certbot
setup_ssl() {
    certbot --nginx -d "$DOMAIN" -d "www.$DOMAIN" --non-interactive --agree-tos -m "admin@$DOMAIN"
}

# Monitoring Setup
setup_monitoring() {
    npm install -g pm2
    pm2 start "$APP_DIR/server.js"
    pm2 startup systemd
    pm2 save
}

# Main Execution
main() {
    deploy_application
    setup_monitoring
}

main
