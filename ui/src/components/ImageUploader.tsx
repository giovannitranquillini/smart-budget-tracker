// src/components/ImageUploader.tsx
import { useRef, type ChangeEvent } from 'react'
import { ImageIcon } from './ui/icons'
import type { PipelineStage } from '../types'

export type UploaderStatus = 'idle' | 'processing' | 'done' | 'error'

type ImageUploaderProps = {
  status: UploaderStatus
  stage: PipelineStage | null
  errorMessage?: string
  // E.g. while a recording is in progress: one source at a time.
  disabled?: boolean
  onSelect: (image: File) => void
}

// Formats the OCR worker can read.
const ACCEPTED_TYPES = 'image/png,image/jpeg,image/webp,image/bmp'

// Progress dot shown while processing: `uploaded` until the first pipeline stage is completed.
const UPLOADED_DOT = { color: 'bg-slate-300', label: 'Image uploaded' }

const STAGE_DOTS: Partial<Record<PipelineStage, { color: string; label: string }>> = {
  'ocr.processed': { color: 'bg-amber-400', label: 'Text read from the image' },
  'llm.processed': { color: 'bg-emerald-500', label: 'Transaction extracted' },
}

const LABELS: Record<UploaderStatus, string> = {
  idle: 'Upload a receipt and let the AI fill in the form',
  processing: 'Processing image…',
  done: 'Form filled in: check the fields and save',
  error: 'Couldn’t read the image',
}

export default function ImageUploader({ status, stage, errorMessage, disabled, onSelect }: ImageUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null)

  const isProcessing = status === 'processing'

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const image = event.target.files?.[0]

    // Reset the input, so that selecting the same file again triggers a new change.
    event.target.value = ''

    if (image) onSelect(image)
  }

  const stageDot = (stage && STAGE_DOTS[stage]) || UPLOADED_DOT

  return (
    <div className="flex items-center gap-3 rounded-xl border border-indigo-100 bg-indigo-50/60 p-3">
      <input ref={inputRef} type="file" accept={ACCEPTED_TYPES} onChange={handleChange} className="hidden" />

      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={isProcessing || disabled}
        aria-label="Upload an image"
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-white shadow-sm transition hover:bg-indigo-700 disabled:bg-indigo-300"
      >
        {isProcessing ? (
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
        ) : (
          <ImageIcon className="h-5 w-5" />
        )}
      </button>

      <div className="flex min-w-0 flex-col">
        <span
          className={`text-sm font-medium ${
            status === 'error' ? 'text-rose-600' : 'text-slate-700'
          }`}
        >
          {status === 'error' && errorMessage ? errorMessage : LABELS[status]}
        </span>

        {isProcessing ? (
          <span role="status" className="flex items-center gap-1.5 text-xs text-slate-500">
            <span className={`h-2.5 w-2.5 rounded-full transition-colors ${stageDot.color}`} />
            {stageDot.label}
          </span>
        ) : (
          <span className="text-xs text-slate-400">PNG, JPEG or WebP, e.g. a photo of a receipt</span>
        )}
      </div>
    </div>
  )
}
