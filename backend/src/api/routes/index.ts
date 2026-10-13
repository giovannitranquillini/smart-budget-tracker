import type { FastifyInstance } from 'fastify'
import logger from '@core/lib/logger.js';
import { CreateBudgetCategoryInput, CreateBudgetRecordFromAudioInput, CreateBudgetRecordInput, DeleteBudgetCategoryInput, DeleteBudgetRecordInput } from '@api/schemas/index.js';

import { BudgetService } from '@core/services/budget.service.js';
import { AudioService } from '@core/services/audio.service.js';
import { ImageService } from '@core/services/image.service.js';

type serviceDeps = {
  budgetService: ReturnType<typeof BudgetService>;
  audioService: ReturnType<typeof AudioService>;
  imageService: ReturnType<typeof ImageService>;
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
      },
      onFailure: (error) => {
        reply.raw.write(`event: failed\ndata: ${JSON.stringify({ error })}\n\n`);
        reply.raw.end();
      }
    });

    // Handle client disconnection and clean up
    reply.raw.on('close', unsubscribe);
  });

  /**
   * Trigger a new image processing that will lead to a budget record draft creation. 
   * The image file is stored and a transcription request is initiated via RabbitMQ. 
   * The client can listen for events related to the draft creation using the provided jobId (Server-sent events, SSE).
   */
  server.post('/budget/record/image', {schema: CreateBudgetRecordFromAudioInput}, async (request, reply) => {
    try {
      logger.info(`[API] Receiving image file for a new budget record.`);

      const image = await request.file();

      if (!image) {
        logger.warn(`[API] No image file found in the request.`);
        return reply.status(400).send({ error: 'No image file provided' });
      }

      // File storage
      const content = await image.toBuffer();
      const { filePath, imageId } = await deps.imageService.storeImage({ filename: image.filename, content });

      // OCR request via RabbitMQ
      await deps.imageService.requestOcr(imageId, filePath);

      // On this jobId the client can listen for events
      reply.status(202).send({ jobId: imageId });
    } catch (error) {
      logger.error(`[API] Error processing image file: ${error}`);
      reply.status(500).send({ error: 'Failed to process image file' });
    }
  });

  /**
   * Server-sent events (SSE) endpoint to stream budget record drafts related to a specific image processing job.
   * 
   * - The client can listen for events related to the draft creation using the provided jobId.
   * - The server will send events whenever a new draft is created for the given jobId.
   * - The connection will remain open until the client closes it or the server decides to close it.
   */
  server.get('/budget/record/image/:jobId/events', (request, reply) => {

    const { jobId } = request.params as { jobId: string }; // former imageId
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
      },
      onFailure: (error) => {
        reply.raw.write(`event: failed\ndata: ${JSON.stringify({ error })}\n\n`);
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
   * Delete a budget record by its id.
   */
  server.delete('/budget/record/:id', {schema: DeleteBudgetRecordInput}, async (request, reply) => {
    const { id } = request.params as { id: string };

    try {
      logger.info(`[API] Deleting budget record ${id}.`);
      const deleted = await deps.budgetService.deleteBudgetRecord(id);

      if (!deleted) {
        logger.warn(`[API] Budget record ${id} not found.`);
        return reply.status(404).send({ error: 'Budget record not found' });
      }

      reply.status(204).send();
    } catch (error) {
      logger.error(`[API] Error deleting budget record ${id}: ${error}`);
      reply.status(500).send({ error: 'Failed to delete budget record' });
    }
  });

  /**
   * Create a new budget category.
   * Receives a JSON payload with the budget category details and stores it in the database.
   */
  server.post('/budget/category', {schema: CreateBudgetCategoryInput}, async (request, reply) => {
    try {
      logger.info(`[API] Creating new budget category.`);
      const created = await deps.budgetService.createBudgetCategory(request.body as any);

      if (!created) {
        logger.warn(`[API] Budget category already exists.`);
        return reply.status(409).send({ error: 'Budget category already exists' });
      }

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

  /**
   * Delete a budget category by its id.
   * A category still used by some budget records cannot be deleted.
   */
  server.delete('/budget/category/:id', {schema: DeleteBudgetCategoryInput}, async (request, reply) => {
    const { id } = request.params as { id: string };

    try {
      logger.info(`[API] Deleting budget category ${id}.`);
      const result = await deps.budgetService.deleteBudgetCategory(id);

      if (result === 'not-found') {
        logger.warn(`[API] Budget category ${id} not found.`);
        return reply.status(404).send({ error: 'Budget category not found' });
      }

      if (result === 'in-use') {
        logger.warn(`[API] Budget category ${id} is used by some budget records.`);
        return reply.status(409).send({ error: 'Budget category is used by some budget records' });
      }

      reply.status(204).send();
    } catch (error) {
      logger.error(`[API] Error deleting budget category ${id}: ${error}`);
      reply.status(500).send({ error: 'Failed to delete budget category' });
    }
  });
}