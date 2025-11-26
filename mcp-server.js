#!/usr/bin/env node

/**
 * MCP Server - Standalone Media Upload Server (Images & Videos)
 * Uses stdio transport (stdin/stdout)
 * Run with: node mcp-server.js
 * 
 * Configuration:
 * - Set MCP_API_BASE_URL in .env file
 * - Default: http://localhost:3000
 * - For production: use your Vercel API URL
 *
 * Supported media types:
 * - Images: JPEG, PNG, GIF, WebP, SVG
 * - Videos: MP4, WebM, OGG, MOV, AVI, MKV
 */

require('dotenv').config();
const fetch = require('node-fetch');

// ============================================
// Configuration
// ============================================

const API_BASE_URL = process.env.MCP_API_BASE_URL || 'http://localhost:3000';
const API_TOKEN = process.env.API_TOKEN;
const REQUIRE_AUTH = process.env.REQUIRE_AUTH !== 'false';

// Helper function to add authorization header
function getHeaders() {
  const headers = {
    'Content-Type': 'application/json'
  };
  
  if (API_TOKEN && REQUIRE_AUTH) {
    headers['Authorization'] = `Bearer ${API_TOKEN}`;
  }
  
  return headers;
}
const TOOLS = [
  {
    name: 'uploadMedia',
    description: 'Upload media (images or videos) to S3. Supports 3 modes: multipart file, base64 data, or URL. Images: JPEG, PNG, GIF, WebP, SVG. Videos: MP4, WebM, OGG, MOV, AVI, MKV.',
    inputSchema: {
      type: 'object',
      properties: {
        mode: {
          type: 'string',
          enum: ['base64', 'url'],
          description: 'Upload mode: base64 for Base64 data, url for media URL'
        },
        image: {
          type: 'string',
          description: 'Base64 media data or data URI (for base64 mode)'
        },
        mediaUrl: {
          type: 'string',
          description: 'Media URL to download (for url mode)'
        },
        fileName: {
          type: 'string',
          description: 'Optional custom file name'
        }
      },
      required: ['mode']
    }
  },
  {
    name: 'getMediaUrl',
    description: 'Generate an S3 URL for media (image or video) without uploading',
    inputSchema: {
      type: 'object',
      properties: {
        fileName: {
          type: 'string',
          description: 'The file name to generate URL for'
        }
      },
      required: ['fileName']
    }
  },
  {
    name: 'getApiStatus',
    description: 'Get the API status and configuration',
    inputSchema: {
      type: 'object',
      properties: {},
      required: []
    }
  }
];

// ============================================
// MCP Protocol Handlers
// ============================================

async function handleInitialize(params) {
  return {
    protocolVersion: '2024-11-05',
    capabilities: {
      tools: {}
    },
    serverInfo: {
      name: 'Media Upload MCP Server (Images & Videos)',
      version: '1.0.0'
    }
  };
}

async function handleListTools(params) {
  return {
    tools: TOOLS
  };
}

async function handleCallTool(params) {
  const { name, arguments: args } = params;

  try {
    switch (name) {
      case 'uploadMedia':
        return await uploadMedia(args);
      case 'getMediaUrl':
        return await getMediaUrl(args);
      case 'getApiStatus':
        return await getApiStatus(args);
      default:
        return {
          isError: true,
          content: [
            {
              type: 'text',
              text: `Unknown tool: ${name}`
            }
          ]
        };
    }
  } catch (error) {
    return {
      isError: true,
      content: [
        {
          type: 'text',
          text: `Error calling tool ${name}: ${error.message}`
        }
      ]
    };
  }
}

// ============================================
// Tool Implementations
// ============================================

async function uploadMedia(args) {
  const { mode, image, mediaUrl, fileName } = args;

  if (!mode) {
    return {
      isError: true,
      content: [
        {
          type: 'text',
          text: 'Error: mode is required (base64 or url)'
        }
      ]
    };
  }

  try {
    const body = {};

    if (mode === 'base64') {
      if (!image) {
        return {
          isError: true,
          content: [
            {
              type: 'text',
              text: 'Error: image is required for base64 mode'
            }
          ]
        };
      }
      body.mediaData = image;
    } else if (mode === 'url') {
      if (!mediaUrl) {
        return {
          isError: true,
          content: [
            {
              type: 'text',
              text: 'Error: mediaUrl is required for url mode'
            }
          ]
        };
      }
      body.mediaUrl = mediaUrl;
    } else {
      return {
        isError: true,
        content: [
          {
            type: 'text',
            text: `Error: invalid mode "${mode}". Use "base64" or "url"`
          }
        ]
      };
    }

    if (fileName) {
      body.fileName = fileName;
    }

    const response = await fetch(`${API_BASE_URL}/upload`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      const error = await response.json();
      return {
        isError: true,
        content: [
          {
            type: 'text',
            text: `Upload failed: ${error.error || response.statusText}`
          }
        ]
      };
    }

    const result = await response.json();
    return {
      isError: false,
      content: [
        {
          type: 'text',
          text: JSON.stringify(result, null, 2)
        }
      ]
    };
  } catch (error) {
    return {
      isError: true,
      content: [
        {
          type: 'text',
          text: `Upload error: ${error.message}`
        }
      ]
    };
  }
}

