require('dotenv').config();
const express = require('express');
const multer = require('multer');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const fetch = require('node-fetch');

const app = express();
const PORT = process.env.PORT || 3000;

// ============================================
// MCP Functions (Embedded)
// ============================================

/**
 * Génère l'URL S3 d'une image
 */
function generateImageUrl(fileName) {
  const bucket = process.env.AWS_S3_BUCKET_NAME;
  const region = process.env.AWS_REGION;
  const folder = process.env.AWS_S3_FOLDER || '';
  const s3Key = folder ? `${folder}/${fileName}` : fileName;
  return `https://${bucket}.s3.${region}.amazonaws.com/${s3Key}`;
}

/**
 * Construit la clé S3 avec dossier
 */
function buildS3Key(fileName) {
  const folder = process.env.AWS_S3_FOLDER ? `${process.env.AWS_S3_FOLDER}/` : '';
  return `${folder}${fileName}`;
}

/**
 * Télécharge une image depuis une URL
 */
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

// Configure AWS S3 Client
const s3Client = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

// Configure multer for memory storage
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    // Accept only image files
    const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPEG, PNG, GIF, and WebP images are allowed.'));
    }
  },
});

// ============================================
// API Routes
// ============================================

// Health check endpoint
app.get('/', (req, res) => {
  res.json({ 
    message: 'Image Upload API is running',
    endpoints: {
      upload: 'POST /upload - Upload an image to S3 (multipart/form-data or JSON with imageUrl)',
      'mcp-tools': 'GET /mcp/tools - Get available MCP tools',
      'mcp-status': 'GET /mcp/status - Get API status',
      'mcp-generate-url': 'GET /mcp/generate-url?fileName=<name> - Generate image URL'
    },
    mcp: {
      enabled: true,
      version: '1.0.0',
      tools: ['uploadImage', 'getImageUrl', 'getApiStatus']
    }
  });
});

// MCP Endpoints

/**
 * GET /mcp/tools - Liste les outils MCP disponibles
 */
app.get('/mcp/tools', (req, res) => {
  res.json({
    tools: [
      {
        name: 'uploadImage',
        description: 'Upload une image vers S3 (depuis URL)',
        inputSchema: {
          type: 'object',
          properties: {
            imageUrl: { type: 'string', description: 'URL de l\'image à télécharger' },
            fileName: { type: 'string', description: 'Nom du fichier (optionnel, auto-généré)' }
          },
          required: ['imageUrl']
        }
      },
      {
        name: 'getImageUrl',
        description: 'Génère l\'URL S3 d\'une image',
        inputSchema: {
          type: 'object',
          properties: {
            fileName: { type: 'string', description: 'Nom du fichier' }
          },
          required: ['fileName']
        }
      },
      {
        name: 'getApiStatus',
        description: 'Vérifie le statut de l\'API',
        inputSchema: {
          type: 'object',
          properties: {}
        }
      }
    ]
  });
});

/**
 * GET /mcp/status - Statut de l'API
 */
app.get('/mcp/status', (req, res) => {
  res.json({
    success: true,
    status: 'online',
    message: 'Image Upload API is running',
    bucket: process.env.AWS_S3_BUCKET_NAME,
    region: process.env.AWS_REGION,
    folder: process.env.AWS_S3_FOLDER || 'root',
    timestamp: new Date().toISOString()
  });
});

/**
 * GET /mcp/generate-url - Génère une URL S3
 */
app.get('/mcp/generate-url', (req, res) => {
  try {
    const { fileName } = req.query;
    
    if (!fileName) {
      return res.status(400).json({
        success: false,
        error: 'fileName query parameter is required'
      });
    }

    const url = generateImageUrl(fileName);
    const s3Key = buildS3Key(fileName);

    res.json({
      success: true,
      fileName,
      s3Key,
      url,
      bucket: process.env.AWS_S3_BUCKET_NAME,
      region: process.env.AWS_REGION,
      folder: process.env.AWS_S3_FOLDER || 'root'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Upload endpoint - supports both multipart (file) and JSON (URL)
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

app.post('/upload', async (req, res) => {
  try {
    let buffer;
    let contentType;
    let originalFileName = null;

    // Check if it's a multipart file upload
    if (req.headers['content-type']?.includes('multipart/form-data')) {
      // Use multer for file upload
      return upload.single('image')(req, res, async (err) => {
        if (err) {
          return res.status(400).json({ error: err.message });
        }
        
        if (!req.file) {
          return res.status(400).json({ error: 'No image file provided' });
        }

        try {
          buffer = req.file.buffer;
          contentType = req.file.mimetype;
          originalFileName = req.file.originalname;
          
          // Generate unique ID for the image
          const uniqueId = uuidv4();
          const fileExtension = path.extname(originalFileName);
          const fileName = `${uniqueId}${fileExtension}`;
          
          // Build S3 key with folder prefix
          const s3Key = buildS3Key(fileName);

          // Upload to S3
          const uploadParams = {
            Bucket: process.env.AWS_S3_BUCKET_NAME,
            Key: s3Key,
            Body: buffer,
            ContentType: contentType,
          };

          await s3Client.send(new PutObjectCommand(uploadParams));

          // Generate URL for the uploaded image
          const imageUrl = generateImageUrl(fileName);

          res.status(200).json({
            message: 'Image uploaded successfully',
            url: imageUrl,
            fileName: fileName,
            s3Key: s3Key,
            source: 'multipart-upload'
          });
        } catch (error) {
          console.error('Upload error:', error);
          res.status(500).json({ 
            error: 'Failed to upload image',
            details: error.message 
          });
        }
      });
    }

    // Check if it's a URL-based upload (JSON body)
    const { imageUrl, fileName: customFileName } = req.body;
    
    if (imageUrl) {
      // Download image from URL
      const { buffer: urlBuffer, contentType: urlContentType } = await downloadImageFromUrl(imageUrl);
      buffer = urlBuffer;
      contentType = urlContentType;

      // Generate unique ID or use custom name
      const uniqueId = customFileName || uuidv4();
      const fileExtension = customFileName ? (path.extname(customFileName) || '.jpg') : '.jpg';
      const fileName = customFileName ? uniqueId : `${uniqueId}${fileExtension}`;
      
      // Build S3 key with folder prefix
      const s3Key = buildS3Key(fileName);

      // Upload to S3
      const uploadParams = {
        Bucket: process.env.AWS_S3_BUCKET_NAME,
        Key: s3Key,
        Body: buffer,
        ContentType: contentType,
      };

      await s3Client.send(new PutObjectCommand(uploadParams));

      // Generate URL for the uploaded image
      const resultUrl = generateImageUrl(fileName);

      res.status(200).json({
        message: 'Image uploaded successfully from URL',
        url: resultUrl,
        fileName: fileName,
        s3Key: s3Key,
        source: 'url-upload',
        sourceUrl: imageUrl
      });
    } else {
      return res.status(400).json({ 
        error: 'No image provided',
        supported_methods: [
          'multipart/form-data with field "image"',
          'JSON with field "imageUrl" and optional "fileName"'
        ]
      });
    }
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ 
      error: 'Failed to upload image',
      details: error.message 
    });
  }
});

// Error handling middleware
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
  console.log(`Server is running on port ${PORT}`);
  console.log(`Upload images to: http://localhost:${PORT}/upload`);
});
