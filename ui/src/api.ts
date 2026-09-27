// src/api.ts
import type { BudgetCategory, BudgetRecord, BudgetRecordDraft, NewBudgetRecord } from './types'

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3001'

/** Record as returned by GET /budget/record (category included by the backend). */
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
 * Sends the recording to the backend, which queues it for transcription.
 * The backend responds 202 with the jobId: the result then arrives via waitForBudgetRecord.
 */
export const uploadBudgetRecordAudio = async (audio: Blob, filename: string): Promise<string> => {
  const formData = new FormData()
  formData.append('audio', audio, filename)

  // No Content-Type: the browser sets it, including the multipart boundary.
  const response = await request('/budget/record/audio', { method: 'POST', body: formData })
  const { jobId }: { jobId: string } = await response.json()

  return jobId
}

// If the AI pipeline fails or the record is incomplete, the backend publishes nothing:
// without a timeout we would wait forever.
const BUDGET_RECORD_TIMEOUT_MS = 60_000

/**
 * Opens an SSE stream and resolves with the record as soon as the backend has extracted it from the audio.
 * `signal` closes the stream, e.g. when the modal is closed.
 */
export const waitForBudgetRecord = (jobId: string, signal?: AbortSignal): Promise<BudgetRecordDraft> =>
  new Promise((resolve, reject) => {
    const source = new EventSource(`${API_URL}/budget/record/audio/${jobId}/events`)

    const timeout = setTimeout(() => {
      close()
      reject(new Error(`Budget record of job ${jobId} timed out`))
    }, BUDGET_RECORD_TIMEOUT_MS)

    // Must be closed manually: when the server ends the stream, EventSource would reconnect.
    const close = () => {
      clearTimeout(timeout)
      source.close()
    }

    source.addEventListener('budget-record', (event) => {
      close()
      resolve(JSON.parse((event as MessageEvent<string>).data))
    })

    signal?.addEventListener('abort', () => {
      close()
      reject(signal.reason)
    })
  })

export const listBudgetCategories = async (): Promise<BudgetCategory[]> => {
  const response = await request('/budget/category')

  return response.json()
}
