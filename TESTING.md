# Testing the API

## Quick Start

1. Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

2. Edit `.env` with your real AWS credentials:
```bash
# Example values - replace with your actual AWS credentials
AWS_REGION=eu-west-1
AWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE
AWS_SECRET_ACCESS_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
AWS_S3_BUCKET_NAME=my-bucket
AWS_S3_FOLDER=images
PORT=3000
API_TOKEN=your-secure-token
REQUIRE_AUTH=true
```

3. Start the server:
```bash
npm start
```

## Testing with cURL

### Health Check
```bash
curl http://localhost:3000/
```

Expected response shows all supported media types (images and videos).

### Mode 1: Upload Image (Multipart)
```bash
# Create a test image (or use your own)
curl -o test-image.jpg https://via.placeholder.com/500

# Upload the image
curl -X POST http://localhost:3000/upload \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "image=@test-image.jpg"
```

### Mode 1: Upload Video (Multipart)
```bash
# Create a small test video (or use your own)
# Download a sample video
curl -o test-video.mp4 "https://www.w3schools.com/html/mov_bbb.mp4"

# Upload the video
curl -X POST http://localhost:3000/upload \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "image=@test-video.mp4"
```

### Expected Response (Success)
```json
{
  "message": "Media uploaded successfully",
  "url": "https://my-bucket.s3.eu-west-1.amazonaws.com/images/550e8400-e29b-41d4-a716-446655440000.mp4",
  "fileName": "550e8400-e29b-41d4-a716-446655440000.mp4",
  "s3Key": "images/550e8400-e29b-41d4-a716-446655440000.mp4",
  "contentType": "video/mp4",
  "source": "multipart-upload"
}
```

### Mode 2: Upload via Base64
```bash
# Encode a file to base64
base64 -i test-image.jpg -o test-image.b64

# Upload via JSON
curl -X POST http://localhost:3000/upload \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "image": "data:image/jpeg;base64,'"$(cat test-image.b64)"'",
    "fileName": "my-image.jpg"
  }'
```

### Mode 3: Upload via URL
```bash
# Upload from URL
curl -X POST http://localhost:3000/upload \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "mediaUrl": "https://www.w3schools.com/html/mov_bbb.mp4",
    "fileName": "sample-video.mp4"
  }'
```

### Get API Status
```bash
curl http://localhost:3000/status \
  -H "Authorization: Bearer YOUR_TOKEN"
```

Expected response:
```json
{
  "status": "online",
  "bucket": "my-bucket",
  "region": "eu-west-1",
  "folder": "images"
}
```

### Generate URL without Upload
```bash
curl "http://localhost:3000/generate-url?fileName=my-file.mp4" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

Expected response:
```json
{
  "fileName": "my-file.mp4",
  "s3Key": "images/my-file.mp4",
  "url": "https://my-bucket.s3.eu-west-1.amazonaws.com/images/my-file.mp4",
  "bucket": "my-bucket",
  "region": "eu-west-1",
  "folder": "images"
}
```

## Testing Validation

### Invalid File Type
```bash
# Try to upload a text file (should fail)
echo "test" > test.txt
curl -X POST http://localhost:3000/upload \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "image=@test.txt"
```

Expected error:
```json
{
  "error": "Invalid file type. Supported: Images: JPEG, PNG, GIF, WebP, SVG, Videos: MP4, WebM, OGG, MOV, AVI, MKV"
}
```

### No Media Provided
```bash
curl -X POST http://localhost:3000/upload \
  -H "Authorization: Bearer YOUR_TOKEN"
```

Expected error:
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

### Missing Authentication
```bash
curl -X POST http://localhost:3000/upload \
  -F "image=@test.jpg"
```

Expected error (if REQUIRE_AUTH=true):
```json
{
  "error": "Unauthorized",
  "message": "API token is required. Use \"Authorization: Bearer <token>\" header"
}
```

## HTML Form Example

Create a simple HTML page to test the upload:

```html
<!DOCTYPE html>
<html>
<head>
    <title>Media Upload Test</title>
    <style>
        body { font-family: Arial, sans-serif; max-width: 600px; margin: 50px auto; }
        #result { margin-top: 20px; padding: 10px; border: 1px solid #ccc; }
        img, video { max-width: 100%; height: auto; }
    </style>
</head>
<body>
    <h1>Upload Media to S3 (Images & Videos)</h1>
    <form id="uploadForm">
        <input type="file" id="mediaInput" accept="image/*,video/*" required>
        <button type="submit">Upload</button>
    </form>
    <div id="result"></div>

    <script>
        document.getElementById('uploadForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const formData = new FormData();
            const fileInput = document.getElementById('mediaInput');
            const file = fileInput.files[0];
            formData.append('image', file);

            try {
                const response = await fetch('http://localhost:3000/upload', {
                    method: 'POST',
                    headers: {
                        'Authorization': 'Bearer YOUR_TOKEN'
                    },
                    body: formData
                });
                
                const data = await response.json();
                
                if (response.ok) {
                    const isVideo = data.contentType.startsWith('video/');
                    const mediaTag = isVideo 
                        ? `<video controls style="max-width: 500px;"><source src="${data.url}" type="${data.contentType}"></video>`
                        : `<img src="${data.url}" style="max-width: 500px;" />`;
                    
                    document.getElementById('result').innerHTML = `
                        <h2>Upload Successful!</h2>
                        <p><strong>Type:</strong> ${data.contentType}</p>
                        <p><strong>URL:</strong> <a href="${data.url}" target="_blank">${data.url}</a></p>
                        ${mediaTag}
                    `;
                } else {
                    document.getElementById('result').innerHTML = `
                        <h2>Upload Failed</h2>
                        <p>Error: ${data.error}</p>
                    `;
                }
            } catch (error) {
                document.getElementById('result').innerHTML = `
                    <h2>Upload Failed</h2>
                    <p>Error: ${error.message}</p>
                `;
            }
        });
    </script>
</body>
</html>
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

## AWS S3 Bucket Configuration

### Required IAM Permissions

Your AWS user needs the following permissions:
```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "s3:PutObject",
                "s3:PutObjectAcl"
            ],
            "Resource": "arn:aws:s3:::your-bucket-name/*"
        }
    ]
}
```

### Bucket Policy for Public Access

If you want uploaded media to be publicly accessible:
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

### CORS Configuration

If accessing from a web browser, add CORS configuration to your bucket:
```json
[
    {
        "AllowedHeaders": ["*"],
        "AllowedMethods": ["GET", "HEAD"],
        "AllowedOrigins": ["*"],
        "ExposeHeaders": []
    }
]
```