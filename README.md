# imgs3

Complete media management suite for Amazon S3. Upload, manage, and visualize images and videos with multiple interfaces.

## 🎯 Three Ways to Manage Media

| Tool | Purpose | Interface | Port |
|------|---------|-----------|------|
| **REST API** | Upload media programmatically | HTTP/JSON | 3000 |
| **CLI Manager** | Command-line management | Terminal | N/A |
| **Web Manager** | Visual interface | Web browser | 3003 |

## 🚀 Quick Start

### 1️⃣ Upload Media (REST API)

```bash
node index.js
# Then POST to http://localhost:3000/upload
```

### 2️⃣ Manage Media (CLI)

```bash
./s3-media-manager.sh list
./s3-media-manager.sh gallery
./s3-media-manager.sh serve
```

### 3️⃣ Visual Management (Web App)

```bash
./start-s3-manager.sh
# Open http://localhost:3003
```

---

## 📚 Documentation

- **Toolkit Overview**: [`TOOLKIT_GUIDE.md`](TOOLKIT_GUIDE.md) - Complete comparison and workflows
- **API Reference**: [`IMGS3_REF_API.md`](IMGS3_REF_API.md) - Detailed REST API documentation
- **CLI Guide**: [`S3_MEDIA_MANAGER.md`](S3_MEDIA_MANAGER.md) - Bash utility reference
- **Web App Guide**: [`S3_MANAGER_README.md`](S3_MANAGER_README.md) - Node.js web interface
- **Architecture**: [`ARCHITECTURE.md`](ARCHITECTURE.md) - System design overview

---

## Features

✨ **Multi-Upload**
- 3 modes: multipart, base64, URL download
- Support for images and videos
- 500MB file size limit
- Automatic unique ID generation

📊 **Multi-Interface**
- REST API for programmatic access
- CLI tools for terminal automation
- Web UI for visual management

🎥 **Format Support**
- **Images**: JPEG, PNG, GIF, WebP, SVG
- **Videos**: MP4, WebM, OGG, MOV, AVI, MKV

🔐 **Security**
- API token authentication
- AWS credentials from `.env`
- Folder-scoped access
- Confirmation for destructive operations

---

## Installation

1. Clone the repository:
```bash
git clone https://github.com/hmzoo/imgs3.git
cd imgs3
```

2. Install dependencies:
```bash
npm install
```

3. Configure `.env`:
```bash
cp .env.example .env
# Edit with your AWS credentials
```

---

## Usage Examples

### Upload via API

```bash
# Mode 1: Multipart (file upload)
curl -X POST http://localhost:3000/upload \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "media=@image.jpg"

# Mode 2: Base64 (JSON)
curl -X POST http://localhost:3000/upload \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"mode":"base64","mediaData":"data:image/jpeg;base64,..."}'

# Mode 3: URL (download)
curl -X POST http://localhost:3000/upload \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"mode":"url","mediaUrl":"https://example.com/image.jpg"}'
```

### List Files (CLI)

```bash
./s3-media-manager.sh list
```

### Web Interface

```bash
./start-s3-manager.sh
# Open browser to http://localhost:3003
```

---

## API Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/` | GET | Health check |
| `/status` | GET | API status |
| `/upload` | POST | Upload media (3 modes) |
| `/generate-url` | GET | Generate S3 URL |

See [`IMGS3_REF_API.md`](IMGS3_REF_API.md) for complete API documentation.

---

## File Size Limit

Maximum file size: **500MB**

---

## Prerequisites

- Node.js (v14 or higher)
- AWS Account with S3 bucket
- AWS credentials (Access Key ID + Secret Access Key)

---

## Security Notes

- The `.env` file is excluded from git (`.gitignore`)
- Never commit AWS credentials
- Use IAM users with minimal permissions
- Validate all user inputs
- Enable bucket encryption

---

## License

ISC

---

**Next**: Read [`TOOLKIT_GUIDE.md`](TOOLKIT_GUIDE.md) for a complete feature comparison and recommended workflows.