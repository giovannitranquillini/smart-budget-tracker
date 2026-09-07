import type { FastifyInstance } from 'fastify'
import logger from '@core/lib/logger.js';
import { CreateBudgetCategoryInput, CreateBudgetRecordFromAudioInput, CreateBudgetRecordInput } from '@api/schemas/index.js';

import { BudgetService } from '@core/services/budget.service.js';
import { AudioService } from '@core/services/audio.service.js';

const budgetService = BudgetService();
const audioService = AudioService();

export const registerRoutes = (server: FastifyInstance) => {
  server.post('/budget/record/audio', {schema: CreateBudgetRecordFromAudioInput}, async (request, reply) => {
    try {
      logger.info(`[API] Receiving audio file for a new budget record.`);

      const audio = await request.file();

      if (!audio) {
        logger.warn(`[API] No audio file found in the request.`);
        return reply.status(400).send({ error: 'No audio file provided' });
      }

      const content = await audio.toBuffer();
      const filePath = await audioService.storeAudio({ filename: audio.filename, content });

      await audioService.requestTranscription(filePath);

      reply.status(202).send({ status: 'processing' });
    } catch (error) {
      logger.error(`[API] Error processing audio file: ${error}`);
      reply.status(500).send({ error: 'Failed to process audio file' });
    }
  });


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