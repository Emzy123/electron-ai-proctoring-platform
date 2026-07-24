const amqp = require('amqplib');

let channel = null;

const connectQueue = async () => {
  if (channel) return channel;
  try {
    const conn = await amqp.connect(process.env.RABBITMQ_URL || 'amqp://localhost');
    channel = await conn.createChannel();
    await channel.assertQueue('frame_queue', { durable: true });
    await channel.assertQueue('violation_queue', { durable: true });
    await channel.assertQueue('report_queue', { durable: true });
    return channel;
  } catch (err) {
    console.warn('RabbitMQ unavailable:', err.message);
    return null;
  }
};

const publishToQueue = async (queue, message) => {
  try {
    const ch = await connectQueue();
    if (!ch) return false;
    ch.sendToQueue(queue, Buffer.from(JSON.stringify(message)), { persistent: true });
    return true;
  } catch {
    return false;
  }
};

const consumeQueue = async (queue, handler) => {
  const ch = await connectQueue();
  if (!ch) return;
  ch.consume(queue, async (msg) => {
    if (!msg) return;
    try {
      const data = JSON.parse(msg.content.toString());
      await handler(data);
      ch.ack(msg);
    } catch (err) {
      console.error(`Queue ${queue} error:`, err.message);
      ch.nack(msg, false, false);
    }
  });
};

module.exports = { connectQueue, publishToQueue, consumeQueue };
