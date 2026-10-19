// src/api.ts
import type { BudgetCategory, BudgetRecord, BudgetRecordDraft, BudgetRecordSource, BudgetRecordType, NewBudgetRecord, PipelineStage } from './types'

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3001'

/** Record as returned by GET /budget/record (category included by the backend). */
type BudgetRecordResponse = {
  id: string
  type: BudgetRecordType
  amount: number // in cents
  description: string
  date: string
  categoryId: string
  category: { name: string } | null
}

/** Error of a request answered with a non-2xx status: the status lets callers tell e.g. a 409 from a 500. */
export class ApiError extends Error {
  status: number

  constructor(message: string, status: number) {
    super(message)
    this.status = status
  }
}

const request = async (path: string, init?: RequestInit) => {
  const response = await fetch(`${API_URL}${path}`, init)

  if (!response.ok) {
    throw new ApiError(`${init?.method ?? 'GET'} ${path} failed with status ${response.status}`, response.status)
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
    type: record.type,
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

export const deleteBudgetRecord = async (id: string): Promise<void> => {
  await request(`/budget/record/${id}`, { method: 'DELETE' })
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

/**
 * Sends the image to the backend, which queues it for OCR.
 * The backend responds 202 with the jobId: the result then arrives via waitForBudgetRecord.
 */
export const uploadBudgetRecordImage = async (image: File): Promise<string> => {
  const formData = new FormData()
  formData.append('image', image, image.name)

  // No Content-Type: the browser sets it, including the multipart boundary.
  const response = await request('/budget/record/image', { method: 'POST', body: formData })
  const { jobId }: { jobId: string } = await response.json()

  return jobId
}

// If the AI pipeline fails or the record is incomplete, the backend publishes nothing:
// without a timeout we would wait forever.
const BUDGET_RECORD_TIMEOUT_MS = 60_000

/**
 * Opens an SSE stream and resolves with the record as soon as the backend has extracted it from the audio or image.
 * `recordSource` picks the SSE endpoint of the job (the one the file was uploaded to).
 * `signal` closes the stream, e.g. when the modal is closed.
 * `onStage` is called each time a stage of the AI pipeline is completed.
 */
export const waitForBudgetRecord = (
  jobId: string,
  recordSource: BudgetRecordSource,
  signal?: AbortSignal,
  onStage?: (stage: PipelineStage) => void
): Promise<BudgetRecordDraft> =>
  new Promise((resolve, reject) => {
    const source = new EventSource(`${API_URL}/budget/record/${recordSource}/${jobId}/events`)

    const timeout = setTimeout(() => {
      close()
      reject(new Error(`Budget record of job ${jobId} timed out`))
    }, BUDGET_RECORD_TIMEOUT_MS)

    // Must be closed manually: when the server ends the stream, EventSource would reconnect.
    const close = () => {
      clearTimeout(timeout)
      source.close()
    }

    source.addEventListener('stage', (event) => {
      const { stage }: { stage: PipelineStage } = JSON.parse((event as MessageEvent<string>).data)
      onStage?.(stage)
    })

    source.addEventListener('budget-record', (event) => {
      close()
      resolve(JSON.parse((event as MessageEvent<string>).data))
    })

    // not 'error': EventSource already uses it for connection errors
    source.addEventListener('failed', (event) => {
      close()
      const { error }: { error: string } = JSON.parse((event as MessageEvent<string>).data)
      reject(new Error(error))
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

/** Fails with a 409 ApiError if a category with the same name already exists. */
export const createBudgetCategory = async (name: string): Promise<void> => {
  await request('/budget/category', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name }),
  })
}

/** Fails with a 409 ApiError if some records still use the category. */
export const deleteBudgetCategory = async (id: string): Promise<void> => {
  await request(`/budget/category/${id}`, { method: 'DELETE' })
}
