require('dotenv').config();
const express = require('express');
const multer = require('multer');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const fetch = require('node-fetch');
const { HttpsProxyAgent } = require('https-proxy-agent');
const { NodeHttpHandler } = require('@smithy/node-http-handler');

const app = express();
const PORT = process.env.PORT || 3000;

// ============================================
// Helper Functions
// ============================================

function generateImageUrl(fileName) {
  const bucket = process.env.AWS_S3_BUCKET_NAME;
  const region = process.env.AWS_REGION;
  const folder = process.env.AWS_S3_FOLDER || '';
  const s3Key = folder ? `${folder}/${fileName}` : fileName;
  return `https://${bucket}.s3.${region}.amazonaws.com/${s3Key}`;
}

function buildS3Key(fileName) {
  const folder = process.env.AWS_S3_FOLDER ? `${process.env.AWS_S3_FOLDER}/` : '';
  return `${folder}${fileName}`;
}

function decodeBase64Image(imageData) {
  let base64String = imageData;
  let contentType = 'image/jpeg';
  
  if (imageData.startsWith('data:')) {
    const matches = imageData.match(/^data:([^;]+);base64,(.+)$/);
    if (matches) {
      contentType = matches[1];
      base64String = matches[2];
    } else {
      throw new Error('Invalid data URI format. Use: data:image/type;base64,<base64string>');
    }
  }
  
  const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  if (!allowedMimeTypes.includes(contentType)) {
    throw new Error(`Invalid image type: ${contentType}. Only JPEG, PNG, GIF, and WebP are allowed.`);
  }
  
  try {
    const buffer = Buffer.from(base64String, 'base64');
    return { buffer, contentType };
  } catch (error) {
    throw new Error('Invalid base64 string');
  }
}

async function downloadImageFromUrl(imageUrl) {
  const response = await fetch(imageUrl);
  if (!response.ok) {
    throw new Error(`Failed to fetch image: ${response.statusText}`);
  }
  
  const contentType = response.headers.get('content-type');
  const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  if (!allowedMimeTypes.includes(contentType)) {
    throw new Error(`Invalid image type: ${contentType}. Only JPEG, PNG, GIF, and WebP are allowed.`);
  }
  
  const buffer = await response.buffer();
  return { buffer, contentType };
}

// ============================================
// AWS S3 Configuration
// ============================================

// Configure proxy support (optional)
const proxyUrl = process.env.HTTPS_PROXY || process.env.HTTP_PROXY || process.env.https_proxy || process.env.http_proxy;
const s3Config = {
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
};

// Add proxy agent if proxy is configured
if (proxyUrl) {
  console.log(`🔌 Proxy detected: ${proxyUrl}`);
  const proxyAgent = new HttpsProxyAgent(proxyUrl);
  s3Config.requestHandler = new NodeHttpHandler({
    httpsAgent: proxyAgent
  });
}

const s3Client = new S3Client(s3Config);

const storage = multer.memoryStorage();

// ============================================
// Express Configuration
// ============================================

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// ============================================
// Routes
// ============================================

// Health check
app.get('/', (req, res) => {
  res.json({ 
    message: 'Image Upload API is running',
    endpoints: {
      upload: 'POST /upload - Upload an image (3 modes)',
      status: 'GET /status - API status',
      'generate-url': 'GET /generate-url?fileName=<name> - Generate S3 URL'
    }
  });
});

// API Status
app.get('/status', (req, res) => {
  res.json({
    status: 'online',
    bucket: process.env.AWS_S3_BUCKET_NAME,
    region: process.env.AWS_REGION,
    folder: process.env.AWS_S3_FOLDER || 'root'
  });
});

