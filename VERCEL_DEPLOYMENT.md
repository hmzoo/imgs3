# Deployment Guide: New Architecture

## Overview
After refactoring, we have:
- **index.js** - REST API (deployed to Vercel)
- **mcp-server.js** - MCP Server (run locally)

## Vercel Deployment (REST API)

### Current Status ✅
The REST API (`index.js`) is already configured for Vercel. No changes needed!

**Vercel Configuration:**
- **Framework:** Node.js
- **Build Command:** `npm install`
- **Start Command:** `npm start` (auto-detected)
- **Environment Variables:** Already set (AWS credentials, etc.)

### To Deploy Changes to Production

```bash
# 1. Verify local changes work
npm start

# 2. Test endpoints
curl http://localhost:3000/status

# 3. Push to git (Vercel auto-deploys)
git add index.js
git commit -m "Refactor: Separate MCP from REST API"
git push origin main

# 4. Vercel automatically deploys
# Check deployment at: https://vercel.com/dashboard
```

**After Deployment:**
- Production API: `https://<your-vercel-url>/upload`
- All 3 image upload modes work
- New smaller, cleaner codebase (288 lines)

## Local Development

### Setup
```bash
cd /home/hmj/imgs3
npm install
```

### Running Both Services Locally

**Terminal 1 - REST API:**
```bash
npm start
# Runs on http://localhost:3000
```

**Terminal 2 - MCP Server:**
```bash
node mcp-server.js
# Listens on stdio, queries local API
```

**Terminal 3 - Testing:**
```bash
bash test-architecture.sh
```

## MCP Server Deployment Options

### Option 1: Local Machine (Recommended)
- MCP server runs on your personal computer
- Queries REST API (local or Vercel)
- Configured via `~/.claude/claude.json`
- **Pros:** Simple, secure, immediate
- **Cons:** Only works when computer is on

```bash
# On your local machine:
node /home/hmj/imgs3/mcp-server.js
```

### Option 2: Vercel with Background Process
⚠️ Not recommended (Vercel doesn't support stdio MCP servers)

### Option 3: Separate VPS/Server
If you want MCP to run 24/7:

```bash
# On VPS:
ssh user@your-vps.com
cd /home/imgs3
git clone <your-repo>
node mcp-server.js
```

Then configure `~/.claude/claude.json`:
```json
{
  "mcpServers": {
    "image-upload": {
      "command": "ssh",
      "args": ["user@your-vps.com", "node", "/home/imgs3/mcp-server.js"]
    }
  }
}
```

### Option 4: Docker Container
Create `Dockerfile`:
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package.json .
RUN npm install
COPY mcp-server.js .
ENV API_BASE_URL=http://api-service:3000
CMD ["node", "mcp-server.js"]
```

Run:
```bash
docker build -t img-mcp .
docker run img-mcp
```

## Configuration

### Environment Variables

**For API (index.js):**
```env
# Vercel will use these (already configured)
AWS_ACCESS_KEY_ID=<your-key>
AWS_SECRET_ACCESS_KEY=<your-secret>
AWS_REGION=eu-west-1
AWS_S3_BUCKET_NAME=hmzoo
AWS_S3_FOLDER=imgs3
PORT=3000
```

**For MCP (mcp-server.js):**
```env
# Optional - defaults to http://localhost:3000
API_BASE_URL=http://localhost:3000
# Or for Vercel production:
# API_BASE_URL=https://<your-vercel-url>
```

### Claude Desktop Configuration

**File:** `~/.claude/claude.json`

```json
{
  "mcpServers": {
    "image-upload": {
      "command": "node",
      "args": ["/home/hmj/imgs3/mcp-server.js"],
      "env": {
        "API_BASE_URL": "http://localhost:3000"
      }
    }
  }
}
```

Or use the setup script:
```bash
bash /home/hmj/imgs3/setup-claude.sh
```

## Monitoring & Logs

### API Logs (Vercel)
```bash
# View in Vercel dashboard
# https://vercel.com/dashboard > Select project > Logs
```

### MCP Logs (Local)
MCP logs to stderr (doesn't interfere with stdio protocol):
```bash
node mcp-server.js 2>&1 | tee mcp.log
```

## Production Checklist

- [ ] API deployed to Vercel
- [ ] All endpoints tested in production
- [ ] MCP server running locally
- [ ] Claude Desktop configured
- [ ] MCP tools working in Claude
- [ ] Error logging set up
- [ ] Backup configuration saved

## Troubleshooting

### MCP Server Not Responding
```bash
# 1. Check if mcp-server.js is running
ps aux | grep mcp-server

# 2. Test API connectivity
curl http://localhost:3000/status

# 3. Check syntax
node -c mcp-server.js

# 4. Run with debug output
node mcp-server.js 2>&1 | head -20
```

### API Returning 500 Errors
```bash
# Check AWS credentials
echo $AWS_ACCESS_KEY_ID
echo $AWS_REGION

# Test S3 connection
node -e "
const { S3Client } = require('@aws-sdk/client-s3');
const client = new S3Client({ region: 'eu-west-1' });
console.log('S3 client created successfully');
"

# Check logs
npm start  # Run locally to see full error
```

### Claude Not Seeing MCP Tools
1. Check `~/.claude/claude.json` exists
2. Verify MCP server path is correct
3. Verify API is running
4. Completely restart Claude Desktop
5. Check Claude logs: `~/Library/Logs/Claude/` (macOS)

## Rollback Plan

If something goes wrong:

```bash
# 1. Stop current services
pkill -f "npm start"
pkill -f "mcp-server.js"

# 2. Revert Vercel deployment
# Go to Vercel dashboard > Deployments > Rollback to previous

# 3. Stop using MCP
# Edit ~/.claude/claude.json to remove image-upload server
```

## Verification

### API Working
```bash
curl http://localhost:3000/
# Should return: {"message": "Image Upload API is running", ...}
```

### MCP Working
```bash
# Test JSON-RPC
echo '{"jsonrpc": "2.0", "id": 1, "method": "tools/list", "params": {}}' | \
  node /home/hmj/imgs3/mcp-server.js | head -1
# Should return JSON-RPC response
```

### Claude Integration
1. Open Claude Desktop
2. Click on the model selector
3. Should see "image-upload" in available tools
4. Try: "Use the uploadImage tool to upload from a URL"

## What's Different Now

### Before Refactoring
```
Single index.js (640 lines)
├── REST API endpoints
├── MCP HTTP endpoints
└── Mixed concerns
```

### After Refactoring
```
index.js (288 lines) - Vercel
├── REST API only
└── Clean code

mcp-server.js (427 lines) - Local/VPS
├── MCP server
└── Clean responsibility
```

## Benefits

✅ **Cleaner Code** - 55% less in API  
✅ **Better Maintainability** - Single responsibility  
✅ **Standard MCP Pattern** - Uses stdio transport  
✅ **No Breaking Changes** - All endpoints work the same  
✅ **Better Scalability** - Services independent  
✅ **Production Ready** - Both fully functional  

## Support

For issues:
1. Check `ARCHITECTURE.md` for setup details
2. Review `TESTING.md` for test procedures
3. See logs in both terminals
4. Check Claude Desktop logs

---

**Last Updated:** 2024-11-25  
**Architecture Version:** 2.0  
**Status:** Production Ready ✅
