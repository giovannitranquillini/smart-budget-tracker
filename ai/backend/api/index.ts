import fastify from 'fastify'
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import multipart from '@fastify/multipart';

import { sendMessage, readMessage } from '../messaging/amqp.js'

// gRPC server setup

readMessage('audio_processing_queue', (msg: any) => {
  console.log(`Received message from queue: ${msg}`);

  sendMessage('speech_to_text', msg);
});

// HTTP server setup
const server = fastify({
  logger: true
})

await server.register(swagger, {
  openapi: {
    openapi: '3.0.0',
    info: {
      title: 'Smart Budget Tracker API',
      description: 'API for managing budgets and financial records',
      version: '0.1.0'
    },
    servers: [
      {
        url: 'http://localhost:3002',
        description: 'Development server'
      }
    ]
  }
});

await server.register(swaggerUi, {
  routePrefix: '/docs'
});

// host 0.0.0.0: inside the container loopback is not reachable from the host port mapping
server.listen({ port: 3002, host: '0.0.0.0' }, (err, address) => {
  if (err) {
    console.error(err)
    process.exit(1)
  }
  console.log(`AI backend server listening at ${address}`)
})