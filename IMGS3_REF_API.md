# IMGS3 API Reference

Complete API documentation with JSON schemas for client development.

**Base URL:** `http://localhost:3000` (development) or `https://your-domain.vercel.app` (production)

**Authentication:** Optional token-based via `Authorization: Bearer <token>` header

**File Size Limit:** 500 MB

---

## Table of Contents

1. [Health Check](#health-check)
2. [API Status](#api-status)
3. [Upload Media](#upload-media)
4. [Generate URL](#generate-url)
5. [Error Handling](#error-handling)
6. [Supported Media Types](#supported-media-types)
7. [Code Examples](#code-examples)

---

## Health Check

**Endpoint:** `GET /`

**Description:** Get API information and supported media types.

**Authentication:** Not required

**Response (200 OK):**

```json
{
  "message": "Media Upload API is running (images & videos)",
  "supported_types": {
    "images": ["JPEG", "PNG", "GIF", "WebP", "SVG"],
    "videos": ["MP4", "WebM", "OGG", "MOV", "AVI", "MKV"]
  },
  "endpoints": {
    "upload": "POST /upload - Upload media (3 modes)",
    "status": "GET /status - API status",
    "generate-url": "GET /generate-url?fileName=<name> - Generate S3 URL"
  }
}
```

---

## API Status

**Endpoint:** `GET /status`

**Description:** Get API status and AWS S3 configuration details.

**Authentication:** Required (if REQUIRE_AUTH=true)

**Request Headers:**

```
Authorization: Bearer YOUR_API_TOKEN
```

**Response (200 OK):**

```json
{
  "status": "online",
  "bucket": "hmzoo",
  "region": "eu-west-1",
  "folder": "images"
}
```

**Response (401 Unauthorized):**

```json
{
  "error": "Unauthorized",
  "message": "API token is required. Use \"Authorization: Bearer <token>\" header"
}
```

**Response (403 Forbidden):**

```json
{
  "error": "Forbidden",
  "message": "Invalid API token"
}
```

---

## Upload Media

**Endpoint:** `POST /upload`

**Description:** Upload media (images or videos) to S3. Supports 3 modes.

**Authentication:** Required (if REQUIRE_AUTH=true)

**Request Headers:**

```
Authorization: Bearer YOUR_API_TOKEN
```

### Mode 1: Multipart File Upload

**Content-Type:** `multipart/form-data`

**Form Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `media` | File | Yes* | Media file (image or video) - Recommended |
| `image` | File | Yes* | Media file (image or video) - Deprecated, use 'media' |
| `fileName` | String | No | Custom output filename |

\* Either 'media' or 'image' is required (use 'media' for new implementations)

**Example with cURL:**

```bash
curl -X POST http://localhost:3000/upload \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "media=@video.mp4" \
  -F "fileName=my-video.mp4"
```

**Example with JavaScript (fetch):**

```javascript
const formData = new FormData();
const fileInput = document.getElementById('fileInput');
formData.append('media', fileInput.files[0]);
formData.append('fileName', 'custom-name.mp4');

const response = await fetch('http://localhost:3000/upload', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer YOUR_TOKEN'
  },
  body: formData
});

const data = await response.json();
console.log('Media URL:', data.url);
```

### Mode 2: Base64 JSON

**Content-Type:** `application/json`

**Request Body Schema:**

```json
{
  "mediaData": "string (base64 or data URI)",
  "fileName": "string (optional)"
}
```

**Request Example:**

```json
{
  "mediaData": "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAYABgAAD...",
  "fileName": "photo.jpg"
}
```

**Example with cURL:**

```bash
curl -X POST http://localhost:3000/upload \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "mediaData": "data:video/mp4;base64,AAAAIGZ0eXBpc29tAAACAGlzb201...",
    "fileName": "video.mp4"
  }'
```

**Example with JavaScript:**

```javascript
const base64Data = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQE...';

const response = await fetch('http://localhost:3000/upload', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer YOUR_TOKEN',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    mediaData: base64Data,
    fileName: 'photo.jpg'
  })
});

const data = await response.json();
```

### Mode 3: URL Download

**Content-Type:** `application/json`

**Request Body Schema:**

```json
{
  "mediaUrl": "string (URL to media file)",
  "fileName": "string (optional)"
}
```

**Request Example:**

```json
{
  "mediaUrl": "https://example.com/video.mp4",
  "fileName": "downloaded-video.mp4"
}
```

**Example with cURL:**

```bash
curl -X POST http://localhost:3000/upload \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "mediaUrl": "https://example.com/video.mp4",
    "fileName": "video.mp4"
  }'
```

**Example with JavaScript:**

```javascript
const response = await fetch('http://localhost:3000/upload', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer YOUR_TOKEN',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    mediaUrl: 'https://example.com/video.mp4',
    fileName: 'video.mp4'
  })
});

const data = await response.json();
```

### Response Schemas

**Success Response (200 OK):**

```json
{
  "message": "Media uploaded successfully",
  "url": "https://hmzoo.s3.eu-west-1.amazonaws.com/images/550e8400-e29b-41d4-a716-446655440000.mp4",
  "fileName": "550e8400-e29b-41d4-a716-446655440000.mp4",
  "s3Key": "images/550e8400-e29b-41d4-a716-446655440000.mp4",
  "contentType": "video/mp4",
  "source": "multipart-upload"
}
```

**Response Fields:**

| Field | Type | Description |
|-------|------|-------------|
| `message` | String | Success message |
| `url` | String | Public S3 URL of uploaded media |
| `fileName` | String | Filename in S3 bucket |
| `s3Key` | String | Full S3 key path (bucket-relative) |
| `contentType` | String | MIME type of the media |
| `source` | String | Upload source: `multipart-upload`, `base64-upload`, or `url-upload` |

**Error Response (400 Bad Request):**

```json
{
  "error": "No media provided",
  "supported_modes": [
    "multipart/form-data with \"media\" file",
    "JSON with \"mediaData\" (base64 or data URI)",
    "JSON with \"mediaUrl\""
  ],
  "supported_types": {
    "images": ["JPEG", "PNG", "GIF", "WebP", "SVG"],
    "videos": ["MP4", "WebM", "OGG", "MOV", "AVI", "MKV"]
  }
}
```

**Error Response (400 Bad Request - Invalid Type):**

```json
{
  "error": "Invalid file type. Supported: Images: JPEG, PNG, GIF, WebP, SVG, Videos: MP4, WebM, OGG, MOV, AVI, MKV"
}
```

**Error Response (500 Server Error):**

```json
{
  "error": "Failed to upload media",
  "details": "Error details here"
}
```

---

## Generate URL

**Endpoint:** `GET /generate-url`

**Description:** Generate an S3 URL without uploading. Useful for creating signed URLs or pre-generating paths.

**Authentication:** Required (if REQUIRE_AUTH=true)

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `fileName` | String | Yes | Filename to generate URL for |

**Request Example:**

```
GET /generate-url?fileName=my-video.mp4
```

**Example with cURL:**

```bash
curl "http://localhost:3000/generate-url?fileName=my-video.mp4" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Example with JavaScript:**

```javascript
const fileName = 'my-video.mp4';
const response = await fetch(
  `http://localhost:3000/generate-url?fileName=${encodeURIComponent(fileName)}`,
  {
    headers: {
      'Authorization': 'Bearer YOUR_TOKEN'
    }
  }
);

const data = await response.json();
console.log('Generated URL:', data.url);
```

**Response (200 OK):**

```json
{
  "fileName": "my-video.mp4",
  "s3Key": "images/my-video.mp4",
  "url": "https://hmzoo.s3.eu-west-1.amazonaws.com/images/my-video.mp4",
  "bucket": "hmzoo",
  "region": "eu-west-1",
  "folder": "images"
}
```

**Response Fields:**

| Field | Type | Description |
|-------|------|-------------|
| `fileName` | String | Provided filename |
| `s3Key` | String | Full S3 key path (bucket-relative) |
| `url` | String | Public S3 URL |
| `bucket` | String | AWS S3 bucket name |
| `region` | String | AWS region |
| `folder` | String | S3 folder/prefix |

**Error Response (400 Bad Request):**

```json
{
  "error": "fileName query parameter is required"
}
```

---

## Error Handling

### Common HTTP Status Codes

| Status | Meaning | Example |
|--------|---------|---------|
| 200 | Success | Upload successful |
| 400 | Bad Request | Invalid parameters, missing required fields |
| 401 | Unauthorized | Missing authentication token |
| 403 | Forbidden | Invalid authentication token |
| 500 | Server Error | S3 upload failure, internal error |

### Error Response Structure

All errors follow this standard structure:

```json
{
  "error": "Error type or message",
  "details": "Additional error details (optional)",
  "message": "Human-readable message (optional)"
}
```

### Common Error Scenarios

**1. Missing Authentication:**

```json
{
  "error": "Unauthorized",
  "message": "API token is required. Use \"Authorization: Bearer <token>\" header"
}
```

**2. Invalid Token:**

```json
{
  "error": "Forbidden",
  "message": "Invalid API token"
}
```

**3. Invalid File Type:**

```json
{
  "error": "Invalid file type. Supported: Images: JPEG, PNG, GIF, WebP, SVG, Videos: MP4, WebM, OGG, MOV, AVI, MKV"
}
```

**4. File Too Large:**

```json
{
  "error": "File size exceeds 500MB limit"
}
```

**5. S3 Upload Error:**

```json
{
  "error": "Failed to upload media",
  "details": "Access Denied: Check AWS credentials and S3 bucket permissions"
}
```

---

## Supported Media Types

### Images

| Format | MIME Type | Extension |
|--------|-----------|-----------|
| JPEG | `image/jpeg` | `.jpg`, `.jpeg` |
| PNG | `image/png` | `.png` |
| GIF | `image/gif` | `.gif` |
| WebP | `image/webp` | `.webp` |
| SVG | `image/svg+xml` | `.svg` |

### Videos

| Format | MIME Type | Extension |
|--------|-----------|-----------|
| MP4 | `video/mp4` | `.mp4` |
| WebM | `video/webm` | `.webm` |
| OGG | `video/ogg` | `.ogg` |
| MOV | `video/quicktime` | `.mov` |
| AVI | `video/x-msvideo` | `.avi` |
| MKV | `video/x-matroska` | `.mkv` |

---

## Code Examples

### Python

```python
import requests
import base64

BASE_URL = "http://localhost:3000"
TOKEN = "YOUR_API_TOKEN"

headers = {
    "Authorization": f"Bearer {TOKEN}"
}

# Upload file (multipart)
def upload_file(file_path, custom_name=None):
    with open(file_path, 'rb') as f:
        files = {'media': f}
        data = {'fileName': custom_name} if custom_name else {}
        response = requests.post(f"{BASE_URL}/upload", files=files, data=data, headers=headers)
    return response.json()

# Upload from URL
def upload_from_url(url, custom_name=None):
    payload = {
        "mediaUrl": url,
        "fileName": custom_name
    }
    response = requests.post(f"{BASE_URL}/upload", json=payload, headers=headers)
    return response.json()

# Generate URL
def generate_url(file_name):
    params = {"fileName": file_name}
    response = requests.get(f"{BASE_URL}/generate-url", params=params, headers=headers)
    return response.json()

# Get status
def get_status():
    response = requests.get(f"{BASE_URL}/status", headers=headers)
    return response.json()

# Usage
result = upload_file("video.mp4", "my-video.mp4")
print("Upload result:", result)

url_info = generate_url("my-video.mp4")
print("Generated URL:", url_info['url'])
```

### Node.js / TypeScript

```typescript
import FormData from 'form-data';
import fs from 'fs';
import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:3000';
const TOKEN = 'YOUR_API_TOKEN';

const headers = {
  'Authorization': `Bearer ${TOKEN}`
};

// Upload file (multipart)
async function uploadFile(filePath: string, customName?: string) {
  const form = new FormData();
  form.append('media', fs.createReadStream(filePath));
  if (customName) form.append('fileName', customName);

  const response = await fetch(`${BASE_URL}/upload`, {
    method: 'POST',
    headers: {
      ...headers,
      ...form.getHeaders()
    },
    body: form
  });

  return response.json();
}

// Upload from URL
async function uploadFromUrl(url: string, customName?: string) {
  const response = await fetch(`${BASE_URL}/upload`, {
    method: 'POST',
    headers: {
      ...headers,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      mediaUrl: url,
      fileName: customName
    })
  });

  return response.json();
}

// Generate URL
async function generateUrl(fileName: string) {
  const response = await fetch(
    `${BASE_URL}/generate-url?fileName=${encodeURIComponent(fileName)}`,
    { headers }
  );

  return response.json();
}

// Get status
async function getStatus() {
  const response = await fetch(`${BASE_URL}/status`, { headers });
  return response.json();
}

// Usage
(async () => {
  const result = await uploadFile('video.mp4', 'my-video.mp4');
  console.log('Upload result:', result);

  const urlInfo = await generateUrl('my-video.mp4');
  console.log('Generated URL:', urlInfo.url);
})();
```

### JavaScript (Browser)

```javascript
const BASE_URL = 'http://localhost:3000';
const TOKEN = 'YOUR_API_TOKEN';

// Upload file from input
async function uploadFile(fileInput, customName) {
  const formData = new FormData();
  formData.append('media', fileInput.files[0]);
  if (customName) formData.append('fileName', customName);

  const response = await fetch(`${BASE_URL}/upload`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${TOKEN}`
    },
    body: formData
  });

  const data = await response.json();
  return data;
}

// Upload from base64
async function uploadBase64(base64Data, customName) {
  const response = await fetch(`${BASE_URL}/upload`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      mediaData: base64Data,
      fileName: customName
    })
  });

  const data = await response.json();
  return data;
}

// Generate URL
async function generateUrl(fileName) {
  const response = await fetch(
    `${BASE_URL}/generate-url?fileName=${encodeURIComponent(fileName)}`,
    {
      headers: {
        'Authorization': `Bearer ${TOKEN}`
      }
    }
  );

  const data = await response.json();
  return data;
}

// Usage example
document.getElementById('uploadBtn').addEventListener('click', async () => {
  const fileInput = document.getElementById('fileInput');
  const result = await uploadFile(fileInput);
  console.log('Upload result:', result);
  document.getElementById('result').innerHTML = `
    <p>URL: <a href="${result.url}" target="_blank">${result.url}</a></p>
    <p>Type: ${result.contentType}</p>
  `;
});
```

### cURL Examples

```bash
# Health check (no auth required)
curl http://localhost:3000/

# Get status
curl http://localhost:3000/status \
  -H "Authorization: Bearer YOUR_TOKEN"

# Upload file (recommended - using 'media')
curl -X POST http://localhost:3000/upload \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "media=@video.mp4" \
  -F "fileName=my-video.mp4"

# Upload from base64
curl -X POST http://localhost:3000/upload \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "mediaData": "data:video/mp4;base64,AAAAIGZ0eXBpc...",
    "fileName": "video.mp4"
  }'

# Upload from URL
curl -X POST http://localhost:3000/upload \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "mediaUrl": "https://example.com/video.mp4",
    "fileName": "video.mp4"
  }'

# Generate URL
curl "http://localhost:3000/generate-url?fileName=my-video.mp4" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## Environment Configuration

### Server Configuration (.env)

```env
# AWS Configuration
AWS_REGION=eu-west-1
AWS_ACCESS_KEY_ID=your-aws-access-key-id
AWS_SECRET_ACCESS_KEY=your-aws-secret-access-key
AWS_S3_BUCKET_NAME=hmzoo
AWS_S3_FOLDER=images

# Server Configuration
PORT=3000

# API Authentication
API_TOKEN=your-secure-token-here
REQUIRE_AUTH=true

# MCP Server Configuration
MCP_API_BASE_URL=http://localhost:3000
```

### Client Configuration

```javascript
// Development
const API_BASE_URL = 'http://localhost:3000';
const API_TOKEN = 'M/gJRUPrgTg8Y9rEBrvWgN5GFfB+zMdZN7XFpkAE//w=';

// Production
const API_BASE_URL = 'https://your-vercel-domain.vercel.app';
const API_TOKEN = process.env.REACT_APP_API_TOKEN;
```

---

## Rate Limiting & Quotas

- **File Size Limit:** 500 MB per upload
- **Rate Limiting:** None (can be implemented at proxy level)
- **Concurrent Uploads:** Limited by server resources
- **S3 Quota:** Depends on AWS S3 bucket configuration

---

## Security Considerations

1. **Never commit API tokens** to version control
2. **Use HTTPS in production** to protect token transmission
3. **Rotate tokens regularly** for security
4. **Validate file types** on client-side before upload
5. **Implement CORS** properly if accessing from browser
6. **Use signed URLs** for sensitive content if needed
7. **Monitor S3 bucket** for unauthorized access

---

## Support & Troubleshooting

### Common Issues

**"API token is required"**
- Ensure `Authorization: Bearer <token>` header is included
- Check that `REQUIRE_AUTH=true` if token is needed

**"File size exceeds 500MB limit"**
- Split large files into chunks or reduce file size

**"Access Denied"**
- Check AWS S3 bucket permissions
- Verify AWS credentials in `.env`
- Ensure bucket is not private-only

**"Unsupported file type"**
- Check file MIME type
- Verify format is in supported list
- Check file extension

### Debugging

Enable detailed logging by starting server with:

```bash
DEBUG=* npm start
```

Check S3 bucket access:

```bash
node test-s3-access.js
```

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2025-11-26 | Initial API Reference - Image & Video support |

---

## Related Documentation

- [README.md](README.md) - Quick start guide
- [ARCHITECTURE.md](ARCHITECTURE.md) - System architecture
- [TESTING.md](TESTING.md) - Testing guide
- [API_AUTHENTICATION.md](API_AUTHENTICATION.md) - Authentication details
- [DEPLOYMENT.md](DEPLOYMENT.md) - Deployment instructions
