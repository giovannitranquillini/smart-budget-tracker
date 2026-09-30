import logger from '@core/lib/logger.js';
import { readMessage } from '@core/messaging/amqp.js';
import type { BudgetService } from '@core/services/budget.service.js';

type serviceDeps = {
    budgetService: ReturnType<typeof BudgetService>;
};

/**
 * The registerConsumers function sets up the necessary consumers on the RabbitMQ message borker.
 */
export const registerConsumers = (deps: serviceDeps) => {

    /**
     * Consumer for budget record drafts extracted by the LLM from audio files.
     */
    readMessage('budget_record', async (msg) => {
        try {
            const { jobId, budgetRecord } = JSON.parse(msg);
            await deps.budgetService.handleDraft(jobId, budgetRecord);
        } catch (error) {
            logger.error(`[Consumer] Error processing budget record: ${error}`);
        }
    });
}