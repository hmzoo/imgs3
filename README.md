# imgs3

API service for uploading images to Amazon S3. The service stores images with unique IDs and returns the image URL.

## Features

- Upload images to Amazon S3 bucket
- Automatic unique ID generation for each image using UUID
- Support for JPEG, PNG, GIF, and WebP formats
- File size limit: 5MB
- Returns the public URL of the uploaded image
- Built with Node.js and Express

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
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your_access_key_id
AWS_SECRET_ACCESS_KEY=your_secret_access_key
AWS_S3_BUCKET_NAME=your_bucket_name
PORT=3000
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
  "message": "Image Upload API is running",
  "endpoints": {
    "upload": "POST /upload - Upload an image to S3"
  }
}
```

### POST /upload
Upload an image to S3.

**Request:**
- Method: `POST`
- Content-Type: `multipart/form-data`
- Body parameter: `image` (file)

**Example using cURL:**
```bash
curl -X POST http://localhost:3000/upload \
  -F "image=@/path/to/your/image.jpg"
```

**Example using JavaScript (fetch):**
```javascript
const formData = new FormData();
formData.append('image', fileInput.files[0]);

fetch('http://localhost:3000/upload', {
  method: 'POST',
  body: formData
})
  .then(response => response.json())
  .then(data => console.log('Image URL:', data.url))
  .catch(error => console.error('Error:', error));
```

**Success Response (200):**
```json
{
  "message": "Image uploaded successfully",
  "url": "https://your-bucket-name.s3.us-east-1.amazonaws.com/uuid-here.jpg",
  "fileName": "uuid-here.jpg"
}
```

**Error Response (400):**
```json
{
  "error": "No image file provided"
}
```

**Error Response (500):**
```json
{
  "error": "Failed to upload image",
  "details": "Error message details"
}
```

## Supported Image Formats

- JPEG (.jpg, .jpeg)
- PNG (.png)
- GIF (.gif)
- WebP (.webp)

## File Size Limit

Maximum file size: 5MB

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