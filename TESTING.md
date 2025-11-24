# Testing the API

## Quick Start

1. Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

2. Edit `.env` with your real AWS credentials:
```bash
# Example values - replace with your actual AWS credentials
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE
AWS_SECRET_ACCESS_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
AWS_S3_BUCKET_NAME=my-images-bucket
PORT=3000
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

### Upload an Image
```bash
# Create a test image (or use your own)
curl -o test-image.jpg https://via.placeholder.com/500

# Upload the image
curl -X POST http://localhost:3000/upload \
  -F "image=@test-image.jpg" \
  -H "Accept: application/json"
```

### Expected Response
```json
{
  "message": "Image uploaded successfully",
  "url": "https://your-bucket.s3.us-east-1.amazonaws.com/550e8400-e29b-41d4-a716-446655440000.jpg",
  "fileName": "550e8400-e29b-41d4-a716-446655440000.jpg"
}
```

## Testing Validation

### Invalid File Type
```bash
# Try to upload a text file (should fail)
echo "test" > test.txt
curl -X POST http://localhost:3000/upload \
  -F "image=@test.txt"
```

Expected error:
```json
{
  "error": "Invalid file type. Only JPEG, PNG, GIF, and WebP images are allowed."
}
```

### No File Provided
```bash
curl -X POST http://localhost:3000/upload
```

Expected error:
```json
{
  "error": "No image file provided"
}
```

## HTML Form Example

Create a simple HTML page to test the upload:

```html
<!DOCTYPE html>
<html>
<head>
    <title>Image Upload Test</title>
</head>
<body>
    <h1>Upload Image to S3</h1>
    <form id="uploadForm">
        <input type="file" id="imageInput" accept="image/*" required>
        <button type="submit">Upload</button>
    </form>
    <div id="result"></div>

    <script>
        document.getElementById('uploadForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const formData = new FormData();
            const fileInput = document.getElementById('imageInput');
            formData.append('image', fileInput.files[0]);

            try {
                const response = await fetch('http://localhost:3000/upload', {
                    method: 'POST',
                    body: formData
                });
                
                const data = await response.json();
                
                if (response.ok) {
                    document.getElementById('result').innerHTML = `
                        <h2>Upload Successful!</h2>
                        <p>URL: <a href="${data.url}" target="_blank">${data.url}</a></p>
                        <img src="${data.url}" style="max-width: 500px;" />
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

If you want uploaded images to be publicly accessible:
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
