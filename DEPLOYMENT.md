# 🚀 Guide de déploiement sur Vercel

## Prérequis
- Un compte Vercel (https://vercel.com)
- Vercel CLI installé : `npm i -g vercel`
- Les credentials AWS correctes

## Étapes de déploiement

### 1. Installer Vercel CLI
```bash
npm i -g vercel
```

### 2. Déployer l'application
```bash
vercel
```

Vercel vous posera quelques questions :
- **Project name:** `imgs3`
- **Which scope do you want to deploy to?** Choisissez votre compte
- **Link to existing project?** Non (sauf si vous en avez une)
- **Which settings would you like to override?** Appuyez sur Entrée pour accepter les défauts

### 3. Configurer les variables d'environnement

Deux options :

#### Option A : Via la CLI Vercel (rapide)
```bash
vercel env add AWS_REGION
vercel env add AWS_ACCESS_KEY_ID
vercel env add AWS_SECRET_ACCESS_KEY
vercel env add AWS_S3_BUCKET_NAME
vercel env add AWS_S3_FOLDER
```

#### Option B : Via le Dashboard Vercel (recommandé)
1. Allez sur https://vercel.com/dashboard
2. Sélectionnez votre projet `imgs3`
3. Allez dans **Settings > Environment Variables**
4. Ajoutez chaque variable :
   - `AWS_REGION` = `eu-west-1`
   - `AWS_ACCESS_KEY_ID` = Votre clé
   - `AWS_SECRET_ACCESS_KEY` = Votre secret
   - `AWS_S3_BUCKET_NAME` = `hmzoo`
   - `AWS_S3_FOLDER` = `images`

### 4. Redéployer avec les variables
```bash
vercel --prod
```

### 5. Tester l'application déployée
```bash
# Remplacez YOUR_DEPLOYMENT_URL par votre URL Vercel
curl https://YOUR_DEPLOYMENT_URL.vercel.app/

# Test d'upload
curl -X POST https://YOUR_DEPLOYMENT_URL.vercel.app/upload \
  -F "image=@/path/to/image.jpg"
```

## ⚠️ Points importants

### Sécurité
- ❌ Ne committez JAMAIS vos credentials dans Git
- ✅ Le `.env` est dans `.gitignore` (bon!)
- ✅ Utilisez les Environment Variables de Vercel pour les secrets

### Limite de fichier Vercel
Vercel a une limite de taille de requête. Pour les gros fichiers, vérifiez :
```bash
# Voir la limite actuelle
vercel --version
```

La limite par défaut est ~4.5MB pour les requêtes POST sur le plan gratuit.

### Région AWS
Votre bucket est en `eu-west-1` (Irlande), c'est bien configuré ✓

## Vérification finale
Une fois déployé, accédez à votre URL Vercel et testez :
```bash
# Health check
curl https://your-app.vercel.app/

# Upload test
curl -X POST https://your-app.vercel.app/upload \
  -F "image=@test-image.gif"
```

## Troubleshooting

### Erreur "The bucket you are attempting to access..."
→ Vérifiez que `AWS_REGION=eu-west-1` est correctement défini dans Vercel

### Erreur d'authentification AWS
→ Vérifiez vos credentials `AWS_ACCESS_KEY_ID` et `AWS_SECRET_ACCESS_KEY`

### Uploads ne s'affichent pas
→ Vérifiez que le bucket `hmzoo` a l'accès public configuré

## Mise à jour du code
Chaque `git push` sur votre branche par défaut redéployera automatiquement sur Vercel !
