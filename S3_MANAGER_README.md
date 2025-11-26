# S3 Manager - Node.js Application

Application web moderne pour gérer les fichiers média dans votre bucket AWS S3.

## Caractéristiques

✨ **Interface Web Interactive**
- 🎨 Design moderne avec thème sombre/clair
- 📱 Responsive (desktop, tablet, mobile)
- ⚡ Chargement rapide avec lazy loading

📊 **Gestion des Médias**
- 📸 Galerie d'images avec prévisualisation
- 🎥 Support des vidéos avec lecteur intégré
- 📁 Vue en grille responsive
- 🔍 Recherche et filtrage en temps réel

🗑️ **Suppression Intelligente**
- Suppression simple (un fichier à la fois)
- Suppression batch (sélection multiple)
- Suppression complète du bucket (avec confirmation)
- Confirmations de sécurité

📈 **Statistiques en Temps Réel**
- Nombre total de fichiers
- Comptage par type (images/vidéos)
- Taille totale stockée
- Date de modification

## Installation

### Prérequis

- Node.js 14+
- AWS CLI configuré
- Fichier `.env` avec credentials

### Setup

```bash
# 1. Le script est déjà dans le répertoire racine
cd /home/mrpink/hmzoo/imgs3

# 2. Les dépendances sont déjà installées (express, @aws-sdk/client-s3)
npm install

# 3. Vérifier que .env est correctement configuré
cat .env
```

## Utilisation

### Démarrer l'application

```bash
# Port par défaut: 3003
node s3-manager.js

# Ou spécifier un port personnalisé
node s3-manager.js --port 5000
```

Accédez à: `http://localhost:3003`

### Utilisation Web

#### 1️⃣ Visualiser les médias

Au chargement, la liste complète des fichiers s'affiche:
- Aperçu (image/vidéo)
- Nom du fichier
- Taille
- Date de modification
- Boutons d'action

#### 2️⃣ Rechercher

```
🔍 Recherche par nom:  Tapez le nom du fichier
📁 Filtrer par type:    Sélectionner Images ou Vidéos
```

#### 3️⃣ Sélectionner

```
☑️ Select All        → Sélectionner tous les fichiers
☐ Deselect All       → Désélectionner tous
☑️ Cocher individuellement → Cliquer sur la checkbox
```

#### 4️⃣ Supprimer

**Option 1: Supprimer un fichier**
- Cliquer sur 🗑️ Delete sur la carte
- Confirmer dans le modal

**Option 2: Supprimer la sélection**
- Sélectionner les fichiers
- Cliquer sur 🗑️ Delete Selected
- Confirmer

**Option 3: Supprimer tout**
- Cliquer sur ⚠️ Delete All
- Taper "DELETE" pour confirmer
- Supprimer tous les fichiers du bucket

#### 5️⃣ Consulter

- 👁️ View → Ouvrir le fichier dans un nouvel onglet
- 📋 Copy → Copier l'URL S3

## Architecture

```
s3-manager.js                 # Serveur Express principal
s3-manager-ui/
├── index.html              # Page principale
├── style.css               # Styles (moderne, responsive)
└── app.js                  # Logique client (fetch, DOM)
```

### Backend (Node.js/Express)

**Routes API:**

```
GET /api/media
  → Lister tous les fichiers avec métadonnées
  
GET /api/info
  → Info sur bucket/folder/région
  
DELETE /api/media/:encodedKey
  → Supprimer un fichier
  
POST /api/media/delete-batch
  → Supprimer plusieurs fichiers
  { keys: ["path/file1.jpg", "path/file2.mp4"] }
```

**Fonctionnalités:**
- Authentification AWS automatique depuis .env
- Gestion des erreurs complète
- Encodage/décodage des clés S3 sécurisé
- Support de tous les types de médias

### Frontend (HTML/CSS/JavaScript)

**Caractéristiques:**
- Zéro dépendances externes (vanilla JavaScript)
- CSS moderne avec variables et gradients
- Responsive grid avec auto-fit
- Modals de confirmation
- Notifications toast
- Lazy loading des images

## Configuration

Variables d'environnement (`.env`):

```env
AWS_REGION=eu-west-1
AWS_ACCESS_KEY_ID=your-key
AWS_SECRET_ACCESS_KEY=your-secret
AWS_S3_BUCKET_NAME=hmzoo
AWS_S3_FOLDER=images
S3_MANAGER_PORT=3003
```

## Formats Supportés

**Images:**
- JPEG, PNG, GIF, WebP, SVG

**Vidéos:**
- MP4, WebM, OGG, MOV, AVI, MKV

## Sécurité

✅ Les credentials sont lus depuis `.env` (jamais exposés)
✅ Validation des chemins S3 (folder check)
✅ Confirmations pour opérations destructives
✅ Serveur écoute en localhost
✅ Encodage des clés S3

## Performance

- Lazy loading des images (navigateur natif)
- Grid responsive et fluide
- API optimisée (ListObjectsV2)
- Pas de pagination, chargement complet en mémoire

## Dépannage

### Port 3003 déjà utilisé

```bash
node s3-manager.js --port 8080
```

### Erreur de credentials AWS

Vérifier `.env`:
```bash
cat .env | grep AWS_
```

### Application ne démarre pas

```bash
# Vérifier Node.js
node --version

# Vérifier dépendances
npm list express @aws-sdk/client-s3

# Redémarrer
npm install
node s3-manager.js
```

## Alternatives

Voir aussi:
- `s3-media-manager.sh` - Version bash (CLI)
- `/api/upload` - Upload via REST API

## Licence

MIT

---

**S3 Manager pour IMGS3** - Gestion intuitive des médias AWS S3
