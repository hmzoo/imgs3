# imgs3

API service for uploading images and videos to Amazon S3. The service stores media files with unique IDs and returns the media URL.

## Features

- Upload images and videos to Amazon S3 bucket
- Automatic unique ID generation for each media file using UUID
- Support for multiple formats:
  - **Images**: JPEG, PNG, GIF, WebP, SVG
  - **Videos**: MP4, WebM, OGG, MOV, AVI, MKV
- File size limit: 500MB
- Returns the public URL of the uploaded media
- 3 upload modes: multipart, base64, URL
- Built with Node.js and Express
- API token authentication support

## Prerequisites

- Node.js (v14 or higher)
- AWS Account with S3 bucket configured
- AWS Access Key ID and Secret Access Key

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

3. Create a `.env` file based on `.env.example`:
```bash
cp .env.example .env
```

4. Configure your `.env` file with your AWS credentials:
```env
AWS_REGION=eu-west-1
AWS_ACCESS_KEY_ID=your_access_key_id
AWS_SECRET_ACCESS_KEY=your_secret_access_key
AWS_S3_BUCKET_NAME=your_bucket_name
AWS_S3_FOLDER=images
PORT=3000
API_TOKEN=your_secure_token
REQUIRE_AUTH=true
```

## Usage

Start the server:
```bash
npm start
```

The server will start on the port specified in your `.env` file (default: 3000).

## API Endpoints

### GET /
Health check endpoint that returns API information.

**Response:**
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

### POST /upload
Upload media (images or videos) to S3. Supports 3 upload modes.

**Mode 1: Multipart Form Data**
- Method: `POST`
- Content-Type: `multipart/form-data`
- Body: `image` (file) + optional `fileName`

Example with cURL:
```bash
curl -X POST http://localhost:3000/upload \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "image=@video.mp4"
```

**Mode 2: Base64 JSON**
- Method: `POST`
- Content-Type: `application/json`
- Body: `image` (base64 string) + optional `fileName`

Example with cURL:
```bash
curl -X POST http://localhost:3000/upload \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "image": "data:video/mp4;base64,AAAA...",
    "fileName": "video.mp4"
  }'
```

**Mode 3: URL Download**
- Method: `POST`
- Content-Type: `application/json`
- Body: `mediaUrl` or `imageUrl` + optional `fileName`

Example with cURL:
```bash
curl -X POST http://localhost:3000/upload \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "mediaUrl": "https://example.com/video.mp4",
    "fileName": "video.mp4"
  }'
```

**Success Response (200):**
```json
{
  "message": "Media uploaded successfully",
  "url": "https://your-bucket-name.s3.eu-west-1.amazonaws.com/images/uuid-here.mp4",
  "fileName": "uuid-here.mp4",
  "s3Key": "images/uuid-here.mp4",
  "contentType": "video/mp4",
  "source": "multipart-upload"
}
```

**Error Response (400):**
```json
{
  "error": "No media provided",
  "supported_modes": [
    "multipart/form-data with \"image\" file",
    "JSON with \"image\" (base64 or data URI)",
    "JSON with \"mediaUrl\" or \"imageUrl\""
  ],
  "supported_types": {
    "images": ["JPEG", "PNG", "GIF", "WebP", "SVG"],
    "videos": ["MP4", "WebM", "OGG", "MOV", "AVI", "MKV"]
  }
}
```

**Error Response (500):**
```json
{
  "error": "Failed to upload media",
  "details": "Error message details"
}
```

### GET /status
Get API status and configuration.

**Response:**
```json
{
  "status": "online",
  "bucket": "hmzoo",
  "region": "eu-west-1",
  "folder": "images"
}
```

### GET /generate-url
Generate S3 URL for a file without uploading.

**Query Parameters:**
- `fileName` (required): The name of the file in S3

**Example:**
```bash
curl "http://localhost:3000/generate-url?fileName=video.mp4" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Response:**
```json
{
  "fileName": "video.mp4",
  "s3Key": "images/video.mp4",
  "url": "https://hmzoo.s3.eu-west-1.amazonaws.com/images/video.mp4",
  "bucket": "hmzoo",
  "region": "eu-west-1",
  "folder": "images"
}
```

## Supported Media Formats

### Images
- JPEG (.jpg, .jpeg)
- PNG (.png)
- GIF (.gif)
- WebP (.webp)
- SVG (.svg)

### Videos
- MP4 (.mp4)
- WebM (.webm)
- OGG (.ogg)
- MOV (.mov)
- AVI (.avi)
- MKV (.mkv)

## File Size Limit

Maximum file size: **500MB**

## Authentication

The API supports optional token-based authentication via the `Authorization` header.

**Configuration:**
```env
REQUIRE_AUTH=true
API_TOKEN=your-secure-token-here
```

**Usage:**
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" http://localhost:3000/status
```

If `REQUIRE_AUTH=false`, the token is not required.

## AWS S3 Configuration

Make sure your S3 bucket is configured to allow public read access for uploaded images, or adjust the bucket policy according to your needs.

Example bucket policy for public read access:
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "PublicReadGetObject",
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::your-bucket-name/*"
    }
  ]
}
```

## Security Notes

- The `.env` file is excluded from version control via `.gitignore`
- Never commit your AWS credentials to the repository
- Always use IAM users with minimal required permissions
- Consider implementing authentication/authorization for production use
- Validate and sanitize all user inputs

## License

ISC