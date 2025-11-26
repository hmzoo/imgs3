#!/usr/bin/env node

/**
 * S3 Media Manager - Node.js Application
 * Web interface to manage S3 bucket media with visualization and deletion
 * 
 * Usage:
 *   node s3-manager.js [--port 3003] [--bucket my-bucket]
 */

require('dotenv').config();
const express = require('express');
const { S3Client, ListObjectsV2Command, HeadObjectCommand, DeleteObjectCommand, DeleteObjectsCommand } = require('@aws-sdk/client-s3');
const { HttpsProxyAgent } = require('https-proxy-agent');
const { NodeHttpHandler } = require('@smithy/node-http-handler');
const path = require('path');

// Configuration
const PORT = process.env.S3_MANAGER_PORT || parseInt(process.argv.find(arg => arg.startsWith('--port'))?.split('=')[1]) || 3003;
const BUCKET = process.env.AWS_S3_BUCKET_NAME || 'hmzoo';
const FOLDER = process.env.AWS_S3_FOLDER || 'images';
const REGION = process.env.AWS_REGION || 'eu-west-1';

// Supported media types
const SUPPORTED_TYPES = {
  images: ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'],
  videos: ['video/mp4', 'video/webm', 'video/ogg', 'video/quicktime', 'video/x-msvideo', 'video/x-matroska']
};

// Initialize S3 Client with proxy support
const proxyUrl = process.env.HTTPS_PROXY || process.env.HTTP_PROXY || process.env.https_proxy || process.env.http_proxy;
const s3Config = {
  region: REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
  }
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

// Initialize Express app
const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 's3-manager-ui')));

// Helper: Check media type
function getMediaType(key) {
  const ext = path.extname(key).toLowerCase();
  const videoExts = ['.mp4', '.webm', '.ogg', '.mov', '.avi', '.mkv'];
  const imageExts = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'];
  
  if (videoExts.includes(ext)) return 'video';
  if (imageExts.includes(ext)) return 'image';
  return 'other';
}

// Helper: Format file size
function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

// Helper: Generate S3 URL
function getS3Url(key) {
  return `https://${BUCKET}.s3.${REGION}.amazonaws.com/${key}`;
}

// API: List all media files
app.get('/api/media', async (req, res) => {
  try {
    const command = new ListObjectsV2Command({
      Bucket: BUCKET,
      Prefix: FOLDER ? `${FOLDER}/` : ''
    });
    
    const response = await s3Client.send(command);
    const contents = response.Contents || [];
    
    const media = await Promise.all(
      contents.map(async (obj) => {
        const mediaType = getMediaType(obj.Key);
        
        return {
          key: obj.Key,
          name: path.basename(obj.Key),
          size: obj.Size,
          sizeFormatted: formatBytes(obj.Size),
          lastModified: obj.LastModified?.toISOString(),
          type: mediaType,
          url: getS3Url(obj.Key)
        };
      })
    );
    
    // Sort by last modified (newest first)
    media.sort((a, b) => new Date(b.lastModified) - new Date(a.lastModified));
    
    const stats = {
      total: media.length,
      images: media.filter(m => m.type === 'image').length,
      videos: media.filter(m => m.type === 'video').length,
      totalSize: media.reduce((sum, m) => sum + m.size, 0),
      totalSizeFormatted: formatBytes(media.reduce((sum, m) => sum + m.size, 0))
    };
    
    res.json({ media, stats });
  } catch (error) {
    console.error('Error listing media:', error);
    res.status(500).json({ error: error.message });
  }
});

// API: Delete single file
app.delete('/api/media', async (req, res) => {
  try {
    const { key } = req.body;
    
    if (!key) {
      return res.status(400).json({ error: 'No key provided' });
    }
    
    // Security: Ensure the key is within our folder
    if (FOLDER && !key.startsWith(FOLDER + '/')) {
      return res.status(403).json({ error: 'Access denied: key outside allowed folder' });
    }
    
    const command = new DeleteObjectCommand({
      Bucket: BUCKET,
      Key: key
    });
    
    await s3Client.send(command);
    res.json({ success: true, message: `Deleted: ${path.basename(key)}` });
  } catch (error) {
    console.error('Error deleting media:', error);
    res.status(500).json({ error: error.message });
  }
});

// API: Delete multiple files
app.post('/api/media/delete-batch', async (req, res) => {
  try {
    const { keys } = req.body;
    
    if (!Array.isArray(keys) || keys.length === 0) {
      return res.status(400).json({ error: 'No keys provided' });
    }
    
    // Security: Ensure all keys are within our folder
    const invalidKeys = keys.filter(k => FOLDER && !k.startsWith(FOLDER + '/'));
    if (invalidKeys.length > 0) {
      return res.status(403).json({ error: 'Access denied: some keys outside allowed folder' });
    }
    
    const command = new DeleteObjectsCommand({
      Bucket: BUCKET,
      Delete: {
        Objects: keys.map(key => ({ Key: key }))
      }
    });
    
    const result = await s3Client.send(command);
    res.json({ 
      success: true, 
      deleted: result.Deleted?.length || 0,
      message: `Deleted ${result.Deleted?.length || 0} file(s)`
    });
  } catch (error) {
    console.error('Error deleting batch:', error);
    res.status(500).json({ error: error.message });
  }
});

// API: Get app info
app.get('/api/info', (req, res) => {
  res.json({
    app: 'S3 Media Manager',
    version: '1.0',
    bucket: BUCKET,
    folder: FOLDER,
    region: REGION
  });
});

// Serve main page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 's3-manager-ui', 'index.html'));
});

// Error handling
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Start server
const server = app.listen(PORT, () => {
  console.log('\n╔════════════════════════════════════════╗');
  console.log('║   S3 Media Manager v1.0                ║');
  console.log('║   AWS S3 Bucket Media Management       ║');
  console.log('╚════════════════════════════════════════╝\n');
  console.log(`🚀 Server running at http://localhost:${PORT}`);
  console.log(`📦 Bucket: ${BUCKET}`);
  console.log(`📁 Folder: ${FOLDER || 'root'}`);
  console.log(`🌍 Region: ${REGION}`);
  console.log('\n✨ Press Ctrl+C to stop\n');
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n\n👋 Shutting down gracefully...');
  server.close(() => {
    console.log('✓ Server closed');
    process.exit(0);
  });
});

module.exports = app;
