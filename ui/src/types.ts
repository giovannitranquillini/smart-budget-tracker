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

/** Payload accettato dal backend per la creazione manuale di un record. */
export type NewBudgetRecord = {
  amount: number
  description: string
  categoryId: string
}
