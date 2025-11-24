# 🚀 Image Upload API - HTTP Endpoints

API simple pour uploader des images vers Amazon S3 avec 3 modes de transmission.

## Installation & Lancement

```bash
npm install
npm start
```

Le serveur démarre sur `http://localhost:3000`

## 📡 Endpoints HTTP

### 1. GET `/` - Health Check
```bash
curl http://localhost:3000/
```
Retourne les endpoints disponibles et le statut du serveur.

### 2. POST `/upload` - Upload Image (3 modes)

#### **Mode A: Multipart/Form-Data (Fichier)**
```bash
curl -X POST http://localhost:3000/upload \
  -F "image=@/path/to/image.jpg" \
  -F "fileName=custom-name.jpg"
```

**Paramètres:**
- `image` (requis) : Fichier image (multipart)
- `fileName` (optionnel) : Nom personnalisé (UUID si omis)

**Réponse:**
```json
{
  "message": "Image uploaded successfully",
  "url": "https://hmzoo.s3.eu-west-1.amazonaws.com/images/custom-name.jpg",
  "fileName": "custom-name.jpg",
  "s3Key": "images/custom-name.jpg",
  "source": "multipart-upload"
}
```

#### **Mode B: JSON avec URL**
```bash
curl -X POST http://localhost:3000/upload \
  -H "Content-Type: application/json" \
  -d '{
    "imageUrl": "https://example.com/image.jpg",
    "fileName": "downloaded.jpg"
  }'
```

**Paramètres:**
- `imageUrl` (requis) : URL publique de l'image
- `fileName` (optionnel) : Nom personnalisé (UUID si omis)

#### **Mode C: JSON avec Base64**
```bash
curl -X POST http://localhost:3000/upload \
  -H "Content-Type: application/json" \
  -d '{
    "image": "data:image/jpeg;base64,/9j/4AAQSkZJRg...",
    "fileName": "encoded.jpg"
  }'
```

**Paramètres:**
- `image` (requis) : Data URI base64 (`data:image/type;base64,...`)
- `fileName` (optionnel) : Nom personnalisé (UUID si omis)

### 3. GET `/mcp/tools` - Liste les outils disponibles
```bash
curl http://localhost:3000/mcp/tools
```

Retourne les 3 outils disponibles avec leurs schémas OpenAPI.

### 4. GET `/mcp/status` - Statut de l'API
```bash
curl http://localhost:3000/mcp/status
```

Vérifie que l'API est en ligne et affiche la config bucket.

### 5. GET `/mcp/generate-url` - Génère une URL S3
```bash
curl "http://localhost:3000/mcp/generate-url?fileName=image.jpg"
```

Génère l'URL S3 d'une image **sans l'uploader**.

## 🎯 Formats d'image supportés

- JPEG (`image/jpeg`)
- PNG (`image/png`)  
- GIF (`image/gif`)
- WebP (`image/webp`)

**Limite de taille:** 5MB

## 🔧 Configuration

Variables d'environnement (`.env`):
```
AWS_REGION=eu-west-1
AWS_S3_BUCKET_NAME=hmzoo
AWS_S3_FOLDER=images
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
PORT=3000
```

## 🚀 Déploiement

L'API est déployée sur Vercel:
```
https://imgs3-arzka7rwn-hmjs-projects-4e301036.vercel.app
```

Tous les exemples ci-dessus fonctionnent en remplaçant `http://localhost:3000` par l'URL de production.

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
