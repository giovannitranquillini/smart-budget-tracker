import fastify from 'fastify'
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';

import { registerRoutes } from '@api/routes/index.js'

const server = fastify()

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

server.listen({ port: 3001 }, (err, address) => {
  if (err) {
    console.error(err)
    process.exit(1)
  }
  console.log(`Smart Budget Tracker backend server listening at ${address}`)
})