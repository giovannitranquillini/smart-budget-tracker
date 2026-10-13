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
        const { jobId, budgetRecord } = JSON.parse(msg);
        await deps.budgetService.handleDraft(jobId, budgetRecord);
    });

    /**
     * Consumer to receive updates about the status of budget record processing jobs.
     */
    readMessage({ queue: 'budget_record.notify', exchange: 'pipeline', binding: '*.processed' }, async (msg, routingKey) => {
        const { jobId } = JSON.parse(msg);
        deps.budgetService.handleStage(jobId, routingKey as PipelineStage);
    });

    /**
     * Consumer to receive notifications about failed budget record processing jobs.
     */
    readMessage({ queue: 'budget_record.failed', exchange: 'pipeline', binding: '*.failed' }, (msg, routingKey) => {
        const { jobId, error } = JSON.parse(msg);
        deps.budgetService.handleFailure(jobId, `${routingKey}: ${error}`);
    });
}