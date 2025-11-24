# 🚀 MCP Server - API Upload Images S3

Serveur MCP pour intégrer l'API d'upload d'images avec les IAs (Claude, etc.)

## Installation

```bash
npm install
```

## Utilisation

### 1. Mode CLI

```bash
# Vérifier le statut de l'API
npm run mcp status

# Uploader une image (local)
npm run mcp upload ./image.jpg

# Uploader une image (production)
npm run mcp upload ./image.jpg --api-url https://imgs3-arzka7rwn-hmjs-projects-4e301036.vercel.app

# Générer une URL S3
npm run mcp url monimage.jpg
```

### 2. Mode Module (Programme)

```javascript
const { uploadImage, getImageUrl, getApiStatus } = require('./mcp-server');

// Upload une image
const result = await uploadImage('./image.jpg');
console.log(result.url);

// Générer une URL
const urlInfo = getImageUrl('myimage.jpg');
console.log(urlInfo.url);

// Vérifier le statut
const status = await getApiStatus();
console.log(status);
```

### 3. Mode MCP (Claude/IAs)

Pour utiliser avec Claude Desktop, ajoutez à `~/.claude/claude.json`:

```json
{
  "mcpServers": {
    "imgs3": {
      "command": "node",
      "args": ["/chemin/vers/imgs3/mcp-server.js"],
      "env": {
        "MCP_API_URL_PROD": "https://imgs3-arzka7rwn-hmjs-projects-4e301036.vercel.app"
      }
    }
  }
}
```

## Outils Disponibles

### 1. `uploadImage`

Upload une image vers S3.

**Paramètres:**
- `filePath` (string, requis): Chemin vers le fichier image local
- `apiUrl` (string, optionnel): URL API (défaut: http://localhost:3000)

**Response:**
```json
{
  "success": true,
  "message": "Image uploadée avec succès",
  "fileName": "550e8400-e29b-41d4-a716-446655440000.jpg",
  "url": "https://hmzoo.s3.eu-west-1.amazonaws.com/images/550e8400-e29b-41d4-a716-446655440000.jpg",
  "bucket": "hmzoo",
  "folder": "images"
}
```

### 2. `getImageUrl`

Génère l'URL S3 d'une image (sans upload).

**Paramètres:**
- `fileName` (string, requis): Nom du fichier

**Response:**
```json
{
  "success": true,
  "fileName": "myimage.jpg",
  "s3Key": "images/myimage.jpg",
  "url": "https://hmzoo.s3.eu-west-1.amazonaws.com/images/myimage.jpg",
  "bucket": "hmzoo",
  "region": "eu-west-1",
  "folder": "images"
}
```

### 3. `getApiStatus`

Vérifie le statut de l'API.

**Paramètres:**
- `apiUrl` (string, optionnel): URL API

**Response:**
```json
{
  "success": true,
  "status": "online",
  "apiUrl": "http://localhost:3000",
  "message": "Image Upload API is running",
  "endpoints": {
    "upload": "POST /upload - Upload an image to S3"
  }
}
```

## Exemples

### Exemple 1: Upload avec Claude

```
Utilisateur: "Upload l'image screenshot.png sur S3 et donne-moi l'URL"

Claude utilise l'outil uploadImage:
- filePath: "./screenshot.png"
- apiUrl: "https://imgs3-arzka7rwn-hmjs-projects-4e301036.vercel.app"

Réponse: 
"Votre image a été uploadée ici: https://hmzoo.s3.eu-west-1.amazonaws.com/images/abc123.png"
```

### Exemple 2: Vérifier le statut

```
Utilisateur: "L'API d'upload fonctionne-t-elle?"

Claude utilise l'outil getApiStatus:
- apiUrl: "https://imgs3-arzka7rwn-hmjs-projects-4e301036.vercel.app"

Réponse:
"Oui, l'API fonctionne parfaitement ✓"
```

### Exemple 3: Générer URL S3

```
Utilisateur: "Quelle est l'URL S3 de mon-image.jpg?"

Claude utilise l'outil getImageUrl:
- fileName: "mon-image.jpg"

Réponse:
"L'URL est: https://hmzoo.s3.eu-west-1.amazonaws.com/images/mon-image.jpg"
```

## Configuration

### Variables d'environnement

```env
# URL API locale
MCP_API_URL=http://localhost:3000

# URL API production
MCP_API_URL_PROD=https://imgs3-arzka7rwn-hmjs-projects-4e301036.vercel.app

# Configuration S3
AWS_REGION=eu-west-1
AWS_S3_BUCKET_NAME=hmzoo
AWS_S3_FOLDER=images
```

## Formats d'image supportés

- `.jpg`, `.jpeg`
- `.png`
- `.gif`
- `.webp`

## Limite de taille

- Local: 5MB par défaut
- Vercel: ~4.5MB (plan gratuit)

## Troubleshooting

### "Erreur: Fichier non trouvé"
→ Vérifiez que le chemin du fichier est correct

### "Erreur API (403): AccessDenied"
→ Vérifiez les credentials AWS et les permissions IAM

### "Erreur: Statut HTTP 500"
→ Vérifiez que l'API est en cours d'exécution

## Architecture

```
Claude/IA
    ↓
MCP Server (mcp-server.js)
    ↓
API (index.js) - Locale ou Vercel
    ↓
AWS S3
```

## Déploiement du serveur MCP

Pour utiliser en production avec Claude Desktop:

1. Clonez le repo
2. Installez les dépendances: `npm install`
3. Mettez à jour la config: `~/.claude/claude.json`
4. Redémarrez Claude Desktop
5. Les outils seront disponibles dans Claude!

## License

ISC
