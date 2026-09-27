// src/types.ts

export type BudgetRecord = {
  id: string
  date: string
  description: string
  category: string
  amount: number
}

export type BudgetCategory = {
  id: string
  name: string
}

/** Draft record extracted by the AI from audio and already saved by the backend (SSE event `budget-record`). */
export type BudgetRecordDraft = {
  amount: number
  category: string
  description: string
}

/** Accepted payload for creating a new budget record. */
export type NewBudgetRecord = {
  amount: number
  description: string
  categoryId: string
}
