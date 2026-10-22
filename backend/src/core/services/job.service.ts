import logger from "@core/lib/logger.js";
import type { BudgetRecordType } from "../../generated/prisma/enums.js";

/** Record sent to the UI to fill in the form: same format as the saved records. */
export type BudgetRecordDraft = {
    type: BudgetRecordType;
    amount: number; // in cents, always positive: the direction is in type
    category: string;
    description: string;
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


export const JobService = () => {

    /** 
     * Registers who is waiting for the draft of jobId. 
     * Returns the function to stop listening.
     * 
     * @param jobId The jobId of the ai processing that will lead to a budget record draft creation.
     * @param listener The functions to call when a pipeline stage is completed and when the draft is available.
     *
     * @returns A function to stop listening for drafts.
     */
    function subscribe(jobId: string, listener: JobListener): () => void {
        const failure = failures.get(jobId);
        if (failure !== undefined) {
            failures.delete(jobId);
            listener.onFailure(failure); // immediately notify the failure
            return () => { };
        }

        const ready = drafts.get(jobId);
        if (ready !== undefined) {
            drafts.delete(jobId);
            listener.onDraft(ready); // immediately notify the draft is ready
            return () => { };
        }

        sseConnections.set(jobId, listener); // register the listener for future notifications
        return () => sseConnections.delete(jobId); // unsubscribe function on client disconnection
    }

    /**
     * Notifies the client listening on the jobId SSE stream that a pipeline stage is completed.
     * Stages completed before the client opened the stream are not kept: the draft is what matters.
     *
     * @param jobId The jobId of the ai processing.
     * @param stage The completed pipeline stage.
     */
    function notifyStage(jobId: string, stage: PipelineStage) {
        logger.info(`[BudgetService] Job ${jobId}: stage "${stage}" completed.`);
        sseConnections.get(jobId)?.onStage(stage);
    }

    /**
     * Notifies the client listening on the jobId SSE stream that a new budget record draft is available.
     *
     * @param jobId The jobId of the ai processing.
     * @param record The budget record extracted by the LLM.
     * @returns 
     */
    function notifyDraft(jobId: string, draft: BudgetRecordDraft) {
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
    function notifyFailure(jobId: string, error: string) {
        logger.warn(`[BudgetService] Job ${jobId} failed: ${error}`);

        const listener = sseConnections.get(jobId);
        if (listener) return listener.onFailure(error);

        failures.set(jobId, error);
        setTimeout(() => failures.delete(jobId), DRAFT_TTL_MS);
    }

    return { subscribe, notifyStage, notifyDraft, notifyFailure };
};