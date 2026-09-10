// src/components/RecordForm.tsx
import { useEffect, useRef, useState, type FormEvent } from 'react'
import AudioRecorder, { type RecorderStatus } from './AudioRecorder'
import { createBudgetRecord, listBudgetCategories, uploadBudgetRecordAudio } from '../api'
import type { BudgetCategory } from '../types'

// Il backend salva il file con l'estensione del nome inviato.
const extensionFor = (mimeType: string) => {
  if (mimeType.includes('ogg')) return 'ogg'
  if (mimeType.includes('mp4')) return 'mp4'

  return 'webm'
}

const stopTracks = (recorder: MediaRecorder | null) => {
  recorder?.stream.getTracks().forEach((track) => track.stop())
}

type RecordFormProps = {
  onSubmitted: () => void
}

export default function RecordForm({ onSubmitted }: RecordFormProps) {
  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [categories, setCategories] = useState<BudgetCategory[]>([])

  const [status, setStatus] = useState<RecorderStatus>('idle')
  const [errorMessage, setErrorMessage] = useState('')

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')

  const isProcessing = status === 'processing'

  useEffect(() => {
    let ignore = false

    listBudgetCategories()
      .then((data) => {
        if (ignore) return

        setCategories(data)
        setCategoryId((current) => current || data[0]?.id || '')
      })
      .catch((error) => {
        console.error('listBudgetCategories error', error)

        if (!ignore) setSubmitError('Impossibile caricare le categorie.')
      })

    return () => {
      ignore = true
    }
  }, [])

  const recorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])

  // Se la modal si chiude durante la registrazione, libera il microfono.
  useEffect(() => () => stopTracks(recorderRef.current), [])

  const startRecording = async () => {
    setErrorMessage('')

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const recorder = new MediaRecorder(stream)

      chunksRef.current = []
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data)
      }

      recorder.start()
      recorderRef.current = recorder
      setStatus('recording')
    } catch (error) {
      console.error('getUserMedia error', error)

      setErrorMessage('Microfono non disponibile: controlla i permessi del browser.')
      setStatus('error')
    }
  }

  const stopRecording = () =>
    new Promise<Blob>((resolve) => {
      const recorder = recorderRef.current

      if (!recorder) return resolve(new Blob())

      recorder.onstop = () => {
        stopTracks(recorder)
        recorderRef.current = null
        resolve(new Blob(chunksRef.current, { type: recorder.mimeType }))
      }

      recorder.stop()
    })

  const handleRecorderToggle = async () => {
    if (status !== 'recording') return startRecording()

    setStatus('processing')

    try {
      const audio = await stopRecording()

      if (audio.size === 0) throw new Error('Empty recording')

      await uploadBudgetRecordAudio(audio, `recording.${extensionFor(audio.type)}`)

      setStatus('done')
    } catch (error) {
      console.error('uploadBudgetRecordAudio error', error)

      setErrorMessage('Invio dell’audio non riuscito, riprova.')
      setStatus('error')
    }
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    setSubmitError('')
    setIsSubmitting(true)

    try {
      await createBudgetRecord({
        amount: Number(amount),
        description,
        categoryId,
      })

      onSubmitted()
    } catch (error) {
      console.error('createBudgetRecord error', error)

      setSubmitError('Salvataggio non riuscito, riprova.')
      setIsSubmitting(false)
    }
  }

  const inputClass =
    'w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 disabled:bg-slate-50 disabled:text-slate-400'

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <AudioRecorder status={status} errorMessage={errorMessage} onToggle={handleRecorderToggle} />

      <div className="flex flex-col gap-1.5">
        <label htmlFor="amount" className="text-xs font-medium text-slate-600">
          Importo (€)
        </label>

        <input
          id="amount"
          type="number"
          step="0.01"
          min="0"
          required
          disabled={isProcessing}
          value={amount}
          onChange={(event) => setAmount(event.target.value)}
          placeholder="12.50"
          className={inputClass}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="description" className="text-xs font-medium text-slate-600">
          Descrizione
        </label>

        <input
          id="description"
          type="text"
          required
          disabled={isProcessing}
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          placeholder="Spesa al supermercato"
          className={inputClass}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="category" className="text-xs font-medium text-slate-600">
          Categoria
        </label>

        <select
          id="category"
          required
          disabled={isProcessing || categories.length === 0}
          value={categoryId}
          onChange={(event) => setCategoryId(event.target.value)}
          className={inputClass}
        >
          {categories.length === 0 && <option value="">Nessuna categoria disponibile</option>}

          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </select>
      </div>

      {submitError && (
        <p role="alert" className="text-sm text-rose-600">
          {submitError}
        </p>
      )}

      <button
        type="submit"
        disabled={isProcessing || isSubmitting || !categoryId}
        className="mt-1 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-indigo-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:bg-indigo-300"
      >
        {isSubmitting ? 'Salvataggio…' : 'Salva movimento'}
      </button>
    </form>
  )
}
