import "dotenv/config";

import logger from '@core/lib/logger.js';
import { connect, close } from './core/messaging/amqp.js';
import { registerConsumers } from './core/messaging/consumers/index.js'

logger.info('Starting AI backend service...');

await connect(); // Connect to RabbitMQ before registering the consumers
registerConsumers();

logger.info('AI backend service ready, waiting for messages');

// Graceful shutdown
const shutdown = async () => {
  await close();
  process.exit(0);
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
