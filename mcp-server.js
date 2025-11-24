#!/usr/bin/env node

/**
 * MCP Server pour API Upload d'Images S3
 * Permet aux IAs d'utiliser l'API d'upload d'images
 */

const fs = require('fs');
const path = require('path');
const FormData = require('form-data');
const fetch = require('node-fetch');
require('dotenv').config();

// Configuration
const API_URL = process.env.MCP_API_URL || 'http://localhost:3000';
const API_URL_PROD = process.env.MCP_API_URL_PROD || 'https://imgs3-arzka7rwn-hmjs-projects-4e301036.vercel.app';

/**
 * Tool: uploadImage
 * Upload une image vers S3 via l'API
 */
async function uploadImage(filePath, apiUrlOverride = null) {
  try {
    const url = apiUrlOverride || API_URL;
    
    // Vérifier que le fichier existe
    if (!fs.existsSync(filePath)) {
      throw new Error(`Fichier non trouvé: ${filePath}`);
    }

    // Vérifier que c'est un fichier image
    const ext = path.extname(filePath).toLowerCase();
    const allowedExts = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
    if (!allowedExts.includes(ext)) {
      throw new Error(`Format non supporté: ${ext}. Formats acceptés: ${allowedExts.join(', ')}`);
    }

    // Créer FormData avec le fichier
    const form = new FormData();
    const fileStream = fs.createReadStream(filePath);
    form.append('image', fileStream);

    // Envoyer vers l'API
    const response = await fetch(`${url}/upload`, {
      method: 'POST',
      body: form,
      headers: form.getHeaders(),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Erreur API (${response.status}): ${error.error || 'Erreur inconnue'}`);
    }

    const result = await response.json();
    return {
      success: true,
      message: 'Image uploadée avec succès',
      fileName: result.fileName,
      url: result.url,
      bucket: process.env.AWS_S3_BUCKET_NAME,
      folder: process.env.AWS_S3_FOLDER,
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Tool: getImageUrl
 * Génère l'URL S3 d'une image (sans upload)
 */
function getImageUrl(fileName) {
  try {
    if (!fileName) {
      throw new Error('fileName est requis');
    }

    const bucket = process.env.AWS_S3_BUCKET_NAME;
    const region = process.env.AWS_REGION;
    const folder = process.env.AWS_S3_FOLDER || '';
    
    const s3Key = folder ? `${folder}/${fileName}` : fileName;
    const url = `https://${bucket}.s3.${region}.amazonaws.com/${s3Key}`;

    return {
      success: true,
      fileName,
      s3Key,
      url,
      bucket,
      region,
      folder,
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Tool: getApiStatus
 * Récupère le statut de l'API
 */
async function getApiStatus(apiUrlOverride = null) {
  try {
    const url = apiUrlOverride || API_URL;
    const response = await fetch(url, { timeout: 5000 });

    if (!response.ok) {
      throw new Error(`Statut HTTP ${response.status}`);
    }

    const data = await response.json();
    return {
      success: true,
      status: 'online',
      apiUrl: url,
      message: data.message,
      endpoints: data.endpoints,
    };
  } catch (error) {
    return {
      success: false,
      status: 'offline',
      error: error.message,
      apiUrl: apiUrlOverride || API_URL,
    };
  }
}

/**
 * Traiter les appels MCP stdin/stdout
 */
async function processRequest(request) {
  try {
    const { method, params } = request;

    switch (method) {
      case 'uploadImage':
        return await uploadImage(params.filePath, params.apiUrl);

      case 'getImageUrl':
        return getImageUrl(params.fileName);

      case 'getApiStatus':
        return await getApiStatus(params.apiUrl);

      default:
        return {
          success: false,
          error: `Méthode inconnue: ${method}`,
        };
    }
  } catch (error) {
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Point d'entrée - Mode CLI
 */
async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.log(`
╔════════════════════════════════════════════════════════════╗
║        MCP Server - API Upload Images S3                   ║
╚════════════════════════════════════════════════════════════╝

Usage:
  node mcp-server.js <command> [options]

Commands:
  upload <filePath>           Upload une image
    Options: --api-url <url>  URL API (défaut: ${API_URL})

  status                      Vérifier le statut de l'API
    Options: --api-url <url>  URL API (défaut: ${API_URL})

  url <fileName>              Générer URL S3

Examples:
  node mcp-server.js upload ./image.jpg
  node mcp-server.js upload ./image.jpg --api-url ${API_URL_PROD}
  node mcp-server.js status
  node mcp-server.js url myimage.jpg
    `);
    return;
  }

  const command = args[0];
  let apiUrl = null;

  // Parser les options
  const apiUrlIndex = args.indexOf('--api-url');
  if (apiUrlIndex !== -1 && args[apiUrlIndex + 1]) {
    apiUrl = args[apiUrlIndex + 1];
  }

  let result;

  switch (command) {
    case 'upload':
      if (!args[1]) {
        console.error('Erreur: filePath requis');
        process.exit(1);
      }
      result = await uploadImage(args[1], apiUrl);
      break;

    case 'status':
      result = await getApiStatus(apiUrl);
      break;

    case 'url':
      if (!args[1]) {
        console.error('Erreur: fileName requis');
        process.exit(1);
      }
      result = getImageUrl(args[1]);
      break;

    default:
      console.error(`Commande inconnue: ${command}`);
      process.exit(1);
  }

  console.log(JSON.stringify(result, null, 2));
}

// Exporter pour utilisation en tant que module
module.exports = {
  uploadImage,
  getImageUrl,
  getApiStatus,
  processRequest,
};

// Lancer si appelé directement
if (require.main === module) {
  main().catch((error) => {
    console.error('Erreur:', error.message);
    process.exit(1);
  });
}
