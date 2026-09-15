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
 * Il backend risponde 202 con il jobId: il risultato arriva poi via waitForTranscription.
 */
export const uploadBudgetRecordAudio = async (audio: Blob, filename: string): Promise<string> => {
  const formData = new FormData()
  formData.append('audio', audio, filename)

  // Niente Content-Type: lo imposta il browser, con il boundary del multipart.
  const response = await request('/budget/record/audio', { method: 'POST', body: formData })
  const { jobId }: { jobId: string } = await response.json()

  return jobId
}

// Se lo speech-to-text fallisce non pubblica nulla: senza timeout resteremmo in attesa per sempre.
const TRANSCRIPTION_TIMEOUT_MS = 60_000

/**
 * Apre uno stream SSE e risolve con il testo appena il backend riceve la trascrizione.
 * `signal` chiude lo stream, ad esempio quando la modal viene chiusa.
 */
export const waitForTranscription = (jobId: string, signal?: AbortSignal): Promise<string> =>
  new Promise((resolve, reject) => {
    const source = new EventSource(`${API_URL}/budget/record/audio/${jobId}/events`)

    const timeout = setTimeout(() => {
      close()
      reject(new Error(`Transcription of job ${jobId} timed out`))
    }, TRANSCRIPTION_TIMEOUT_MS)

    // Va chiuso a mano: quando il server termina lo stream, EventSource si riconnetterebbe.
    const close = () => {
      clearTimeout(timeout)
      source.close()
    }

    source.addEventListener('transcription', (event) => {
      close()

      const { text }: { text: string } = JSON.parse((event as MessageEvent<string>).data)
      resolve(text)
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
