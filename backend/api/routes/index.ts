import type { FastifyInstance } from 'fastify'
import logger from '@core/lib/logger.js';
import { CreateBudgetCategoryInput, CreateBudgetRecordInput } from '@api/schemas/index.js';

import { BudgetService } from '@core/services/budget.service.js';

const budgetService = BudgetService();

export const registerRoutes = (server: FastifyInstance) => {
  server.post('/budget/record', {schema: CreateBudgetRecordInput}, async (request, reply) => {
    try {
      logger.info(`[API] Creating new budget record.`);
      await budgetService.createBudgetRecord(request.body as any);
      reply.status(201);
    } catch (error) {
      logger.error(`[API] Error creating budget record: ${error}`);
      reply.status(500).send({ error: 'Failed to create budget record' });
    }
  });

  server.get('/budget/record', async (request, reply) => {
    try {
      logger.info(`[API] Fetching budget records.`);
      const records = await budgetService.listBudgetRecord();
      reply.send(records);
    } catch (error) {
      logger.error(`[API] Error fetching budget records: ${error}`);
      reply.status(500).send({ error: 'Failed to fetch budget records' });
    }
  });

  server.post('/budget/category', {schema: CreateBudgetCategoryInput}, async (request, reply) => {
    try {
      logger.info(`[API] Creating new budget category.`);
      await budgetService.createBudgetCategory(request.body as any);
      reply.status(201);
    } catch (error) {
      logger.error(`[API] Error creating budget category: ${error}`);
      reply.status(500).send({ error: 'Failed to create budget category' });
    }
  });

  server.get('/budget/category', async (request, reply) => {
    try {
      logger.info(`[API] Fetching budget categories.`);
      const categories = await budgetService.listBudgetCategory();
      reply.send(categories);
    } catch (error) {
      logger.error(`[API] Error fetching budget categories: ${error}`);
      reply.status(500).send({ error: 'Failed to fetch budget categories' });
    }
  });
}