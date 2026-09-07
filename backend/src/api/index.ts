import fastify from 'fastify'
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import multipart from '@fastify/multipart';
import cors from '@fastify/cors';

import { registerRoutes } from '@api/routes/index.js'

const server = fastify()

await server.register(cors, {
  origin: true
});

// needed by POST /budget/record/audio: the UI sends the recording as multipart/form-data
await server.register(multipart, {
  limits: {
    fileSize: 25 * 1024 * 1024
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

registerRoutes(server)

// host 0.0.0.0: inside the container loopback is not reachable from the host port mapping
server.listen({ port: 3001, host: '0.0.0.0' }, (err, address) => {
  if (err) {
    console.error(err)
    process.exit(1)
  }
  console.log(`Smart Budget Tracker backend server listening at ${address}`)
})