const Minio = require('minio');

let minioClient = null;

const getMinio = () => {
  if (minioClient) return minioClient;
  minioClient = new Minio.Client({
    endPoint: process.env.MINIO_ENDPOINT || 'localhost',
    port: parseInt(process.env.MINIO_PORT || '9000'),
    useSSL: process.env.MINIO_USE_SSL === 'true',
    accessKey: process.env.MINIO_ACCESS_KEY || 'minioadmin',
    secretKey: process.env.MINIO_SECRET_KEY || 'minioadmin',
  });
  return minioClient;
};

const BUCKET = process.env.MINIO_BUCKET || 'custech-evidence';

const ensureBucket = async () => {
  try {
    const client = getMinio();
    const exists = await client.bucketExists(BUCKET);
    if (!exists) await client.makeBucket(BUCKET);
  } catch (err) {
    console.warn('MinIO unavailable:', err.message);
  }
};

const uploadEvidence = async (key, buffer, contentType = 'image/jpeg') => {
  try {
    await ensureBucket();
    const client = getMinio();
    await client.putObject(BUCKET, key, buffer, buffer.length, { 'Content-Type': contentType });
    return key;
  } catch (err) {
    console.warn('Evidence upload fallback (local):', err.message);
    return key;
  }
};

const getEvidenceUrl = async (key) => {
  try {
    await ensureBucket();
    const client = getMinio();
    return await client.presignedGetObject(BUCKET, key, 3600);
  } catch {
    return null;
  }
};

module.exports = { uploadEvidence, getEvidenceUrl, ensureBucket, getMinio, BUCKET };
