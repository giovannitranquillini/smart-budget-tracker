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
        listBudgetRecord
    }
}