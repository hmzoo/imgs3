#!/usr/bin/env node

/**
 * MCP Server - Standalone Image Upload Server
 * Uses stdio transport (stdin/stdout)
 * Run with: node mcp-server.js
 * 
 * Configuration:
 * - Set MCP_API_BASE_URL in .env file
 * - Default: http://localhost:3000
 * - For production: use your Vercel API URL
 */

require('dotenv').config();
const fetch = require('node-fetch');

// ============================================
// Configuration
// ============================================

const API_BASE_URL = process.env.MCP_API_BASE_URL || 'http://localhost:3000';
const TOOLS = [
  {
    name: 'uploadImage',
    description: 'Upload an image to S3. Supports 3 modes: multipart file, base64 data, or URL.',
    inputSchema: {
      type: 'object',
      properties: {
        mode: {
          type: 'string',
          enum: ['base64', 'url'],
          description: 'Upload mode: base64 for Base64 data, url for image URL'
        },
        image: {
          type: 'string',
          description: 'Base64 image data or data URI (for base64 mode)'
        },
        imageUrl: {
          type: 'string',
          description: 'Image URL to download (for url mode)'
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
    name: 'getImageUrl',
    description: 'Generate an S3 URL for an image without uploading',
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
      name: 'Image Upload MCP Server',
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
      case 'uploadImage':
        return await uploadImage(args);
      case 'getImageUrl':
        return await getImageUrl(args);
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

async function uploadImage(args) {
  const { mode, image, imageUrl, fileName } = args;

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
      body.image = image;
    } else if (mode === 'url') {
      if (!imageUrl) {
        return {
          isError: true,
          content: [
            {
              type: 'text',
              text: 'Error: imageUrl is required for url mode'
            }
          ]
        };
      }
      body.imageUrl = imageUrl;
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
      headers: {
        'Content-Type': 'application/json'
      },
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

async function getImageUrl(args) {
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
      `${API_BASE_URL}/generate-url?fileName=${encodeURIComponent(fileName)}`
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
    const response = await fetch(`${API_BASE_URL}/status`);

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
console.error(`🚀 MCP Server started`);
console.error(`📡 Listening on stdio transport`);
console.error(`🔗 API Base URL: ${API_BASE_URL}`);
console.error(`📝 Ready to handle MCP requests`);
