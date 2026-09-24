import { prisma } from "@core/lib/prisma.js";
import { BudgetCategory, BudgetRecord } from "../../generated/prisma/browser.js";
import { readMessage } from "@core/messaging/amqp.js";

import logger from "@core/lib/logger.js";

/** Record extracted by the LLM from the audio: fields it cannot determine are null. */
export type BudgetRecordDraft = {
    amount: number | null;
    category: string | null;
    description: string | null;
};

// How long we keep a draft that arrived before the UI opened the SSE stream
const DRAFT_TTL_MS = 60_000;

// Module level: shared by every BudgetService instance
const draftListeners = new Map<string, (draft: BudgetRecordDraft) => void>();
const earlyDrafts = new Map<string, BudgetRecordDraft>();

export const BudgetService = () => {
    
    readMessage('budget_record', async (msg: any) => {
        logger.info(`[BudgetService] Received budget record: ${msg}`);

        try {
            const json = JSON.parse(msg);

            const jobId = json.jobId;
            const budgetRecord: BudgetRecordDraft = json.budgetRecord;

            if(!budgetRecord.amount || !budgetRecord.category || !budgetRecord.description) {
                logger.warn(`[BudgetService] Incomplete budget record received: ${JSON.stringify(budgetRecord)}`);
                return;
            }

            // hand the draft to the UI waiting on the SSE stream of this job
            notifyDraft(jobId, budgetRecord);

            // find the category id by name
            const categoryRecord = await prisma.budgetCategory.findUnique({ where: { name: budgetRecord.category } });

            if (!categoryRecord) {
                logger.error(`[BudgetService] Category "${budgetRecord.category}" not found.`);
                return;
            }

            await createBudgetRecord({ amount: budgetRecord.amount, description: budgetRecord.description, categoryId: categoryRecord.id });
    
        } catch (error) {
            logger.error(`[BudgetService] Error processing budget record: ${error}`);
        }
    });

    function notifyDraft(jobId: string, draft: BudgetRecordDraft) {
        const listener = draftListeners.get(jobId);
        if (listener) return listener(draft);

        // nobody listening (yet): keep it for a while
        earlyDrafts.set(jobId, draft);
        setTimeout(() => earlyDrafts.delete(jobId), DRAFT_TTL_MS);
    }

    /** Registers who is waiting for the draft of jobId. Returns the function to stop listening. */
    function subscribeToDraft(jobId: string, listener: (draft: BudgetRecordDraft) => void): () => void {
        const ready = earlyDrafts.get(jobId);
        if (ready !== undefined) {
            earlyDrafts.delete(jobId);
            listener(ready);
            return () => {};
        }

        draftListeners.set(jobId, listener);
        return () => draftListeners.delete(jobId);
    }

    async function createBudgetCategory(params: { name: string }) {
        logger.info(`[BudgetService] Creating new budget category.`);
        await prisma.budgetCategory.create({data: params});
    }

    async function listBudgetCategory(): Promise<BudgetCategory[]> {
        logger.info(`[BudgetService] Listing budget categories.`);
        return await prisma.budgetCategory.findMany();
    }

    async function createBudgetRecord(params: { amount: number; description: string, categoryId: string }) {
        logger.info(`[BudgetService] Creating new budget record.`);

        const payload = {
            ...params,
            date: new Date()
        }

        await prisma.budgetRecord.create({data: payload});
    }

    async function listBudgetRecord(): Promise<BudgetRecord[]> {
        logger.info(`[BudgetService] Listing budget records.`);
        // the UI table shows the category name, not its id
        return await prisma.budgetRecord.findMany({
            include: { category: { select: { name: true } } },
            orderBy: { date: 'desc' }
        });
    }

    return {
        createBudgetCategory,
        listBudgetCategory,
        createBudgetRecord,
        listBudgetRecord,
        subscribeToDraft
    }
}