# IMGS3 - Media Management Toolkit

Suite complète d'outils pour gérer les fichiers média sur AWS S3.

## 🎯 Vue d'ensemble

IMGS3 fournit trois façons de gérer vos médias:

| Outil | Type | Usage | Interface |
|-------|------|-------|-----------|
| **REST API** | index.js | Upload programmatique | HTTP/JSON |
| **S3 Media Manager (CLI)** | s3-media-manager.sh | Gestion en ligne de commande | Terminal |
| **S3 Manager (Web)** | s3-manager.js | Interface visuelle intuitive | Web (3003) |

---

## 📤 1. REST API - index.js

Serveur Express pour uploader et gérer les médias.

### Démarrage

```bash
node index.js
# Serveur sur http://localhost:3000
```

### Endpoints

**GET /**
```bash
curl http://localhost:3000
# "Media Upload API v1.0"
```

**POST /upload**
Mode 1 - Multipart (fichier direct):
```bash
curl -X POST -H "Authorization: Bearer YOUR_TOKEN" \
  -F "media=@image.jpg" \
  http://localhost:3000/upload
```

Mode 2 - Base64 (JSON):
```bash
curl -X POST -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "mode": "base64",
    "mediaData": "data:image/jpeg;base64,/9j/4AAQ...",
    "fileName": "image.jpg"
  }' \
  http://localhost:3000/upload
```

Mode 3 - URL (téléchargement):
```bash
curl -X POST -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "mode": "url",
    "mediaUrl": "https://example.com/image.jpg",
    "fileName": "image.jpg"
  }' \
  http://localhost:3000/upload
```

**GET /generate-url**
```bash
curl "http://localhost:3000/generate-url?fileName=image.jpg"
# Génère une URL S3 sans uploader
```

### Formats Supportés

- **Images**: JPEG, PNG, GIF, WebP, SVG
- **Vidéos**: MP4, WebM, OGG, MOV, AVI, MKV
- **Limite**: 500 MB par fichier

### Documentation Complète

Voir: `IMGS3_REF_API.md` (839 lignes avec exemples)

---

## 🛠️ 2. S3 Media Manager (CLI) - s3-media-manager.sh

Utilitaire bash pour gérer rapidement vos fichiers S3.

### Installation

```bash
chmod +x ./s3-media-manager.sh
```

### Commandes

**Lister les fichiers**
```bash
./s3-media-manager.sh list
# Affiche: nom, taille, URL S3
```

**Supprimer un fichier**
```bash
./s3-media-manager.sh delete-one
# Interface interactive
```

**Supprimer tous les fichiers**
```bash
./s3-media-manager.sh delete-all
# Demande confirmation "DELETE"
```

**Générer galerie HTML**
```bash
./s3-media-manager.sh gallery
# Crée: s3-gallery/index.html
```

**Servir la galerie**
```bash
./s3-media-manager.sh serve
# Port par défaut: 3003
# URL: http://localhost:3003
```

**Afficher l'aide**
```bash
./s3-media-manager.sh help
```

### Caractéristiques

✅ Bash pur (pas de dépendances)
✅ Galerie HTML responsive
✅ Lazy loading des images
✅ Confirmation requise pour suppressions
✅ Statistiques en temps réel

### Documentation Complète

Voir: `S3_MEDIA_MANAGER.md`

---

## 🌐 3. S3 Manager (Web) - s3-manager.js

Application Node.js moderne avec interface web intuitive.

### Démarrage

```bash
# Option 1: Script de démarrage
./start-s3-manager.sh

# Option 2: Direct
node s3-manager.js

# Option 3: Port personnalisé
node s3-manager.js --port 8080
```

URL: `http://localhost:3003`

### Fonctionnalités

🎨 **Interface Web**
- Design moderne et responsive
- Grille de médias avec prévisualisation
- Recherche et filtrage en temps réel

📊 **Gestion Intelligente**
- Sélection multiple avec checkboxes
- Suppression individuelle/batch/complète
- Confirmations de sécurité
- Statistiques live

🎥 **Support Complet**
- Prévisualisation images (lazy loading)
- Lecteur vidéo intégré
- Liens de consultation
- Copie d'URL

### Architecture

```
Backend: Express.js + AWS SDK
Frontend: Vanilla JavaScript (zéro dépendances)
API REST: 4 endpoints sécurisés
```

### Documentation Complète

Voir: `S3_MANAGER_README.md`

---

## 🔄 Comparaison des Outils

| Critère | API REST | CLI (bash) | Web (Node) |
|---------|----------|-----------|-----------|
| **Démarrage** | node index.js | ./s3-media-manager.sh | ./start-s3-manager.sh |
| **Port** | 3000 | N/A (HTML statique) | 3003 |
| **Upload** | ✅ 3 modes | ❌ | ❌ |
| **Suppression** | ❌ | ✅ | ✅ |
| **Visualisation** | ❌ | ✅ (HTML) | ✅ (Web app) |
| **Interface** | JSON/cURL | Terminal | Navigateur |
| **Dépendances** | Node + AWS SDK | Bash + AWS CLI | Node + express |
| **Performance** | Rapide | Rapide | Très rapide |
| **Automatisation** | ✅ Scripts | ✅ Scripts | ❌ |

---

## 🚀 Workflows Recommandés

### Workflow 1: Upload Direct

```bash
# 1. Uploader via API
curl -X POST -F "media=@photo.jpg" \
  -H "Authorization: Bearer $TOKEN" \
  http://localhost:3000/upload

# 2. Vérifier dans le web manager
# http://localhost:3003
```

### Workflow 2: Gestion Simplifiée (CLI)

```bash
# 1. Générer galerie
./s3-media-manager.sh gallery

# 2. Vérifier dans navigateur
./s3-media-manager.sh serve

# 3. Supprimer si nécessaire
./s3-media-manager.sh delete-one
```

### Workflow 3: Interface Web (Recommandé)

```bash
# 1. Démarrer le web manager
./start-s3-manager.sh

# 2. Ouvrir http://localhost:3003

# 3. Chercher/sélectionner/supprimer depuis le navigateur
```

### Workflow 4: Nettoyage Complet

```bash
# 1. Vérifier le contenu
./s3-media-manager.sh list | head -10

# 2. Supprimer tout (avec CLI)
./s3-media-manager.sh delete-all
# Confirmer en tapant "DELETE"

# Ou via web (interface plus visuelle)
# http://localhost:3003 → Delete All → Confirmer
```

---

## 📋 Configuration

Tous les outils utilisent les mêmes credentials depuis `.env`:

```env
AWS_REGION=eu-west-1
AWS_ACCESS_KEY_ID=your-key-id
AWS_SECRET_ACCESS_KEY=your-secret-key
AWS_S3_BUCKET_NAME=hmzoo
AWS_S3_FOLDER=images
API_TOKEN=your-api-token
S3_MANAGER_PORT=3003
```

---

## 🔐 Sécurité

✅ Credentials jamais hardcodés
✅ Authentification API optionnelle (Bearer token)
✅ Confirmations requises pour suppressions
✅ Validation des chemins S3
✅ Encodage des clés sécurisé

---

## 📊 Formats Supportés

**Images**: JPEG, PNG, GIF, WebP, SVG
**Vidéos**: MP4, WebM, OGG, MOV, AVI, MKV

---

## 🐛 Dépannage

### Application ne démarre pas

```bash
# Vérifier Node.js
node --version

# Réinstaller dépendances
rm -rf node_modules package-lock.json
npm install

# Vérifier .env
cat .env | grep AWS_
```

### Port déjà utilisé

```bash
# Trouver le PID
lsof -i :3003

# Tuer le processus
kill -9 <PID>

# Ou utiliser un autre port
node s3-manager.js --port 8080
```

### Erreur AWS credentials

```bash
# Vérifier les credentials
aws s3 ls s3://hmzoo/

# Reconfigurer
aws configure
```

---

## 📚 Documentation Détaillée

- **API REST**: `IMGS3_REF_API.md` (839 lignes)
- **CLI bash**: `S3_MEDIA_MANAGER.md`
- **Web app**: `S3_MANAGER_README.md`
- **Architecture**: `ARCHITECTURE.md`

---

## 🎯 Prochaines Étapes

- [ ] Ajouter authentification Web (OAuth)
- [ ] Partage public avec tokens d'accès
- [ ] Watermark automatique des images
- [ ] Compression des vidéos
- [ ] Cache CDN CloudFront
- [ ] Notifications en temps réel

---

**IMGS3** - Gestion complète des médias sur AWS S3
