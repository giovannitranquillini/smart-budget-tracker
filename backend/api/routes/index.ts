import type { FastifyInstance } from 'fastify'
import logger from '@core/lib/logger.js';
import { CreateBudgetCategoryInput, CreateBudgetRecordInput } from '@api/schemas/index.js';

import { BudgetService } from '@core/services/budget.service.js';

const budgetService = BudgetService();

export const registerRoutes = (server: FastifyInstance) => {
  server.post('/budget/record', {schema: CreateBudgetRecordInput}, async (request, reply) => {
    logger.info(`[API] Creating new budget record.`);
    await budgetService.createBudgetRecord(request.body as any);
    reply.status(201);
  });

  server.get('/budget/record', async (request, reply) => {
    logger.info(`[API] Fetching budget records.`);
    const records = await budgetService.listBudgetRecord();
    reply.send(records);
  });

  server.post('/budget/category', {schema: CreateBudgetCategoryInput}, async (request, reply) => {
    logger.info(`[API] Creating new budget category.`);
    await budgetService.createBudgetCategory(request.body as any);
    reply.status(201);
  });

  server.get('/budget/category', async (request, reply) => {
    logger.info(`[API] Fetching budget categories.`);
    const categories = await budgetService.listBudgetCategory();
    reply.send(categories);
  });
}