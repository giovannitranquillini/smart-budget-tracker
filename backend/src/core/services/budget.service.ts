import { prisma } from "@core/lib/prisma.js";
import { BudgetCategory, BudgetRecord } from "../../generated/prisma/browser.js";

import logger from "@core/lib/logger.js";

/** Record extracted by the LLM from the audio: fields it cannot determine are null. */
export type BudgetRecordDraft = {
    amount: number | null;
    category: string | null;
    description: string | null;
};

// How long we keep a draft that arrived before the UI opened the SSE stream
const DRAFT_TTL_MS = 60_000; // 1 minute

// Module level: shared by every BudgetService instance
const sseConnections = new Map<string, (draft: BudgetRecordDraft) => void>(); // SSE connections
const drafts = new Map<string, BudgetRecordDraft>(); // drafts that arrived before the UI opened the SSE stream

/**
 * The BudgetService is responsible for handling budget records and categories domain logic. 
 * 
 * - Basic CRUD operations for budget records and categories are provided.
 * - It listens for budget record drafts from the audio processing service via RabbitMQ, 
 * and provides methods to create and list budget records and categories.
 */
export const BudgetService = () => {
    
    /** 
     * Registers who is waiting for the draft of jobId. 
     * Returns the function to stop listening. 
     * 
     * @param jobId The jobId of the audio processing that will lead to a budget record draft creation.
     * @param listener The function to call when a draft is available.
     * 
     * @returns A function to stop listening for drafts.
     */
    function subscribeToJob(jobId: string, listener: (draft: BudgetRecordDraft) => void): () => void {
        const ready = drafts.get(jobId);

        if (ready !== undefined) {
            drafts.delete(jobId);
            listener(ready);
            return () => {};
        }

        sseConnections.set(jobId, listener);
        return () => sseConnections.delete(jobId); // unsubscribe function on client disconnection
    }

    /**
     * Handles an extracted budget record draft from the audio processing service over a jobid SSE stream.
     * 
     * @param jobId The jobId of the audio processing that will lead to a budget record draft creation.
     * @param draft The budget record draft to handle.
     * 
     * @returns A promise resolving when the draft is handled.
     */
    async function handleDraft(jobId: string, draft: BudgetRecordDraft) {
        if (!draft.amount || !draft.category || !draft.description) {
            logger.warn(`[BudgetService] Incomplete budget record received: ${JSON.stringify(draft)}`);
            return;
        }

        const categoryRecord = await prisma.budgetCategory.findUnique({ where: { name: draft.category } });

        if (!categoryRecord) {
            logger.error(`[BudgetService] Category "${draft.category}" not found.`);
            return;
        }

        // notify clients that a new draft is available for the given jobId
        const listener = sseConnections.get(jobId);
        if (listener) return listener(draft);

        // nobody listening (yet): keep it for a while
        drafts.set(jobId, draft);
        setTimeout(() => drafts.delete(jobId), DRAFT_TTL_MS);
    }

    /**
     * CRUD operations for budget categories and records.
     * 
     * - createBudgetCategory: Creates a new budget category.
     * - listBudgetCategory: Lists all budget categories.
     * - createBudgetRecord: Creates a new budget record.
     * - listBudgetRecord: Lists all budget records, including their category names.
     */

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
        subscribeToJob,
        handleDraft
    }
}