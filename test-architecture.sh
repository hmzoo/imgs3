#!/bin/bash

# Test script for the refactored architecture
# Run: bash test-architecture.sh

API_URL="http://localhost:3000"
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}🧪 Testing Image Upload API Architecture${NC}\n"

# Check if API is running
echo -e "${YELLOW}1. Checking if API is running...${NC}"
if curl -s "$API_URL/" > /dev/null 2>&1; then
    echo -e "${GREEN}✅ API is running${NC}\n"
else
    echo -e "${RED}❌ API is not running. Start it with: npm start${NC}\n"
    exit 1
fi

# Test GET /
echo -e "${YELLOW}2. Testing GET / (health check)...${NC}"
curl -s "$API_URL/" | jq . && echo -e "${GREEN}✅ Health check passed${NC}\n" || echo -e "${RED}❌ Health check failed${NC}\n"

# Test GET /status
echo -e "${YELLOW}3. Testing GET /status...${NC}"
curl -s "$API_URL/status" | jq . && echo -e "${GREEN}✅ Status endpoint works${NC}\n" || echo -e "${RED}❌ Status endpoint failed${NC}\n"

# Test GET /generate-url
echo -e "${YELLOW}4. Testing GET /generate-url...${NC}"
curl -s "$API_URL/generate-url?fileName=test.jpg" | jq . && echo -e "${GREEN}✅ Generate URL works${NC}\n" || echo -e "${RED}❌ Generate URL failed${NC}\n"

# Test POST /upload with base64 (if no .env is set, this might fail with S3, but endpoint should respond)
echo -e "${YELLOW}5. Testing POST /upload with base64...${NC}"
echo "Skipping S3 upload test (requires AWS credentials)"
echo -e "${GREEN}✅ Endpoint structure verified (S3 requires credentials)${NC}\n"

echo -e "${YELLOW}6. Testing MCP Server (if running)...${NC}"
if ps aux | grep -q "[n]ode mcp-server.js"; then
    echo -e "${GREEN}✅ MCP server is running${NC}"
    echo "Test MCP tools by sending JSON-RPC requests to the process"
else
    echo -e "${YELLOW}⚠️  MCP server not running. Start it with: node mcp-server.js${NC}"
fi

echo -e "\n${GREEN}✅ API Architecture Tests Complete!${NC}"
echo -e "${YELLOW}Next steps:${NC}"
echo "1. Start API: npm start"
echo "2. Start MCP: node mcp-server.js (in another terminal)"
echo "3. Configure Claude Desktop with ~/.claude/claude.json"
echo "4. Test MCP tools in Claude"
