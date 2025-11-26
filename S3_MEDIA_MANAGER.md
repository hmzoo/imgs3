# S3 Media Manager

Utilitaire bash complet pour gérer les fichiers média dans votre bucket AWS S3.

## Caractéristiques

✅ **Liste** - Afficher tous les fichiers média du bucket  
✅ **Suppression** - Supprimer des fichiers un par un ou tous à la fois  
✅ **Galerie HTML** - Générer une galerie interactive avec aperçus  
✅ **Serveur Web** - Visualiser la galerie en local avec un serveur HTTP  
✅ **Intégration .env** - Utilise automatiquement les credentials du fichier `.env`  

## Prérequis

```bash
# AWS CLI
pip install awscli

# Python 3 (pour le serveur HTTP)
python3 --version
```

## Installation

```bash
# Le script est dans le répertoire racine
chmod +x ./s3-media-manager.sh
```

## Utilisation

### 1. Lister les fichiers

```bash
./s3-media-manager.sh list
```

Affiche tous les fichiers du bucket avec leur taille.

### 2. Supprimer un fichier

```bash
./s3-media-manager.sh delete-one
```

Interface interactive pour sélectionner et supprimer un fichier.

### 3. Supprimer tous les fichiers

```bash
./s3-media-manager.sh delete-all
```

⚠️ **Attention**: Cette commande demande une confirmation `DELETE`.

### 4. Générer une galerie HTML

```bash
./s3-media-manager.sh gallery
```

Crée un fichier `s3-gallery/index.html` avec:
- 🖼️ Aperçus des images
- 🎥 Prévisualisations des vidéos
- 📊 Statistiques (nombre de fichiers, taille totale)
- 🔗 Liens de copie pour chaque fichier
- 📱 Design responsive

### 5. Visualiser la galerie

```bash
# Serveur par défaut sur le port 3003
./s3-media-manager.sh serve

# Ou spécifier un port personnalisé
./s3-media-manager.sh serve 5000
```

Accédez à `http://localhost:3003` dans votre navigateur.

## Fonctionnalités de la Galerie

### Interactions

- 🖱️ **Cliquer sur une image** → Voir en plein écran
- 🔗 **Bouton "View"** → Ouvrir dans un nouvel onglet
- 📋 **Bouton "Copy"** → Copier l'URL S3 dans le presse-papiers

### Statistiques

Affichage en temps réel de:
- Nombre total de fichiers
- Taille totale stockée
- Nombre d'images
- Nombre de vidéos

### Formats Supportés

**Images**: JPEG, PNG, GIF, WebP, SVG  
**Vidéos**: MP4, WebM, OGG, MOV, AVI, MKV

## Configuration

Le script utilise les variables de `.env`:

```env
AWS_REGION=eu-west-1
AWS_ACCESS_KEY_ID=your-key-id
AWS_SECRET_ACCESS_KEY=your-secret-key
AWS_S3_BUCKET_NAME=hmzoo
AWS_S3_FOLDER=images
```

⚠️ **Important**: Ne commitez jamais les credentials dans le `.env` au git!

## Exemples

### Workflow complet

```bash
# 1. Voir ce qui est dans le bucket
./s3-media-manager.sh list

# 2. Générer la galerie
./s3-media-manager.sh gallery

# 3. Lancer le serveur pour visualiser
./s3-media-manager.sh serve 8080

# 4. Ouvrir dans le navigateur
# http://localhost:8080
```

### Nettoyage du bucket

```bash
# Attention: Supprime TOUT
./s3-media-manager.sh delete-all
# Taper "DELETE" pour confirmer
```

## Architecture

```
s3-media-manager.sh
├── load_env()              → Charge credentials depuis .env
├── list_media()            → Liste les fichiers S3
├── delete_single()         → Suppression interactive
├── delete_all()            → Suppression complète (avec confirmation)
├── generate_gallery()      → Crée HTML gallery
└── start_server()          → Lance serveur HTTP
```

## Galerie HTML

La galerie est générée avec:
- ✨ Design moderne avec gradients
- 📱 Grid responsive (auto-fit)
- 🎨 Cartes avec animations
- 🔍 Modal pour aperçu plein écran
- 📊 Statistiques live
- ⚡ Pas de dépendances externes (pur HTML/CSS/JS)

Structure générée:
```
s3-gallery/
└── index.html
```

## Dépannage

### Erreur: "AWS CLI not found"

```bash
pip install awscli
```

### Erreur: "Permission denied"

```bash
chmod +x ./s3-media-manager.sh
```

### Erreur: ".env file not found"

Vérifiez que le fichier `.env` est dans le même répertoire que le script.

### Port déjà utilisé

```bash
./s3-media-manager.sh serve 8081
```

## Performance

- 📈 Optimisé pour 100-1000+ fichiers
- ⚡ Lazy loading des images (navigateur natif)
- 🔄 Récupération en parallèle possible (AWS CLI)

## Sécurité

- ✅ Les credentials sont lus depuis `.env` (jamais hardcodés)
- ✅ Le serveur HTTP n'écoute que en localhost
- ✅ La galerie ne stocke que les URLs (pas les fichiers)
- ⚠️ Confirmations requises pour les opérations destructives

## Licence

MIT

## Support

Pour les issues ou améliorations, consultez la documentation de la galerie:
- [AWS S3 Documentation](https://docs.aws.amazon.com/s3/)
- [AWS CLI Documentation](https://docs.aws.amazon.com/cli/)

---

**Créé pour IMGS3** - Gestionnaire de média sur AWS S3
