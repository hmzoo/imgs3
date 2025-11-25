#!/usr/bin/env node
/**
 * Claude MCP Server - Exposes Image Upload API as MCP tools
 * This server implements the Model Context Protocol for Claude
 */

const http = require('http');
const fetch = require('node-fetch');

// Configuration
const API_BASE_URL = process.env.API_URL || 'http://localhost:3000';
const PORT = process.env.MCP_PORT || 3001;

let requestId = 0;

/**
 * Send a JSON-RPC response
 */
function sendResponse(res, result = null, error = null, id = null) {
  const response = {
    jsonrpc: '2.0',
  };
  
  if (error) {
    response.error = error;
  } else {
    response.result = result;
  }
  
  if (id !== null) {
    response.id = id;
  }
  
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(response));
}

/**
 * Handle MCP initialize request
 */
function handleInitialize(id) {
  return {
    protocolVersion: '2024-11-05',
    capabilities: {
      tools: {},
    },
    serverInfo: {
      name: 'imgs3-mcp-server',
      version: '1.0.0',
    },
  };
}

/**
 * Handle MCP tools/list request
 */
function handleToolsList(id) {
  return {
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
          required: [],
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
}

/**
 * Handle MCP tools/call request
 */
async function handleToolCall(request, id) {
  const { name, arguments: args } = request.params;

  try {
    if (name === 'uploadImage') {
      const { imageUrl, image, fileName } = args;

      if (!imageUrl && !image) {
        return {
          content: [
            {
              type: 'text',
              text: 'Erreur: Veuillez fournir soit "imageUrl" soit "image"',
            },
          ],
          isError: true,
        };
      }

      const uploadData = {
        ...(imageUrl && { imageUrl }),
        ...(image && { image }),
        ...(fileName && { fileName }),
      };

      const response = await fetch(`${API_BASE_URL}/upload`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(uploadData),
      });

      const result = await response.json();

      if (!response.ok) {
        return {
          content: [
            {
              type: 'text',
              text: `Erreur d'upload: ${result.error || result.details}`,
            },
          ],
          isError: true,
        };
      }

      return {
        content: [
          {
            type: 'text',
            text: `Image uploadée avec succès!\nURL: ${result.url}\nNom: ${result.fileName}`,
          },
        ],
      };
    } else if (name === 'getImageUrl') {
      const { fileName } = args;

      if (!fileName) {
        return {
          content: [
            {
              type: 'text',
              text: 'Erreur: fileName est requis',
            },
          ],
          isError: true,
        };
      }

      const response = await fetch(
        `${API_BASE_URL}/mcp/generate-url?fileName=${encodeURIComponent(fileName)}`
      );
      const result = await response.json();

      if (!response.ok) {
        return {
          content: [
            {
              type: 'text',
              text: `Erreur: ${result.error}`,
            },
          ],
          isError: true,
        };
      }

      return {
        content: [
          {
            type: 'text',
            text: `URL S3: ${result.url}\nClé S3: ${result.s3Key}`,
          },
        ],
      };
    } else if (name === 'getApiStatus') {
      const response = await fetch(`${API_BASE_URL}/mcp/status`);
      const result = await response.json();

      if (!response.ok) {
        return {
          content: [
            {
              type: 'text',
              text: 'Erreur: Impossible de contacter l\'API',
            },
          ],
          isError: true,
        };
      }

      return {
        content: [
          {
            type: 'text',
            text: `API Status: ${result.status}\nBucket: ${result.bucket}\nRégion: ${result.region}`,
          },
        ],
      };
    } else {
      return {
        content: [
          {
            type: 'text',
            text: `Outil inconnu: ${name}`,
          },
        ],
        isError: true,
      };
    }
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: `Erreur: ${error.message}`,
        },
      ],
      isError: true,
    };
  }
}

/**
 * Main request handler
 */
const server = http.createServer(async (req, res) => {
  if (req.method !== 'POST') {
    res.writeHead(404);
    res.end();
    return;
  }

  let body = '';
  req.on('data', (chunk) => {
    body += chunk;
  });

  req.on('end', async () => {
    try {
      const request = JSON.parse(body);
      const method = request.method;
      const id = request.id;

      if (method === 'initialize') {
        sendResponse(res, handleInitialize(id), null, id);
      } else if (method === 'tools/list') {
        sendResponse(res, handleToolsList(id), null, id);
      } else if (method === 'tools/call') {
        const result = await handleToolCall(request, id);
        sendResponse(res, result, null, id);
      } else if (method === 'notifications/resources/list_changed') {
        // Acknowledge but don't respond to notifications
        return;
      } else {
        sendResponse(
          res,
          null,
          { code: -32601, message: `Méthode inconnue: ${method}` },
          id
        );
      }
    } catch (error) {
      console.error('Error:', error);
      sendResponse(
        res,
        null,
        { code: -32700, message: 'Parse error' },
        null
      );
    }
  });
});

server.listen(PORT, () => {
  console.log(`🚀 MCP Server running on port ${PORT}`);
  console.log(`📡 API Base URL: ${API_BASE_URL}`);
  console.log(`🔌 Connect Claude to: stdio server on port ${PORT}`);
});
