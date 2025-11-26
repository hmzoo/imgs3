# IMGS3 - Project Structure

Complete inventory of IMGS3 files and their purposes.

## 🎯 Quick Navigation

### Start Here
- **[README.md](README.md)** (3.7K) - Project overview and quick start
- **[TOOLKIT_GUIDE.md](TOOLKIT_GUIDE.md)** (7.0K) - Complete feature comparison and workflows

### Documentation
- **[IMGS3_REF_API.md](IMGS3_REF_API.md)** (18K) - Comprehensive REST API reference with examples
- **[S3_MANAGER_README.md](S3_MANAGER_README.md)** (4.8K) - Web app (Node.js) guide
- **[S3_MEDIA_MANAGER.md](S3_MEDIA_MANAGER.md)** (4.7K) - CLI tool (bash) guide
- **[ARCHITECTURE.md](ARCHITECTURE.md)** (7.1K) - System design and components
- **[API_AUTHENTICATION.md](API_AUTHENTICATION.md)** (4.5K) - Auth setup guide
- **[TESTING.md](TESTING.md)** (7.9K) - Testing procedures
- **[DEPLOYMENT.md](DEPLOYMENT.md)** (2.8K) - Deployment options
- **[VERCEL_DEPLOYMENT.md](VERCEL_DEPLOYMENT.md)** (6.4K) - Deploy to Vercel

---

## 🚀 Tools & Applications

### 1. REST API Server
**[index.js](index.js)** (13K)
- Express.js server for media uploads
- 3 upload modes: multipart, base64, URL
- Authentication with Bearer tokens
- Runs on port 3000
- **Start**: `node index.js`
- **API**: `http://localhost:3000`

### 2. CLI Media Manager
**[s3-media-manager.sh](s3-media-manager.sh)** (23K)
- Bash utility for S3 bucket management
- Commands: list, delete-one, delete-all, gallery, serve
- Generates responsive HTML gallery
- Serves gallery on port 3003
- **Start**: `./s3-media-manager.sh help`
- **Make executable**: `chmod +x s3-media-manager.sh`

**[start-s3-manager.sh](start-s3-manager.sh)** (1.6K)
- Convenient startup script for CLI manager
- Checks dependencies and handles port conflicts
- **Start**: `./start-s3-manager.sh`

### 3. Web Application
**[s3-manager.js](s3-manager.js)** (6.6K)
- Modern Node.js web interface for S3 management
- Visual grid with search/filter
- Single/batch/complete deletion
- Real-time statistics
- Responsive design (mobile-friendly)
- Runs on port 3003
- **Start**: `node s3-manager.js`
- **Access**: `http://localhost:3003`

**[s3-manager-ui/](s3-manager-ui/)** - Web UI files
- `index.html` - Main HTML page
- `style.css` - Modern CSS with responsive grid
- `app.js` - Client-side JavaScript (vanilla, zero dependencies)

---

## 🤖 Model Context Protocol

**[mcp-server.js](mcp-server.js)** (11K)
- Standalone MCP server for Claude Desktop integration
- 3 tools: uploadMedia, getMediaUrl, getApiStatus
- JSON-RPC 2.0 over stdio transport
- **Run**: `node mcp-server.js`

---

## 📋 Configuration & Setup

**[.env](.env)**
- AWS credentials and configuration
- Port settings
- API token
- ⚠️ Never commit this file

**[package.json](package.json)**
- Node.js dependencies
- Scripts for running apps

**[vercel.json](vercel.json)**
- Vercel deployment configuration

---

## 📊 File Summary

| File | Type | Size | Purpose |
|------|------|------|---------|
| **index.js** | App | 13K | REST API server (upload) |
| **s3-manager.js** | App | 6.6K | Web UI server |
| **mcp-server.js** | App | 11K | Claude Desktop MCP |
| **s3-media-manager.sh** | Tool | 23K | CLI manager |
| **start-s3-manager.sh** | Script | 1.6K | CLI startup helper |
| **IMGS3_REF_API.md** | Docs | 18K | API reference |
| **TOOLKIT_GUIDE.md** | Docs | 7.0K | Tool comparison |
| **ARCHITECTURE.md** | Docs | 7.1K | System design |
| **S3_MANAGER_README.md** | Docs | 4.8K | Web app guide |
| **S3_MEDIA_MANAGER.md** | Docs | 4.7K | CLI guide |
| **README.md** | Docs | 3.7K | Quick start |
| **TESTING.md** | Docs | 7.9K | Test procedures |
| **API_AUTHENTICATION.md** | Docs | 4.5K | Auth setup |
| **DEPLOYMENT.md** | Docs | 2.8K | Deploy guide |
| **VERCEL_DEPLOYMENT.md** | Docs | 6.4K | Vercel guide |
| **s3-manager-ui/** | UI | - | Web app frontend |

---

## 🎯 Use Cases

### Upload Media
```bash
# Via API
node index.js
curl -X POST -F "media=@photo.jpg" \
  -H "Authorization: Bearer $TOKEN" \
  http://localhost:3000/upload
```

### Manage Media (Visual)
```bash
# Via Web App
./start-s3-manager.sh
# Open http://localhost:3003
```

### Manage Media (CLI)
```bash
# Via Bash Tool
./s3-media-manager.sh list
./s3-media-manager.sh gallery
./s3-media-manager.sh serve
```

### Claude Desktop Integration
```bash
# Via MCP
node mcp-server.js
# Configure in Claude Desktop settings
```

---

## 🔒 Security

- ✅ Credentials in `.env` (git-ignored)
- ✅ Bearer token authentication
- ✅ Folder-scoped S3 access
- ✅ Confirmations for destructive operations
- ✅ Input validation and sanitization

---

## 📦 Supported Media

**Images**: JPEG, PNG, GIF, WebP, SVG
**Videos**: MP4, WebM, OGG, MOV, AVI, MKV
**Max Size**: 500MB per file

---

## 🚢 Deployment

- Local: All tools run locally
- Vercel: Deploy REST API and web app
- AWS Lambda: Upload as function
- Docker: Containerize for production

See [DEPLOYMENT.md](DEPLOYMENT.md) and [VERCEL_DEPLOYMENT.md](VERCEL_DEPLOYMENT.md)

---

## 📚 Getting Started

1. **Read**: [README.md](README.md)
2. **Explore**: [TOOLKIT_GUIDE.md](TOOLKIT_GUIDE.md)
3. **Configure**: Set up `.env` with AWS credentials
4. **Choose tool**: API, CLI, or Web UI
5. **Refer**: Use specific documentation for your tool

---

## 🆘 Need Help?

- General questions → [README.md](README.md)
- API details → [IMGS3_REF_API.md](IMGS3_REF_API.md)
- CLI help → `./s3-media-manager.sh help`
- Web app → [S3_MANAGER_README.md](S3_MANAGER_README.md)
- Architecture → [ARCHITECTURE.md](ARCHITECTURE.md)

---

**IMGS3** - Complete media management for AWS S3
