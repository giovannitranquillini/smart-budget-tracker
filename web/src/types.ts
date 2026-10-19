// src/types.ts

export type BudgetRecord = {
  id: string
  date: string
  description: string
  category: string
  type: BudgetRecordType
  // In cents, always positive: the direction is in type.
  amount: number
}

export type BudgetCategory = {
  id: string
  name: string
}

/** Whether the record is money spent (outcome) or received (income). */
export type BudgetRecordType = 'income' | 'outcome'

/** Draft record extracted by the AI from audio or image, used to fill in the form (SSE event `budget-record`). */
export type BudgetRecordDraft = {
  type: BudgetRecordType
  // In cents, always positive: the direction is in type.
  amount: number
  category: string
  description: string
}

/** Completed stage of the AI pipeline (SSE event `stage`), named after the backend routing key. */
export type PipelineStage = 'audio.processed' | 'ocr.processed' | 'llm.processed'

/** Input the AI pipeline extracts the record from: each one has its own upload and SSE endpoint. */
export type BudgetRecordSource = 'audio' | 'image'

/** Accepted payload for creating a new budget record. */
export type NewBudgetRecord = {
  type: BudgetRecordType
  // In cents, always positive: the direction is in type.
  amount: number
  description: string
  categoryId: string
}
