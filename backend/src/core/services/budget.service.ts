import { prisma } from "@core/lib/prisma.js";
import { BudgetCategory, BudgetRecord } from "../../generated/prisma/browser.js";

import logger from "@core/lib/logger.js";

/** Whether the record is money spent or received: once saved, it becomes the sign of the amount. */
export type BudgetRecordType = "expense" | "income";

/** Record extracted by the LLM from the audio: fields it cannot determine are null. */
export type BudgetRecordDraft = {
    type: BudgetRecordType | null;
    amount: number | null; // always positive, the direction is in type
    category: string | null;
    description: string | null;
};

/** Completed stage of the AI pipeline, named after the routing key of its event on the "pipeline" exchange. */
export type PipelineStage = "audio.processed" | "ocr.processed" | "llm.processed";

/** Who is waiting for the updates of a job (the SSE stream opened by the UI). */
export type JobListener = {
    onStage: (stage: PipelineStage) => void;
    onDraft: (draft: BudgetRecordDraft) => void;
    onFailure: (error: string) => void;
};

// How long we keep a draft that arrived before the UI opened the SSE stream
const DRAFT_TTL_MS = 60_000; // 1 minute

// Module level: shared by every BudgetService instance
const sseConnections = new Map<string, JobListener>(); // SSE connections
const drafts = new Map<string, BudgetRecordDraft>(); // drafts that arrived before the UI opened the SSE stream
const failures = new Map<string, string>(); // failures that arrived before the UI opened the SSE stream

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
     * @param listener The functions to call when a pipeline stage is completed and when the draft is available.
     *
     * @returns A function to stop listening for drafts.
     */
    function subscribeToJob(jobId: string, listener: JobListener): () => void {
        
        const failure = failures.get(jobId);
        if (failure !== undefined) {
            failures.delete(jobId);
            listener.onFailure(failure); // immediately notify the failure
            return () => {};
        }

        const ready = drafts.get(jobId);
        if (ready !== undefined) {
            drafts.delete(jobId);
            listener.onDraft(ready); // immediately notify the draft is ready
            return () => {};
        }

        sseConnections.set(jobId, listener); // register the listener for future notifications
        return () => sseConnections.delete(jobId); // unsubscribe function on client disconnection
    }

    /**
     * Notifies the client listening on the jobId SSE stream that a pipeline stage is completed.
     * Stages completed before the client opened the stream are not kept: the draft is what matters.
     *
     * @param jobId The jobId of the audio processing.
     * @param stage The completed pipeline stage.
     */
    function handleStage(jobId: string, stage: PipelineStage) {
        logger.info(`[BudgetService] Job ${jobId}: stage "${stage}" completed.`);
        sseConnections.get(jobId)?.onStage(stage);
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
        if (!draft.amount || !draft.category || !draft.description || (draft.type !== "expense" && draft.type !== "income")) {
            logger.warn(`[BudgetService] Incomplete budget record received: ${JSON.stringify(draft)}`);
            return handleFailure(jobId, "The record could not be fully extracted");
        }

        // the LLM may still add a sign to the amount: the direction is only in type
        draft.amount = Math.abs(draft.amount);

        const categoryRecord = await prisma.budgetCategory.findUnique({ where: { name: draft.category } });

        if (!categoryRecord) {
            logger.error(`[BudgetService] Category "${draft.category}" not found.`);
            return handleFailure(jobId, `Category "${draft.category}" not found`);
        }

        // notify clients that a new draft is available for the given jobId
        const listener = sseConnections.get(jobId);
        if (listener) return listener.onDraft(draft);

        // nobody listening (yet): keep it for a while
        drafts.set(jobId, draft);
        setTimeout(() => drafts.delete(jobId), DRAFT_TTL_MS);
    }

    /**
     * Handles a failed budget record processing job, notifying the client listening on the jobId SSE stream.
     * 
     * @param jobId 
     * @param error 
     * @returns 
     */
    function handleFailure(jobId: string, error: string) {
        logger.warn(`[BudgetService] Job ${jobId} failed: ${error}`);

        const listener = sseConnections.get(jobId);
        if (listener) return listener.onFailure(error);

        failures.set(jobId, error);
        setTimeout(() => failures.delete(jobId), DRAFT_TTL_MS);
    }

    /**
     * CRUD operations for budget categories and records.
     * 
     * - createBudgetCategory: Creates a new budget category, returns false if the name is already taken.
     * - listBudgetCategory: Lists all budget categories, sorted by name.
     * - deleteBudgetCategory: Deletes a budget category, unless it does not exist or some records still use it.
     * - createBudgetRecord: Creates a new budget record.
     * - listBudgetRecord: Lists all budget records, including their category names.
     * - deleteBudgetRecord: Deletes a budget record, returns false if it does not exist.
     */

    async function createBudgetCategory(params: { name: string }): Promise<boolean> {
        logger.info(`[BudgetService] Creating new budget category.`);

        const name = params.name.trim();

        // the name is unique: check it first instead of catching the database error
        const existing = await prisma.budgetCategory.findUnique({ where: { name } });
        if (existing) return false;

        await prisma.budgetCategory.create({data: { name }});
        return true;
    }

    async function listBudgetCategory(): Promise<BudgetCategory[]> {
        logger.info(`[BudgetService] Listing budget categories.`);
        return await prisma.budgetCategory.findMany({ orderBy: { name: 'asc' } });
    }

    async function deleteBudgetCategory(id: string): Promise<"deleted" | "not-found" | "in-use"> {
        logger.info(`[BudgetService] Deleting budget category ${id}.`);

        // records reference their category: deleting a used one would break them
        const usedBy = await prisma.budgetRecord.count({ where: { categoryId: id } });
        if (usedBy > 0) return "in-use";

        const { count } = await prisma.budgetCategory.deleteMany({ where: { id } });
        return count > 0 ? "deleted" : "not-found";
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

    async function deleteBudgetRecord(id: string): Promise<boolean> {
        logger.info(`[BudgetService] Deleting budget record ${id}.`);
        // deleteMany does not throw when the record is missing: the count tells us
        const { count } = await prisma.budgetRecord.deleteMany({ where: { id } });
        return count > 0;
    }

    return {
        createBudgetCategory,
        listBudgetCategory,
        deleteBudgetCategory,
        createBudgetRecord,
        listBudgetRecord,
        deleteBudgetRecord,
        subscribeToJob,
        handleStage,
        handleDraft,
        handleFailure
    }
}