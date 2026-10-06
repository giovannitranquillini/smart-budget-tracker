import type { FastifyInstance } from 'fastify'
import logger from '@core/lib/logger.js';
import { CreateBudgetCategoryInput, CreateBudgetRecordFromAudioInput, CreateBudgetRecordInput } from '@api/schemas/index.js';

import { BudgetService } from '@core/services/budget.service.js';
import { AudioService } from '@core/services/audio.service.js';

type serviceDeps = {
  budgetService: ReturnType<typeof BudgetService>;
  audioService: ReturnType<typeof AudioService>;
};

/**
 * The registerRoutes function sets up the necessary API routes on the Fastify server.
 */
export const registerRoutes = (server: FastifyInstance, deps: serviceDeps) => {

  /**
   * Trigger a new audio processing that will lead to a budget record draft creation. 
   * The audio file is stored and a transcription request is initiated via RabbitMQ. 
   * The client can listen for events related to the draft creation using the provided jobId (Server-sent events, SSE).
   */
  server.post('/budget/record/audio', {schema: CreateBudgetRecordFromAudioInput}, async (request, reply) => {
    try {
      logger.info(`[API] Receiving audio file for a new budget record.`);

      const audio = await request.file();

      if (!audio) {
        logger.warn(`[API] No audio file found in the request.`);
        return reply.status(400).send({ error: 'No audio file provided' });
      }

      // File storage
      const content = await audio.toBuffer();
      const { filePath, audioId } = await deps.audioService.storeAudio({ filename: audio.filename, content });

      // Transcription request via RabbitMQ
      await deps.audioService.requestTranscription(audioId, filePath);

      // On this jobId the client can listen for events
      reply.status(202).send({ jobId: audioId });
    } catch (error) {
      logger.error(`[API] Error processing audio file: ${error}`);
      reply.status(500).send({ error: 'Failed to process audio file' });
    }
  });

  /**
   * Server-sent events (SSE) endpoint to stream budget record drafts related to a specific audio processing job.
   * 
   * - The client can listen for events related to the draft creation using the provided jobId.
   * - The server will send events whenever a new draft is created for the given jobId.
   * - The connection will remain open until the client closes it or the server decides to close it.
   */
  server.get('/budget/record/audio/:jobId/events', (request, reply) => {

    const { jobId } = request.params as { jobId: string }; // former audioId
    logger.info(`[API] Opening SSE stream for job ${jobId}.`);

    reply.hijack(); // it tells Fastify that the response will be handled manually

    // Set headers for SSE
    for (const [name, value] of Object.entries(reply.getHeaders())) {
      if (value !== undefined) reply.raw.setHeader(name, value);
    }

    // Inform the client that this is an SSE stream and keep the connection alive
    reply.raw.writeHead(200, {
      'Content-Type': 'text/event-stream', // MIME type for SSE
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    });

    // Subscribe to the jobId to listen for pipeline progress and budget record drafts
    const unsubscribe = deps.budgetService.subscribeToJob(jobId, {
      onStage: (stage) => {
        // a late stage event can arrive after the draft has already closed the stream
        if (reply.raw.writableEnded) return;
        reply.raw.write(`event: stage\ndata: ${JSON.stringify({ stage })}\n\n`);
      },
      onDraft: (draft) => {
        reply.raw.write(`event: budget-record\ndata: ${JSON.stringify(draft)}\n\n`);
        reply.raw.end();
      }
    });

    // Handle client disconnection and clean up
    reply.raw.on('close', unsubscribe);
  });

  /**
   * Create a new budget record.
   * Receives a JSON payload with the budget record details and stores it in the database.
   */
  server.post('/budget/record', {schema: CreateBudgetRecordInput}, async (request, reply) => {
    try {
      logger.info(`[API] Creating new budget record.`);
      await deps.budgetService.createBudgetRecord(request.body as any);
      reply.status(201).send();
    } catch (error) {
      logger.error(`[API] Error creating budget record: ${error}`);
      reply.status(500).send({ error: 'Failed to create budget record' });
    }
  });

  /**
   * List all budget records.
   */
  server.get('/budget/record', async (request, reply) => {
    try {
      logger.info(`[API] Fetching budget records.`);
      const records = await deps.budgetService.listBudgetRecord();
      reply.send(records);
    } catch (error) {
      logger.error(`[API] Error fetching budget records: ${error}`);
      reply.status(500).send({ error: 'Failed to fetch budget records' });
    }
  });

  /**
   * Create a new budget category.
   * Receives a JSON payload with the budget category details and stores it in the database.
   */
  server.post('/budget/category', {schema: CreateBudgetCategoryInput}, async (request, reply) => {
    try {
      logger.info(`[API] Creating new budget category.`);
      await deps.budgetService.createBudgetCategory(request.body as any);
      reply.status(201).send();
    } catch (error) {
      logger.error(`[API] Error creating budget category: ${error}`);
      reply.status(500).send({ error: 'Failed to create budget category' });
    }
  });

  /**
   * List all budget categories.
   */
  server.get('/budget/category', async (request, reply) => {
    try {
      logger.info(`[API] Fetching budget categories.`);
      const categories = await deps.budgetService.listBudgetCategory();
      reply.send(categories);
    } catch (error) {
      logger.error(`[API] Error fetching budget categories: ${error}`);
      reply.status(500).send({ error: 'Failed to fetch budget categories' });
    }
  });
}