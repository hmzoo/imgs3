require('dotenv').config();
const { S3Client, PutObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const { HttpsProxyAgent } = require('https-proxy-agent');
const { NodeHttpHandler } = require('@smithy/node-http-handler');

// Configuration du proxy agent
const proxyUrl = process.env.HTTP_PROXY || process.env.http_proxy;
console.log(`🔌 Proxy configuré: ${proxyUrl ? proxyUrl : 'aucun'}`);

const agent = proxyUrl ? new HttpsProxyAgent(proxyUrl) : undefined;

const s3Client = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
  requestHandler: agent ? new NodeHttpHandler({
    httpsAgent: agent
  }) : undefined
});

async function testS3Access() {
  console.log('🔍 Test d\'accès S3 avec proxy en cours...\n');

  console.log('📋 Configuration:');
  console.log(`   Région: ${process.env.AWS_REGION}`);
  console.log(`   Bucket: ${process.env.AWS_S3_BUCKET_NAME}`);
  console.log(`   Dossier: ${process.env.AWS_S3_FOLDER || '(racine)'}`);
  console.log(`   Access Key ID: ${process.env.AWS_ACCESS_KEY_ID ? '✓ Configurée' : '✗ Manquante'}`);
  console.log(`   Secret Access Key: ${process.env.AWS_SECRET_ACCESS_KEY ? '✓ Configurée' : '✗ Manquante'}\n`);

  // Générer un nom de fichier de test
  const testFileName = `test-${Date.now()}.txt`;
  const folder = process.env.AWS_S3_FOLDER ? `${process.env.AWS_S3_FOLDER}/` : '';
  const s3Key = `${folder}${testFileName}`;
  const testContent = `Test d'accès S3 - ${new Date().toISOString()}`;

  try {
    // Test 1: Upload
    console.log('📤 Test 1: Upload du fichier de test...');
    const uploadParams = {
      Bucket: process.env.AWS_S3_BUCKET_NAME,
      Key: s3Key,
      Body: testContent,
      ContentType: 'text/plain',
    };

    await s3Client.send(new PutObjectCommand(uploadParams));
    console.log(`   ✓ Fichier uploadé avec succès`);
    console.log(`   S3 Path: s3://${process.env.AWS_S3_BUCKET_NAME}/${s3Key}\n`);

    // Test 2: Générer l'URL
    console.log('🔗 Test 2: URL d\'accès public...');
    const imageUrl = `https://${process.env.AWS_S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${s3Key}`;
    console.log(`   ${imageUrl}\n`);

    // Test 3: Suppression
    console.log('🗑️  Test 3: Suppression du fichier de test...');
    const deleteParams = {
      Bucket: process.env.AWS_S3_BUCKET_NAME,
      Key: s3Key,
    };

    await s3Client.send(new DeleteObjectCommand(deleteParams));
    console.log(`   ✓ Fichier supprimé avec succès\n`);

    console.log('✅ Tous les tests sont passés avec succès!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Erreur lors du test:\n');
    console.error(`   Message: ${error.message}`);
    console.error(`   Code d'erreur: ${error.code || 'N/A'}\n`);
    console.error(`\n📋 Détails complets:`);
    console.error(error);
    process.exit(1);
  }
}

testS3Access();
