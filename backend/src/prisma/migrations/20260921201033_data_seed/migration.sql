-- Seed migration to populate the categories a little bit

INSERT INTO "BudgetCategory" (id, name, "createdAt", "updatedAt") VALUES
  (gen_random_uuid()::text, 'Groceries', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, 'Transportation', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, 'Housing & Utilities', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, 'Entertainment', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, 'Health & Wellness', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);