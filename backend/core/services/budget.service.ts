import { prisma } from "@core/lib/prisma.js";
import { BudgetCategory, BudgetRecord } from "../../generated/prisma/browser.js";

import logger from "@core/lib/logger.js";

export const BudgetService = () => {
    
    async function createBudgetCategory(params: { name: string }) {
        logger.info(`[BudgetService] Creating new budget category.`);
        await prisma.budgetCategory.create({data: params});
    }

    async function createBudgetRecord(params: { amount: number; description: string, date: Date, categoryId: string }) {
        logger.info(`[BudgetService] Creating new budget record.`);
        await prisma.budgetRecord.create({data: params});
    }

    return {
        createBudgetCategory,
        createBudgetRecord
    }
}