// Generate URL without uploading
app.get('/generate-url', (req, res) => {
  try {
    const { fileName } = req.query;
    
    if (!fileName) {
      return res.status(400).json({ error: 'fileName query parameter is required' });
    }

    const url = generateImageUrl(fileName);
    const s3Key = buildS3Key(fileName);

    res.json({
      fileName,
      s3Key,
      url,
      bucket: process.env.AWS_S3_BUCKET_NAME,
      region: process.env.AWS_REGION,
      folder: process.env.AWS_S3_FOLDER || 'root'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Upload endpoint - 3 modes
const uploadWithFields = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPEG, PNG, GIF, and WebP images are allowed.'));
    }
  },
});

app.post('/upload', uploadWithFields.single('image'), async (req, res) => {
  try {
    let buffer, contentType, fileName;

    // Mode 1: Multipart file upload
    if (req.file) {
      buffer = req.file.buffer;
      contentType = req.file.mimetype;
      const originalFileName = req.file.originalname;
      const customFileName = req.body?.fileName;
      
      if (customFileName) {
        fileName = customFileName;
      } else {
        const uniqueId = uuidv4();
        const fileExtension = path.extname(originalFileName);
        fileName = `${uniqueId}${fileExtension}`;
      }

      const s3Key = buildS3Key(fileName);
      const uploadParams = {
        Bucket: process.env.AWS_S3_BUCKET_NAME,
        Key: s3Key,
        Body: buffer,
        ContentType: contentType,
      };

      await s3Client.send(new PutObjectCommand(uploadParams));
      const imageUrl = generateImageUrl(fileName);

      return res.status(200).json({
        message: 'Image uploaded successfully',
        url: imageUrl,
        fileName,
        s3Key,
        source: 'multipart-upload'
      });
    }
    
    // Mode 2: JSON with base64
    if (req.body?.image) {
      const { buffer: b64Buffer, contentType: b64ContentType } = decodeBase64Image(req.body.image);
      buffer = b64Buffer;
      contentType = b64ContentType;

      if (req.body?.fileName) {
        fileName = req.body.fileName;
      } else {
        const uniqueId = uuidv4();
        const ext = contentType === 'image/jpeg' ? '.jpg' : 
                    contentType === 'image/png' ? '.png' :
                    contentType === 'image/gif' ? '.gif' : '.webp';
        fileName = `${uniqueId}${ext}`;
      }
    }
    // Mode 3: JSON with imageUrl
    else if (req.body?.imageUrl) {
      const { buffer: urlBuffer, contentType: urlContentType } = await downloadImageFromUrl(req.body.imageUrl);
      buffer = urlBuffer;
      contentType = urlContentType;

      if (req.body?.fileName) {
        fileName = req.body.fileName;
      } else {
        const uniqueId = uuidv4();
        fileName = `${uniqueId}.jpg`;
      }
    }
    // No valid input
    else {
      return res.status(400).json({ 
        error: 'No image provided',
        supported_modes: [
          'multipart/form-data with "image" file',
          'JSON with "image" (base64 or data URI)',
          'JSON with "imageUrl"'
        ]
      });
    }

    // Upload to S3
    const s3Key = buildS3Key(fileName);
    const uploadParams = {
      Bucket: process.env.AWS_S3_BUCKET_NAME,
      Key: s3Key,
      Body: buffer,
      ContentType: contentType,
    };

    await s3Client.send(new PutObjectCommand(uploadParams));
    const imageUrl = generateImageUrl(fileName);

    res.status(200).json({
      message: 'Image uploaded successfully',
      url: imageUrl,
      fileName,
      s3Key,
      source: req.body?.image ? 'base64-upload' : 'url-upload'
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ 
      error: 'Failed to upload image',
      details: error.message 
    });
  }
});

// Error handling
app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'File size exceeds 5MB limit' });
    }
    return res.status(400).json({ error: err.message });
  }
  
  if (err) {
    return res.status(400).json({ error: err.message });
  }
  
  next();
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Image Upload API running on http://localhost:${PORT}`);
  console.log(`📤 POST /upload - Upload images (3 modes)`);
  console.log(`📝 GET /status - API status`);
  console.log(`🔗 GET /generate-url?fileName=<name> - Generate S3 URL`);
});
