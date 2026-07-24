const EventEmitter = require('events');

class QueueFallbackEmitter extends EventEmitter {}
const localQueueEmitter = new QueueFallbackEmitter();

// MinIO S3 evidence uploader with local database fallback
const uploadEvidence = async ({ bucketName = 'custech-evidence', objectName, buffer, contentType = 'image/jpeg' }) => {
  try {
    const Minio = require('minio');
    const minioClient = new Minio.Client({
      endPoint: process.env.MINIO_ENDPOINT || 'localhost',
      port: parseInt(process.env.MINIO_PORT || '9000', 10),
      useSSL: false,
      accessKey: process.env.MINIO_ACCESS_KEY || 'minioadmin',
      secretKey: process.env.MINIO_SECRET_KEY || 'minioadmin',
    });

    const exists = await minioClient.bucketExists(bucketName);
    if (!exists) {
      await minioClient.makeBucket(bucketName);
    }

    await minioClient.putObject(bucketName, objectName, buffer, buffer.length, {
      'Content-Type': contentType,
    });

    const url = `/evidence/${bucketName}/${objectName}`;
    console.log(`[MinIO Storage] Successfully uploaded evidence: ${url}`);
    return { success: true, url, storage: 'minio' };
  } catch (err) {
    console.warn(`[Storage Fallback] MinIO unavailable (${err.message}). Storing inline.`);
    const base64Url = `data:${contentType};base64,${buffer.toString('base64')}`;
    return { success: true, url: base64Url, storage: 'inline-fallback' };
  }
};

// RabbitMQ message publisher with local fallback
const publishQueueEvent = async (queueName, eventData) => {
  try {
    const amqp = require('amqplib');
    const rabbitUrl = process.env.RABBITMQ_URL || 'amqp://localhost:5672';
    const connection = await amqp.connect(rabbitUrl);
    const channel = await connection.createChannel();

    await channel.assertQueue(queueName, { durable: true });
    channel.sendToQueue(queueName, Buffer.from(JSON.stringify(eventData)), { persistent: true });

    setTimeout(() => connection.close(), 500);
    console.log(`[RabbitMQ Queue] Event published to queue '${queueName}'`);
    return { success: true, queue: queueName };
  } catch (err) {
    console.warn(`[Queue Fallback] RabbitMQ unavailable (${err.message}). Emitting locally.`);
    localQueueEmitter.emit(queueName, eventData);
    return { success: true, queue: 'local-fallback' };
  }
};

module.exports = {
  uploadEvidence,
  publishQueueEvent,
  localQueueEmitter,
};
