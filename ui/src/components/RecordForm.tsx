// src/components/RecordForm.tsx
import { useEffect, useRef, useState, type FormEvent } from 'react'
import AudioRecorder, { type RecorderStatus } from './AudioRecorder'
import { createBudgetRecord, listBudgetCategories, uploadBudgetRecordAudio, waitForBudgetRecord } from '../api'
import type { BudgetCategory } from '../types'

// How long the confirmation stays visible before the modal closes.
const SUCCESS_DELAY_MS = 1500

// The backend saves the file with the extension of the submitted filename.
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

        if (!ignore) setSubmitError('Could not load categories.')
      })

    return () => {
      ignore = true
    }
  }, [])

  const recorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const budgetRecordRef = useRef<AbortController | null>(null)
  const successTimeoutRef = useRef<number | undefined>(undefined)

  // When the modal closes: release the microphone, close the SSE stream and cancel the delayed close.
  useEffect(
    () => () => {
      stopTracks(recorderRef.current)
      budgetRecordRef.current?.abort()
      window.clearTimeout(successTimeoutRef.current)
    },
    []
  )

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

      setErrorMessage('Microphone unavailable: check your browser permissions.')
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

      const jobId = await uploadBudgetRecordAudio(audio, `recording.${extensionFor(audio.type)}`)

      const budgetRecord = new AbortController()
      budgetRecordRef.current = budgetRecord

      await waitForBudgetRecord(jobId, budgetRecord.signal)

      // The backend has already saved the record: show the confirmation, then close and reload the list.
      setStatus('done')
      successTimeoutRef.current = window.setTimeout(onSubmitted, SUCCESS_DELAY_MS)
    } catch (error) {
      // Modal closed while waiting: the component is gone, nothing to show.
      if (budgetRecordRef.current?.signal.aborted) return

      console.error('audio budget record error', error)

      setErrorMessage('Audio processing failed, please try again.')
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

      setSubmitError('Save failed, please try again.')
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
          Amount (€)
        </label>

        <input
          id="amount"
          type="number"
          step="0.01"
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
          Description
        </label>

        <input
          id="description"
          type="text"
          required
          disabled={isProcessing}
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          placeholder="Grocery shopping"
          className={inputClass}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="category" className="text-xs font-medium text-slate-600">
          Category
        </label>

        <select
          id="category"
          required
          disabled={isProcessing || categories.length === 0}
          value={categoryId}
          onChange={(event) => setCategoryId(event.target.value)}
          className={inputClass}
        >
          {categories.length === 0 && <option value="">No categories available</option>}

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
        {isSubmitting ? 'Saving…' : 'Save transaction'}
      </button>
    </form>
  )
}
