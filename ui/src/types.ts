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

/** Draft record extracted by the AI from audio, used to fill in the form (SSE event `budget-record`). */
export type BudgetRecordDraft = {
  amount: number
  category: string
  description: string
}

/** Completed stage of the AI pipeline (SSE event `stage`), named after the backend routing key. */
export type PipelineStage = 'audio.processed' | 'llm.processed'

/** Accepted payload for creating a new budget record. */
export type NewBudgetRecord = {
  amount: number
  description: string
  categoryId: string
}