async function getMediaUrl(args) {
  const { fileName } = args;

  if (!fileName) {
    return {
      isError: true,
      content: [
        {
          type: 'text',
          text: 'Error: fileName is required'
        }
      ]
    };
  }

  try {
    const response = await fetch(
      `${API_BASE_URL}/generate-url?fileName=${encodeURIComponent(fileName)}`,
      {
        headers: getHeaders()
      }
    );

    if (!response.ok) {
      const error = await response.json();
      return {
        isError: true,
        content: [
          {
            type: 'text',
            text: `Failed to generate URL: ${error.error || response.statusText}`
          }
        ]
      };
    }

    const result = await response.json();
    return {
      isError: false,
      content: [
        {
          type: 'text',
          text: JSON.stringify(result, null, 2)
        }
      ]
    };
  } catch (error) {
    return {
      isError: true,
      content: [
        {
          type: 'text',
          text: `Error: ${error.message}`
        }
      ]
    };
  }
}

async function getApiStatus(args) {
  try {
    const response = await fetch(`${API_BASE_URL}/status`, {
      headers: getHeaders()
    });

    if (!response.ok) {
      return {
        isError: true,
        content: [
          {
            type: 'text',
            text: `API not responding: ${response.statusText}`
          }
        ]
      };
    }

    const result = await response.json();
    return {
      isError: false,
      content: [
        {
          type: 'text',
          text: JSON.stringify(result, null, 2)
        }
      ]
    };
  } catch (error) {
    return {
      isError: true,
      content: [
        {
          type: 'text',
          text: `Failed to get API status: ${error.message}`
        }
      ]
    };
  }
}

// ============================================
// MCP JSON-RPC Protocol Implementation
// ============================================

let requestId = 0;

function createResponse(id, result) {
  return {
    jsonrpc: '2.0',
    id,
    result
  };
}

function createError(id, code, message) {
  return {
    jsonrpc: '2.0',
    id,
    error: {
      code,
      message
    }
  };
}

async function handleRequest(request) {
  const { jsonrpc, id, method, params } = request;

  if (jsonrpc !== '2.0') {
    return createError(id, -32600, 'Invalid JSON-RPC version');
  }

  try {
    switch (method) {
      case 'initialize':
        return createResponse(id, await handleInitialize(params));

      case 'tools/list':
        return createResponse(id, await handleListTools(params));

      case 'tools/call':
        return createResponse(id, await handleCallTool(params));

      default:
        return createError(id, -32601, `Method not found: ${method}`);
    }
  } catch (error) {
    console.error('Error handling request:', error);
    return createError(id, -32603, `Internal error: ${error.message}`);
  }
}

// ============================================
// Stdio Transport Handler
// ============================================

const readline = require('readline');
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  terminal: false
});

function writeResponse(response) {
  process.stdout.write(JSON.stringify(response) + '\n');
}

rl.on('line', async (line) => {
  try {
    const request = JSON.parse(line);
    const response = await handleRequest(request);
    writeResponse(response);
  } catch (error) {
    console.error('Parse error:', error.message);
    writeResponse({
      jsonrpc: '2.0',
      error: {
        code: -32700,
        message: 'Parse error'
      }
    });
  }
});

rl.on('close', () => {
  process.exit(0);
});

// Handle errors gracefully
process.on('uncaughtException', (error) => {
  console.error('Uncaught exception:', error);
  process.exit(1);
});

// Log startup info to stderr (not interfering with stdout)
console.error(`🚀 MCP Server started (Media Upload - Images & Videos)`);
console.error(`📡 Listening on stdio transport`);
console.error(`🔗 API Base URL: ${API_BASE_URL}`);
console.error(`📝 Ready to handle MCP requests`);
console.error(`📦 Supported media types:`);
console.error(`   Images: JPEG, PNG, GIF, WebP, SVG`);
console.error(`   Videos: MP4, WebM, OGG, MOV, AVI, MKV`);

if (REQUIRE_AUTH) {
  if (API_TOKEN) {
    console.error(`🔒 Authentication enabled`);
    console.error(`   Token: ${API_TOKEN.substring(0, 8)}...`);
    console.error(`   All API calls include: Authorization: Bearer <token>`);
  } else {
    console.error(`⚠️  REQUIRE_AUTH=true but API_TOKEN not configured`);
    console.error(`   Set API_TOKEN in .env to enable authentication`);
  }
} else {
  console.error(`🔓 Authentication disabled (REQUIRE_AUTH=false)`);
}
