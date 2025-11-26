#!/bin/bash

###############################################################################
# S3 Manager - Startup script
# Easily start the Node.js S3 media management application
###############################################################################

# Colors
BLUE='\033[0;34m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Get script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Check if .env exists
if [ ! -f "$SCRIPT_DIR/.env" ]; then
    echo -e "${RED}✗ Error: .env file not found${NC}"
    exit 1
fi

# Parse arguments
PORT=${1:-3003}
if [[ ! $PORT =~ ^[0-9]+$ ]]; then
    echo -e "${RED}✗ Error: Invalid port number${NC}"
    exit 1
fi

# Check if node_modules exists
if [ ! -d "$SCRIPT_DIR/node_modules" ]; then
    echo -e "${YELLOW}Installing dependencies...${NC}"
    cd "$SCRIPT_DIR"
    npm install 2>&1 | grep -E "(added|up to date|npm ERR)" || true
fi

# Check if port is already in use
if lsof -i :$PORT &>/dev/null; then
    echo -e "${RED}✗ Error: Port $PORT is already in use${NC}"
    echo -e "${YELLOW}Try a different port: $0 8080${NC}"
    exit 1
fi

# Start the application
echo -e "${GREEN}"
echo "╔════════════════════════════════════════╗"
echo "║   S3 Manager - Starting...             ║"
echo "╚════════════════════════════════════════╝"
echo -e "${NC}"

cd "$SCRIPT_DIR"
S3_MANAGER_PORT=$PORT node s3-manager.js
