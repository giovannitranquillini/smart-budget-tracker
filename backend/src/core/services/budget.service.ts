import { BudgetCategory, BudgetRecord } from "../../generated/prisma/browser.js";
import type { BudgetRecordType } from "../../generated/prisma/enums.js";

import logger from "@core/lib/logger.js";
import type { PrismaClient } from "../../generated/prisma/client.js";

/** Record as extracted by the LLM: fields it cannot determine are null. */
export type LlmBudgetRecord = {
    type: BudgetRecordType | null;
    amount: number | null; // in euros, e.g. 12.5
    category: string | null;
    description: string | null;
};

/** Record sent to the UI to fill in the form: same format as the saved records. */
export type BudgetRecordDraft = {
    type: BudgetRecordType;
    amount: number;
    category: string;
    description: string;
};

/**
 * The BudgetService is responsible for handling budget records and categories domain logic. 
 * 
 * - Basic CRUD operations for budget records and categories are provided.
 */
export const BudgetService = (deps: { prisma: PrismaClient }) => {
    
    const { prisma } = deps;

    /**
     * Handles a budget record extracted by the LLM.
     * The record is converted to the format of the saved records: amount from euros to cents.
     *
     * @param jobId The jobId of the ai processing that will lead to a budget record draft creation.
     * @param record The budget record extracted by the LLM.
     *
     * @returns A promise resolving when the draft is handled.
     */
    async function buildDraft(record: LlmBudgetRecord): Promise<{ draft: BudgetRecordDraft} | { error: string }> {
        if (!record.amount || !record.category || !record.description || (record.type !== "outcome" && record.type !== "income")) {
            logger.warn(`[BudgetService] Incomplete budget record received: ${JSON.stringify(record)}`);
            return { error: "The record could not be fully extracted" };
        }

        const draft: BudgetRecordDraft = {
            type: record.type,
            amount: Math.round(Math.abs(record.amount) * 100),
            category: record.category,
            description: record.description
        };

        if (draft.amount === 0) {
            logger.warn(`[BudgetService] Budget record with a zero amount received: ${JSON.stringify(record)}`);
            return { error: "The record could not be fully extracted" };
        }

        const categoryRecord = await prisma.budgetCategory.findUnique({ where: { name: draft.category } });

        if (!categoryRecord) {
            logger.error(`[BudgetService] Category "${draft.category}" not found.`);
            return { error: `Category "${draft.category}" not found` };
        }

        return { draft };
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

        // check if the category already exists
        const existing = await prisma.budgetCategory.findUnique({ where: { name } });
        if (existing) return false;

        await prisma.budgetCategory.create({data: { name }});
        return true;
    }

    async function listBudgetCategory(): Promise<BudgetCategory[]> {
        logger.info(`[BudgetService] Listing budget categories.`);
        return await prisma.budgetCategory.findMany({ orderBy: { name: 'asc' } });
    }

    async function deleteBudgetCategory(id: string): Promise<boolean> {
        logger.info(`[BudgetService] Deleting budget category ${id}.`);

        // cannot delete a used category
        const usedBy = await prisma.budgetRecord.count({ where: { categoryId: id } });
        if (usedBy > 0) return false;

        const { count } = await prisma.budgetCategory.deleteMany({ where: { id } });
        return count > 0;
    }

    async function createBudgetRecord(params: { amount: number; description: string, categoryId: string, type: BudgetRecordType }) {
        logger.info(`[BudgetService] Creating new budget record.`);

        const payload = {
            ...params,
            date: new Date()
        }

        await prisma.budgetRecord.create({data: payload});
    }

    async function listBudgetRecord(): Promise<BudgetRecord[]> {
        logger.info(`[BudgetService] Listing budget records.`);

        return await prisma.budgetRecord.findMany({
            include: { category: { select: { name: true } } },
            orderBy: { date: 'desc' }
        });
    }

    async function deleteBudgetRecord(id: string): Promise<boolean> {
        logger.info(`[BudgetService] Deleting budget record ${id}.`);

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
        buildDraft
    }
}