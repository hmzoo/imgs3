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

L'API peut être déployée sur Vercel ou n'importe quel serveur Node.js:
```
https://votre-domaine.vercel.app
```

Tous les exemples ci-dessus fonctionnent en remplaçant `http://localhost:3000` par votre URL de déploiement.

## 🤖 Connexion à Claude Desktop

Pour utiliser cette API avec Claude Desktop via le protocole MCP :

### 1. Lancer l'API Express

```bash
npm start
```

Le serveur démarre sur `http://localhost:3000` avec support MCP natif sur `http://localhost:3000/_mcp`

### 2. Configurer Claude Desktop

Éditez `~/.claude/claude.json`:
```json
{
  "mcpServers": {
    "imgs3": {
      "command": "npx",
      "args": ["node", "/chemin/vers/imgs3/index.js"],
      "env": {
        "API_URL": "http://localhost:3000"
      }
    }
  }
}
```

**OU** si vous voulez utiliser directement le serveur Express déjà lancé :

```json
{
  "mcpServers": {
    "imgs3": {
      "command": "curl",
      "args": ["--unix-socket", "/tmp/imgs3.sock", "http://localhost/_mcp"],
      "env": {}
    }
  }
}
```

### 3. Redémarrer Claude Desktop

Après modification du fichier de config, redémarrez Claude Desktop. Les 3 outils seront disponibles :
- `uploadImage` - Upload une image
- `getImageUrl` - Génère une URL S3
- `getApiStatus` - Vérifie le statut

### 🚀 Exemple d'utilisation avec Claude

```
Utilisateur: "Upload cette image sur S3: https://example.com/image.jpg"

Claude utilise l'outil uploadImage (Mode URL):
- imageUrl: "https://example.com/image.jpg"
- fileName: "ma-nouvelle-image.jpg"

Réponse: "Image uploadée avec succès! URL: https://..."
```

**Les 3 modes disponibles pour Claude :**

1. **Mode URL** - Télécharger depuis une URL publique
```json
{
  "name": "uploadImage",
  "arguments": {
    "imageUrl": "https://example.com/image.jpg",
    "fileName": "optional-custom-name.jpg"
  }
}
```

2. **Mode Base64** - Envoyer directement en base64 (avec data URI)
```json
{
  "name": "uploadImage",
  "arguments": {
    "image": "data:image/jpeg;base64,/9j/4AAQSkZJRg...",
    "fileName": "optional-custom-name.jpg"
  }
}
```

3. **Mode FilePath** - Convertir un fichier local en base64
```json
{
  "name": "uploadImage",
  "arguments": {
    "filePath": "/chemin/vers/image.jpg",
    "fileName": "optional-custom-name.jpg"
  }
}
```

### 📡 Appels MCP directs (debug)

Vous pouvez tester le protocole MCP directement :

```bash
# Initialiser
curl -X POST http://localhost:3000/_mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"initialize","params":{},"id":1}'

# Lister les outils
curl -X POST http://localhost:3000/_mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"tools/list","params":{},"id":2}'

# Appeler un outil
curl -X POST http://localhost:3000/_mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc":"2.0",
    "method":"tools/call",
    "params":{
      "name":"uploadImage",
      "arguments":{"imageUrl":"https://example.com/image.jpg"}
    },
    "id":3
  }'
```
