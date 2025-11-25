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
 * Décode une image base64 ou data URI
 */
function decodeBase64Image(imageData) {
  // Handle data URI format: data:image/jpeg;base64,/9j/4AAQSkZJRg...
  let base64String = imageData;
  let contentType = 'image/jpeg'; // default
  
  if (imageData.startsWith('data:')) {
    const matches = imageData.match(/^data:([^;]+);base64,(.+)$/);
    if (matches) {
      contentType = matches[1];
      base64String = matches[2];
    } else {
      throw new Error('Invalid data URI format. Use: data:image/type;base64,<base64string>');
    }
  }
  
  // Validate MIME type
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

/**
 * Décode une image base64 ou data URI
 */
function decodeBase64Image(imageData) {
  // Handle data URI format: data:image/jpeg;base64,/9j/4AAQSkZJRg...
  let base64String = imageData;
  let contentType = 'image/jpeg'; // default
  
  if (imageData.startsWith('data:')) {
    const matches = imageData.match(/^data:([^;]+);base64,(.+)$/);
    if (matches) {
      contentType = matches[1];
      base64String = matches[2];
    } else {
      throw new Error('Invalid data URI format. Use: data:image/type;base64,<base64string>');
    }
  }
  
  // Validate MIME type
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

// ============================================
// API Routes
// ============================================

// Health check endpoint
app.get('/', (req, res) => {
  res.json({ 
    message: 'Image Upload API is running',
    endpoints: {
      upload: 'POST /upload - Upload an image (3 modes: multipart, base64 JSON, or imageUrl)',
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

// Upload endpoint - supports both multipart (file + fields) and JSON (URL)
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// Configure multer to handle both files and fields
const uploadWithFields = multer({
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

app.post('/upload', uploadWithFields.single('image'), async (req, res) => {
  try {
    let buffer;
    let contentType;
    let fileName;

    // Mode 1: Multipart file upload
    if (req.file) {
      buffer = req.file.buffer;
      contentType = req.file.mimetype;
      const originalFileName = req.file.originalname;
      
      // Use custom fileName from fields if provided, otherwise generate UUID
      const customFileName = req.body?.fileName;
      
      if (customFileName) {
        fileName = customFileName;
      } else {
        // Generate unique ID for the image
        const uniqueId = uuidv4();
        const fileExtension = path.extname(originalFileName);
        fileName = `${uniqueId}${fileExtension}`;
      }
    }
    // Mode 2: JSON with base64 image
    else if (req.body?.image) {
      const { image, fileName: customFileName } = req.body;
      
      // Decode base64 image
      const { buffer: base64Buffer, contentType: base64ContentType } = decodeBase64Image(image);
      buffer = base64Buffer;
      contentType = base64ContentType;

      // Generate unique ID or use custom name
      if (customFileName) {
        fileName = customFileName;
      } else {
        const uniqueId = uuidv4();
        const fileExtension = contentType === 'image/jpeg' ? '.jpg' : 
                             contentType === 'image/png' ? '.png' :
                             contentType === 'image/gif' ? '.gif' : '.webp';
        fileName = `${uniqueId}${fileExtension}`;
      }
    }
    // Mode 3: JSON with imageUrl
    else if (req.body?.imageUrl) {
      const { imageUrl, fileName: customFileName } = req.body;
      
      // Download image from URL
      const { buffer: urlBuffer, contentType: urlContentType } = await downloadImageFromUrl(imageUrl);
      buffer = urlBuffer;
      contentType = urlContentType;

      // Generate unique ID or use custom name
      const uniqueId = customFileName || uuidv4();
      const fileExtension = customFileName ? (path.extname(customFileName) || '.jpg') : '.jpg';
      fileName = customFileName ? uniqueId : `${uniqueId}${fileExtension}`;
    }
    // Mode 4: No valid input
    else {
      return res.status(400).json({ 
        error: 'No image provided',
        supported_methods: [
          'multipart/form-data with "image" file and optional "fileName" field',
          'JSON with "image" (base64 or data URI) and optional "fileName"',
          'JSON with "imageUrl" and optional "fileName"'
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

    // Generate URL for the uploaded image
    const imageUrl = generateImageUrl(fileName);

    res.status(200).json({
      message: 'Image uploaded successfully',
      url: imageUrl,
      fileName: fileName,
      s3Key: s3Key,
      source: req.file ? 'multipart-upload' : (req.body?.image ? 'base64-upload' : 'url-upload')
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ 
      error: 'Failed to upload image',
      details: error.message 
    });
  }
});

// ============================================
// MCP JSON-RPC Endpoint (Claude Protocol)
// ============================================

/**
 * POST /_mcp - Handle Claude MCP protocol (JSON-RPC)
 */
app.post('/_mcp', async (req, res) => {
  try {
    const { jsonrpc, method, params, id } = req.body;

    if (jsonrpc !== '2.0') {
      return res.status(400).json({
        jsonrpc: '2.0',
        error: { code: -32600, message: 'Invalid Request' },
        id: id || null,
      });
    }

    let result;

    if (method === 'initialize') {
      result = {
        protocolVersion: '2024-11-05',
        capabilities: { tools: {} },
        serverInfo: {
          name: 'imgs3-mcp-server',
          version: '1.0.0',
        },
      };
    } else if (method === 'tools/list') {
      result = {
        tools: [
          {
            name: 'uploadImage',
            description: 'Upload une image vers S3 (depuis URL, base64 ou fichier)',
            inputSchema: {
              type: 'object',
              properties: {
                imageUrl: {
                  type: 'string',
                  description: 'URL publique de l\'image à télécharger',
                },
                image: {
                  type: 'string',
                  description: 'Image en base64 ou data URI (data:image/type;base64,...)',
                },
                fileName: {
                  type: 'string',
                  description: 'Nom du fichier personnalisé (optionnel, UUID si omis)',
                },
              },
            },
          },
          {
            name: 'getImageUrl',
            description: 'Génère l\'URL S3 d\'une image sans l\'uploader',
            inputSchema: {
              type: 'object',
              properties: {
                fileName: {
                  type: 'string',
                  description: 'Nom du fichier',
                },
              },
              required: ['fileName'],
            },
          },
          {
            name: 'getApiStatus',
            description: 'Vérifie le statut de l\'API',
            inputSchema: {
              type: 'object',
              properties: {},
            },
          },
        ],
      };
    } else if (method === 'tools/call') {
      const { name, arguments: args } = params;

      if (name === 'uploadImage') {
        const { imageUrl, image, fileName } = args;

        if (!imageUrl && !image) {
          return res.json({
            jsonrpc: '2.0',
            result: {
              content: [
                {
                  type: 'text',
                  text: 'Erreur: Veuillez fournir soit "imageUrl" soit "image"',
                },
              ],
              isError: true,
            },
            id,
          });
        }

        const uploadData = {
          ...(imageUrl && { imageUrl }),
          ...(image && { image }),
          ...(fileName && { fileName }),
        };

        // Call internal upload endpoint
        const uploadResponse = await fetch(`http://localhost:${PORT}/upload`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(uploadData),
        });

        const uploadResult = await uploadResponse.json();

        if (!uploadResponse.ok) {
          return res.json({
            jsonrpc: '2.0',
            result: {
              content: [
                {
                  type: 'text',
                  text: `Erreur d'upload: ${uploadResult.error || uploadResult.details}`,
                },
              ],
              isError: true,
            },
            id,
          });
        }

        result = {
          content: [
            {
              type: 'text',
              text: `Image uploadée avec succès!\nURL: ${uploadResult.url}\nNom: ${uploadResult.fileName}`,
            },
          ],
        };
      } else if (name === 'getImageUrl') {
        const { fileName } = args;

        if (!fileName) {
          return res.json({
            jsonrpc: '2.0',
            result: {
              content: [
                {
                  type: 'text',
                  text: 'Erreur: fileName est requis',
                },
              ],
              isError: true,
            },
            id,
          });
        }

        const urlResponse = await fetch(
          `http://localhost:${PORT}/mcp/generate-url?fileName=${encodeURIComponent(fileName)}`
        );
        const urlResult = await urlResponse.json();

        if (!urlResponse.ok) {
          return res.json({
            jsonrpc: '2.0',
            result: {
              content: [
                {
                  type: 'text',
                  text: `Erreur: ${urlResult.error}`,
                },
              ],
              isError: true,
            },
            id,
          });
        }

        result = {
          content: [
            {
              type: 'text',
              text: `URL S3: ${urlResult.url}\nClé S3: ${urlResult.s3Key}`,
            },
          ],
        };
      } else if (name === 'getApiStatus') {
        const statusResponse = await fetch(`http://localhost:${PORT}/mcp/status`);
        const statusResult = await statusResponse.json();

        if (!statusResponse.ok) {
          return res.json({
            jsonrpc: '2.0',
            result: {
              content: [
                {
                  type: 'text',
                  text: 'Erreur: Impossible de contacter l\'API',
                },
              ],
              isError: true,
            },
            id,
          });
        }

        result = {
          content: [
            {
              type: 'text',
              text: `API Status: ${statusResult.status}\nBucket: ${statusResult.bucket}\nRégion: ${statusResult.region}`,
            },
          ],
        };
      } else {
        return res.json({
          jsonrpc: '2.0',
          error: { code: -32601, message: `Outil inconnu: ${name}` },
          id,
        });
      }
    } else {
      return res.json({
        jsonrpc: '2.0',
        error: { code: -32601, message: `Méthode inconnue: ${method}` },
        id,
      });
    }

    res.json({
      jsonrpc: '2.0',
      result,
      id,
    });
  } catch (error) {
    console.error('MCP error:', error);
    res.json({
      jsonrpc: '2.0',
      error: { code: -32700, message: 'Parse error' },
      id: req.body?.id || null,
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
