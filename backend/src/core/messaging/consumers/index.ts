import { readMessage } from '@core/messaging/amqp.js';
import type { BudgetService } from '@core/services/budget.service.js';
import type { JobService, PipelineStage } from '@core/services/job.service.js';

type serviceDeps = {
    budgetService: ReturnType<typeof BudgetService>;
    jobService: ReturnType<typeof JobService>;
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
        const result = await deps.budgetService.buildDraft(budgetRecord);
        if ("error" in result) deps.jobService.notifyFailure(jobId, result.error);
        else deps.jobService.notifyDraft(jobId, result.draft);
    });

    /**
     * Consumer to receive updates about the status of budget record processing jobs.
     */
    readMessage({ queue: 'budget_record.notify', exchange: 'pipeline', binding: '*.processed' }, async (msg, routingKey) => {
        const { jobId } = JSON.parse(msg);
        deps.jobService.notifyStage(jobId, routingKey as PipelineStage);
    });

    /**
     * Consumer to receive notifications about failed budget record processing jobs.
     */
    readMessage({ queue: 'budget_record.failed', exchange: 'pipeline', binding: '*.failed' }, (msg, routingKey) => {
        const { jobId, error } = JSON.parse(msg);
        deps.jobService.notifyFailure(jobId, `${routingKey}: ${error}`);
    });
}