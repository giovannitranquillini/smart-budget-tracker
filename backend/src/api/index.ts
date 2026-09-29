import fastify from 'fastify'
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import multipart from '@fastify/multipart';
import cors from '@fastify/cors';

import { registerRoutes } from '@api/routes/index.js'
import { BudgetService } from '@core/services/budget.service.js';
import { registerConsumers } from './consumers/index.js';
import { AudioService } from '@core/services/audio.service.js';

const server = fastify()

// CORS configuration
await server.register(cors, {
  origin: true
});

// File uploads (multipart/form-data)
await server.register(multipart, {
  limits: {
    fileSize: 25 * 1024 * 1024 // 25 MB
  }
});

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
        url: 'http://localhost:3001',
        description: 'Development server'
      }
    ]
  }
});

await server.register(swaggerUi, {
  routePrefix: '/docs'
});

const budgetService = BudgetService();
const audioService = AudioService();

registerRoutes(server, {budgetService, audioService});
registerConsumers({ budgetService });

// 0.0.0.0 to be reachable from outside the Docker container
server.listen({ port: 3001, host: '0.0.0.0' }, (err, address) => {
  if (err) {
    console.error(err)
    process.exit(1)
  }
  console.log(`Smart Budget Tracker backend server listening at ${address}`)
})