import logger from '@core/lib/logger.js';
import { readMessage } from '@core/messaging/amqp.js';
import type { BudgetService, PipelineStage } from '@core/services/budget.service.js';

type serviceDeps = {
    budgetService: ReturnType<typeof BudgetService>;
};

/**
 * The registerConsumers function sets up the necessary consumers on the RabbitMQ message broker.
 */
export const registerConsumers = (deps: serviceDeps) => {

    /**
     * Consumer for budget record drafts extracted by the LLM from audio files.
     */
    readMessage({ queue: 'budget_record.processed' }, async (msg) => {
        try {
            const { jobId, budgetRecord } = JSON.parse(msg);
            await deps.budgetService.handleDraft(jobId, budgetRecord);
        } catch (error) {
            logger.error(`[Consumer] Error processing budget record: ${error}`);
        }
    });

    /**
     * Consumer to receive updates about the status of budget record processing jobs.
     */
    readMessage({ queue: 'budget_record.notify', exchange: 'pipeline', binding: '*.processed' }, async (msg, routingKey) => {
        try {
            const { jobId } = JSON.parse(msg);
            deps.budgetService.handleStage(jobId, routingKey as PipelineStage);
        } catch (error) {
            logger.error(`[Consumer] Error receiving notification: ${error}`);
        }
    });
}