// src/components/RecordForm.tsx
import { useEffect, useRef, useState, type FormEvent } from 'react'
import AudioRecorder, { type RecorderStatus } from './AudioRecorder'
import ImageUploader, { type UploaderStatus } from './ImageUploader'
import { createBudgetRecord, listBudgetCategories, uploadBudgetRecordAudio, uploadBudgetRecordImage, waitForBudgetRecord } from '../api'
import type { BudgetCategory, BudgetRecordDraft, BudgetRecordSource, BudgetRecordType, PipelineStage } from '../types'

// The backend saves the file with the extension of the submitted filename.
const extensionFor = (mimeType: string) => {
  if (mimeType.includes('ogg')) return 'ogg'
  if (mimeType.includes('mp4')) return 'mp4'

  return 'webm'
}

const stopTracks = (recorder: MediaRecorder | null) => {
  recorder?.stream.getTracks().forEach((track) => track.stop())
}

// The backend stores the type in the sign of the amount: negative for expenses, positive for income.
const RECORD_TYPES: { value: BudgetRecordType; label: string; activeClassName: string }[] = [
  { value: 'expense', label: 'Expense', activeClassName: 'bg-rose-600 text-white' },
  { value: 'income', label: 'Income', activeClassName: 'bg-teal-600 text-white' },
]

type RecordFormProps = {
  onSubmitted: () => void
}

export default function RecordForm({ onSubmitted }: RecordFormProps) {
  const [recordType, setRecordType] = useState<BudgetRecordType>('expense')
  // Always positive: the sign is applied on submit from the record type.
  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [categories, setCategories] = useState<BudgetCategory[]>([])

  const [status, setStatus] = useState<RecorderStatus>('idle')
  const [errorMessage, setErrorMessage] = useState('')
  const [imageStatus, setImageStatus] = useState<UploaderStatus>('idle')
  const [imageErrorMessage, setImageErrorMessage] = useState('')
  // Last completed stage of the AI pipeline, null while the file has only been uploaded.
  // Shared by audio and image: only one of them can be processed at a time.
  const [stage, setStage] = useState<PipelineStage | null>(null)

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')

  const isProcessing = status === 'processing' || imageStatus === 'processing'

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

  // When the modal closes: release the microphone and close the SSE stream.
  useEffect(
    () => () => {
      stopTracks(recorderRef.current)
      budgetRecordRef.current?.abort()
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

  const fillFromDraft = (draft: BudgetRecordDraft) => {
    setRecordType(draft.type)
    setAmount(String(draft.amount))
    setDescription(draft.description)

    // The AI returns the category name, the select works with ids.
    const category = categories.find((item) => item.name.toLowerCase() === draft.category.toLowerCase())
    if (category) setCategoryId(category.id)
  }

  // Waits for the draft extracted by the AI pipeline from the uploaded file and fills in the form with it.
  const fillFromJob = async (jobId: string, source: BudgetRecordSource) => {
    const budgetRecord = new AbortController()
    budgetRecordRef.current = budgetRecord

    const draft = await waitForBudgetRecord(jobId, source, budgetRecord.signal, setStage)

    // The draft is only a proposal: fill in the form and let the user review and save it.
    fillFromDraft(draft)
  }

  const handleRecorderToggle = async () => {
    if (status !== 'recording') {
      // Only one source at a time: clear the outcome of the last image.
      setImageStatus('idle')
      return startRecording()
    }

    setStatus('processing')
    setStage(null)

    try {
      const audio = await stopRecording()

      if (audio.size === 0) throw new Error('Empty recording')

      const jobId = await uploadBudgetRecordAudio(audio, `recording.${extensionFor(audio.type)}`)

      await fillFromJob(jobId, 'audio')
      setStatus('done')
    } catch (error) {
      // Modal closed while waiting: the component is gone, nothing to show.
      if (budgetRecordRef.current?.signal.aborted) return

      console.error('audio budget record error', error)

      setErrorMessage('Audio processing failed, please try again.')
      setStatus('error')
    }
  }

  const handleImageSelect = async (image: File) => {
    // Only one source at a time: clear the outcome of the last recording.
    setStatus('idle')
    setImageErrorMessage('')
    setImageStatus('processing')
    setStage(null)

    try {
      const jobId = await uploadBudgetRecordImage(image)

      await fillFromJob(jobId, 'image')
      setImageStatus('done')
    } catch (error) {
      // Modal closed while waiting: the component is gone, nothing to show.
      if (budgetRecordRef.current?.signal.aborted) return

      console.error('image budget record error', error)

      setImageErrorMessage('Image processing failed, please try again.')
      setImageStatus('error')
    }
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    setSubmitError('')
    setIsSubmitting(true)

    try {
      const absoluteAmount = Math.abs(Number(amount))

      await createBudgetRecord({
        amount: recordType === 'expense' ? -absoluteAmount : absoluteAmount,
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
      <AudioRecorder
        status={status}
        stage={stage}
        errorMessage={errorMessage}
        disabled={imageStatus === 'processing'}
        onToggle={handleRecorderToggle}
      />

      <ImageUploader
        status={imageStatus}
        stage={stage}
        errorMessage={imageErrorMessage}
        disabled={status === 'recording' || status === 'processing'}
        onSelect={handleImageSelect}
      />

      <div className="flex flex-col gap-1.5">
        <span id="record-type-label" className="text-xs font-medium text-slate-600">
          Type
        </span>

        <div
          role="radiogroup"
          aria-labelledby="record-type-label"
          className="grid grid-cols-2 gap-1 rounded-lg border border-slate-200 bg-slate-50 p-1"
        >
          {RECORD_TYPES.map((item) => (
            <button
              key={item.value}
              type="button"
              role="radio"
              aria-checked={recordType === item.value}
              disabled={isProcessing}
              onClick={() => setRecordType(item.value)}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition disabled:opacity-50 ${
                recordType === item.value ? item.activeClassName : 'text-slate-600 hover:bg-white'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="amount" className="text-xs font-medium text-slate-600">
          Amount (€)
        </label>

        <input
          id="amount"
          type="number"
          step="0.01"
          min="0"
          required
          disabled={isProcessing}
          value={amount}
          // Only positive amounts: the sign comes from the type toggle, so "-" can't be typed or pasted.
          onKeyDown={(event) => {
            if (event.key === '-') event.preventDefault()
          }}
          onChange={(event) => setAmount(event.target.value.replace('-', ''))}
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
