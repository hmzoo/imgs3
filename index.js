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
const API_TOKEN = process.env.API_TOKEN;
const REQUIRE_AUTH = process.env.REQUIRE_AUTH !== 'false';

// ============================================
// Middleware
// ============================================

// API Token Authentication Middleware
function authenticateToken(req, res, next) {
  // Skip auth for health check endpoint
  if (req.path === '/' && req.method === 'GET') {
    return next();
  }

  if (!REQUIRE_AUTH) {
    return next();
  }

  if (!API_TOKEN) {
    console.warn('⚠️  API_TOKEN not configured but REQUIRE_AUTH=true. Authentication disabled.');
    return next();
  }

  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1]; // Extract token from "Bearer <token>"

  if (!token) {
    return res.status(401).json({ 
      error: 'Unauthorized',
      message: 'API token is required. Use "Authorization: Bearer <token>" header'
    });
  }

  if (token !== API_TOKEN) {
    return res.status(403).json({ 
      error: 'Forbidden',
      message: 'Invalid API token'
    });
  }

  next();
}

// ============================================
// Helper Functions
// ============================================

function generateMediaUrl(fileName) {
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

function isAllowedMediaType(contentType) {
  const allowedMimeTypes = [
    // Images
    'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml',
    // Videos
    'video/mp4', 'video/webm', 'video/ogg', 'video/quicktime', 'video/x-msvideo', 'video/x-matroska'
  ];
  return allowedMimeTypes.includes(contentType);
}

function decodeBase64Media(mediaData) {
  let base64String = mediaData;
  let contentType = 'image/jpeg';
  
  if (mediaData.startsWith('data:')) {
    const matches = mediaData.match(/^data:([^;]+);base64,(.+)$/);
    if (matches) {
      contentType = matches[1];
      base64String = matches[2];
    } else {
      throw new Error('Invalid data URI format. Use: data:type/subtype;base64,<base64string>');
    }
  }
  
  if (!isAllowedMediaType(contentType)) {
    const supportedTypes = [
      'Images: JPEG, PNG, GIF, WebP, SVG',
      'Videos: MP4, WebM, OGG, MOV, AVI, MKV'
    ].join(', ');
    throw new Error(`Invalid media type: ${contentType}. Supported: ${supportedTypes}`);
  }
  
  try {
    const buffer = Buffer.from(base64String, 'base64');
    return { buffer, contentType };
  } catch (error) {
    throw new Error('Invalid base64 string');
  }
}

async function downloadMediaFromUrl(mediaUrl) {
  const response = await fetch(mediaUrl);
  if (!response.ok) {
    throw new Error(`Failed to fetch media: ${response.statusText}`);
  }
  
  const contentType = response.headers.get('content-type');
  if (!isAllowedMediaType(contentType)) {
    const supportedTypes = [
      'Images: JPEG, PNG, GIF, WebP, SVG',
      'Videos: MP4, WebM, OGG, MOV, AVI, MKV'
    ].join(', ');
    throw new Error(`Invalid media type: ${contentType}. Supported: ${supportedTypes}`);
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

app.use(express.json({ limit: '500mb' }));
app.use(express.urlencoded({ limit: '500mb', extended: true }));

// Apply authentication middleware to all routes except health check
app.use(authenticateToken);

// ============================================
// Routes
// ============================================

// Health check
app.get('/', (req, res) => {
  res.json({ 
    message: 'Media Upload API is running (images & videos)',
    supported_types: {
      images: ['JPEG', 'PNG', 'GIF', 'WebP', 'SVG'],
      videos: ['MP4', 'WebM', 'OGG', 'MOV', 'AVI', 'MKV']
    },
    endpoints: {
      upload: 'POST /upload - Upload media (3 modes)',
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

    const url = generateMediaUrl(fileName);
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
  limits: { fileSize: 500 * 1024 * 1024 }, // 500MB limit for video support
  fileFilter: (req, file, cb) => {
    if (isAllowedMediaType(file.mimetype)) {
      cb(null, true);
    } else {
      const supportedTypes = [
        'Images: JPEG, PNG, GIF, WebP, SVG',
        'Videos: MP4, WebM, OGG, MOV, AVI, MKV'
      ].join(', ');
      cb(new Error(`Invalid file type. Supported: ${supportedTypes}`));
    }
  },
});

// Upload endpoint - supports 3 modes
app.post('/upload', uploadWithFields.single('media'), async (req, res) => {
  try {
    let buffer, contentType, fileName;

    // Mode 1: Multipart file upload
    const file = req.file;
    if (file) {
      buffer = file.buffer;
      contentType = file.mimetype;
      const originalFileName = file.originalname;
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
      const mediaUrl = generateMediaUrl(fileName);

      return res.status(200).json({
        message: 'Media uploaded successfully',
        url: mediaUrl,
        fileName,
        s3Key,
        contentType,
        source: 'multipart-upload'
      });
    }
    
    // Mode 2: JSON with base64
    if (req.body?.mediaData) {
      const { buffer: b64Buffer, contentType: b64ContentType } = decodeBase64Media(req.body.mediaData);
      buffer = b64Buffer;
      contentType = b64ContentType;

      if (req.body?.fileName) {
        fileName = req.body.fileName;
      } else {
        const uniqueId = uuidv4();
        const ext = contentType === 'image/jpeg' ? '.jpg' : 
                    contentType === 'image/png' ? '.png' :
                    contentType === 'image/gif' ? '.gif' :
                    contentType === 'image/webp' ? '.webp' :
                    contentType === 'video/mp4' ? '.mp4' :
                    contentType === 'video/webm' ? '.webm' :
                    contentType === 'video/ogg' ? '.ogg' :
                    contentType === 'video/quicktime' ? '.mov' :
                    contentType === 'video/x-msvideo' ? '.avi' :
                    contentType === 'video/x-matroska' ? '.mkv' : '.bin';
        fileName = `${uniqueId}${ext}`;
      }
    }
    // Mode 3: JSON with mediaUrl
    else if (req.body?.mediaUrl) {
      const url = req.body.mediaUrl;
      const { buffer: urlBuffer, contentType: urlContentType } = await downloadMediaFromUrl(url);
      buffer = urlBuffer;
      contentType = urlContentType;

      if (req.body?.fileName) {
        fileName = req.body.fileName;
      } else {
        const uniqueId = uuidv4();
        const ext = contentType === 'image/jpeg' ? '.jpg' : 
                    contentType === 'image/png' ? '.png' :
                    contentType === 'image/gif' ? '.gif' :
                    contentType === 'image/webp' ? '.webp' :
                    contentType === 'video/mp4' ? '.mp4' :
                    contentType === 'video/webm' ? '.webm' :
                    contentType === 'video/ogg' ? '.ogg' :
                    contentType === 'video/quicktime' ? '.mov' :
                    contentType === 'video/x-msvideo' ? '.avi' :
                    contentType === 'video/x-matroska' ? '.mkv' : '.bin';
        fileName = `${uniqueId}${ext}`;
      }
    }
    // No valid input
    else {
      return res.status(400).json({ 
        error: 'No media provided',
        supported_modes: [
          'multipart/form-data with "image" file',
          'JSON with "image" (base64 or data URI)',
          'JSON with "mediaUrl"'
        ],
        supported_types: {
          images: ['JPEG', 'PNG', 'GIF', 'WebP', 'SVG'],
          videos: ['MP4', 'WebM', 'OGG', 'MOV', 'AVI', 'MKV']
        }
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
    const mediaUrl = generateMediaUrl(fileName);

    res.status(200).json({
      message: 'Media uploaded successfully',
      url: mediaUrl,
      fileName,
      s3Key,
      contentType,
      source: req.body?.image ? 'base64-upload' : 'url-upload'
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ 
      error: 'Failed to upload media',
      details: error.message 
    });
  }
});

// Error handling
app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'File size exceeds 500MB limit' });
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
  console.log(`🚀 Media Upload API running on http://localhost:${PORT}`);
  console.log(`📤 POST /upload - Upload media: images (JPEG, PNG, GIF, WebP, SVG) & videos (MP4, WebM, OGG, MOV, AVI, MKV)`);
  console.log(`📝 GET /status - API status`);
  console.log(`🔗 GET /generate-url?fileName=<name> - Generate S3 URL`);
  console.log('');
  console.log(`📦 File size limit: 500MB`);
  console.log(`📍 Storage bucket: ${process.env.AWS_S3_BUCKET_NAME} (${process.env.AWS_REGION})`);
  console.log('');
  
  if (REQUIRE_AUTH) {
    if (API_TOKEN) {
      console.log(`🔒 Authentication enabled`);
      console.log(`   Add header: Authorization: Bearer ${API_TOKEN.substring(0, 8)}...`);
    } else {
      console.log(`⚠️  REQUIRE_AUTH=true but API_TOKEN not configured`);
      console.log(`   Set API_TOKEN environment variable to enable authentication`);
    }
  } else {
    console.log(`🔓 Authentication disabled`);
  }
});
