CREATE TYPE "BudgetRecordType" AS ENUM ('income', 'outcome');

-- the type of the existing records was stored in the sign of the amount
ALTER TABLE "BudgetRecord" ADD COLUMN "type" "BudgetRecordType";
UPDATE "BudgetRecord" SET "type" = CASE WHEN "amount" < 0 THEN 'outcome'::"BudgetRecordType" ELSE 'income'::"BudgetRecordType" END;
ALTER TABLE "BudgetRecord" ALTER COLUMN "type" SET NOT NULL;

-- amount in cents, always positive: the direction is now in type
ALTER TABLE "BudgetRecord" ALTER COLUMN "amount" TYPE INTEGER USING ABS(ROUND("amount" * 100))::INTEGER;
