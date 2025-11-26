# API Authentication

## Overview

The Image Upload API can be protected with a token-based authentication system using Bearer tokens.

## Configuration

### Enable Authentication

Set the following environment variables:

```bash
# Generate a secure token (example)
API_TOKEN="your-secret-api-token-here"

# Enable authentication (optional, defaults to true)
REQUIRE_AUTH=true
```

### Disable Authentication

To disable authentication (not recommended for production):

```bash
REQUIRE_AUTH=false
```

## Usage

### Include API Token in Requests

Add the `Authorization` header with a Bearer token to all API requests:

```bash
curl -H "Authorization: Bearer your-secret-api-token-here" \
  http://localhost:3000/status
```

### cURL Examples

**Upload with authentication:**
```bash
curl -X POST \
  -H "Authorization: Bearer your-secret-api-token-here" \
  -F "image=@image.jpg" \
  http://localhost:3000/upload
```

**Generate URL with authentication:**
```bash
curl -H "Authorization: Bearer your-secret-api-token-here" \
  "http://localhost:3000/generate-url?fileName=test.jpg"
```

**Get status:**
```bash
curl -H "Authorization: Bearer your-secret-api-token-here" \
  http://localhost:3000/status
```

### JavaScript/Node.js Example

```javascript
const token = 'your-secret-api-token-here';

const response = await fetch('http://localhost:3000/upload', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
  },
  body: formData,
});

const result = await response.json();
console.log(result);
```

### Python Example

```python
import requests

token = 'your-secret-api-token-here'
headers = {
    'Authorization': f'Bearer {token}'
}

# Upload image
with open('image.jpg', 'rb') as f:
    files = {'image': f}
    response = requests.post(
        'http://localhost:3000/upload',
        headers=headers,
        files=files
    )
    print(response.json())

# Get status
status = requests.get(
    'http://localhost:3000/status',
    headers=headers
)
print(status.json())
```

## Error Responses

### Missing Token

**Status:** 401 Unauthorized

```json
{
  "error": "Unauthorized",
  "message": "API token is required. Use \"Authorization: Bearer <token>\" header"
}
```

### Invalid Token

**Status:** 403 Forbidden

```json
{
  "error": "Forbidden",
  "message": "Invalid API token"
}
```

## Public Endpoints

The following endpoints do NOT require authentication:

- `GET /` - Health check (returns API status and available endpoints)

All other endpoints require a valid API token when `REQUIRE_AUTH=true`.

## Security Best Practices

1. **Generate a strong token**: Use a cryptographically secure random string
   ```bash
   # Generate a secure token on macOS/Linux
   openssl rand -base64 32
   ```

2. **Use HTTPS in production**: Always use HTTPS to encrypt the token in transit

3. **Rotate tokens regularly**: Periodically change your API token

4. **Environment variables**: Store the token in environment variables, not in code

5. **Different tokens per environment**: Use different tokens for development, staging, and production

6. **Monitor access**: Log and monitor API usage for suspicious activity

## Generate a Secure Token

### Using OpenSSL

```bash
openssl rand -base64 32
```

### Using Node.js

```javascript
const crypto = require('crypto');
const token = crypto.randomBytes(32).toString('base64');
console.log(token);
```

### Using Python

```python
import secrets
token = secrets.token_urlsafe(32)
print(token)
```

## .env File Example

```env
# API Configuration
PORT=3000
API_TOKEN=your-secure-token-generated-above
REQUIRE_AUTH=true

# AWS Configuration
AWS_REGION=us-east-1
AWS_S3_BUCKET_NAME=my-bucket
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
AWS_S3_FOLDER=uploads
```

## Testing Authentication

### Test without token (should fail)

```bash
curl http://localhost:3000/status
# Response: 401 Unauthorized
```

### Test with correct token (should succeed)

```bash
curl -H "Authorization: Bearer your-secret-api-token-here" \
  http://localhost:3000/status
# Response: 200 OK with status information
```

### Test with wrong token (should fail)

```bash
curl -H "Authorization: Bearer wrong-token" \
  http://localhost:3000/status
# Response: 403 Forbidden
```

## Integrating with Claude MCP

When using Claude MCP, ensure the `API_TOKEN` is set in the environment:

```bash
# Set token before running the MCP server
export API_TOKEN="your-secure-token"
npm start
```

The MCP server will automatically pass the token to all API requests made to the image upload service.
