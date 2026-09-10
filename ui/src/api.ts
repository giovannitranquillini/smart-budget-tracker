// src/api.ts
import type { BudgetCategory, BudgetRecord, NewBudgetRecord } from './types'

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3001'

/** Record così come arriva da GET /budget/record (categoria inclusa dal backend). */
type BudgetRecordResponse = {
  id: string
  amount: number
  description: string
  date: string
  categoryId: string
  category: { name: string } | null
}

const request = async (path: string, init?: RequestInit) => {
  const response = await fetch(`${API_URL}${path}`, init)

  if (!response.ok) {
    throw new Error(`${init?.method ?? 'GET'} ${path} failed with status ${response.status}`)
  }

  return response
}

export const listBudgetRecords = async (): Promise<BudgetRecord[]> => {
  const response = await request('/budget/record')
  const records: BudgetRecordResponse[] = await response.json()

  return records.map((record) => ({
    id: record.id,
    date: record.date,
    description: record.description,
    category: record.category?.name ?? '—',
    amount: record.amount,
  }))
}

export const createBudgetRecord = async (record: NewBudgetRecord): Promise<void> => {
  await request('/budget/record', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(record),
  })
}

/**
 * Invia la registrazione al backend, che la mette in coda per la trascrizione.
 * Il backend risponde 202 senza il risultato: l'elaborazione AI è asincrona.
 */
export const uploadBudgetRecordAudio = async (audio: Blob, filename: string): Promise<void> => {
  const formData = new FormData()
  formData.append('audio', audio, filename)

  // Niente Content-Type: lo imposta il browser, con il boundary del multipart.
  await request('/budget/record/audio', { method: 'POST', body: formData })
}

export const listBudgetCategories = async (): Promise<BudgetCategory[]> => {
  const response = await request('/budget/category')

  return response.json()
}
