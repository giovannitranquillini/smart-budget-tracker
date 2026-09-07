import { prisma } from "@core/lib/prisma.js";
import { BudgetCategory, BudgetRecord } from "../../generated/prisma/browser.js";

import logger from "@core/lib/logger.js";

export const BudgetService = () => {
    
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
        return await prisma.budgetRecord.findMany();
    }

    return {
        createBudgetCategory,
        listBudgetCategory,
        createBudgetRecord,
        listBudgetRecord
    }
}