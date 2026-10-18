// src/components/AudioRecorder.tsx
import { useEffect, useState } from 'react'
import { MicIcon, StopIcon } from './ui/icons'
import type { PipelineStage } from '../types'

export type RecorderStatus = 'idle' | 'recording' | 'processing' | 'done' | 'error'

type AudioRecorderProps = {
  status: RecorderStatus
  stage: PipelineStage | null
  errorMessage?: string
  // E.g. while an image is being processed: one source at a time.
  disabled?: boolean
  onToggle: () => void
}

// Progress dot shown while processing: `uploaded` until the first pipeline stage is completed.
const UPLOADED_DOT = { color: 'bg-slate-300', label: 'Audio uploaded' }

const STAGE_DOTS: Partial<Record<PipelineStage, { color: string; label: string }>> = {
  'audio.processed': { color: 'bg-amber-400', label: 'Audio transcribed' },
  'llm.processed': { color: 'bg-emerald-500', label: 'Transaction extracted' },
}

const LABELS: Record<RecorderStatus, string> = {
  idle: 'Dictate the transaction and let the AI fill in the form',
  recording: 'Listening… press stop when you’re done',
  processing: 'Processing audio…',
  done: 'Form filled in: check the fields and save',
  error: 'Couldn’t read the audio',
}

export default function AudioRecorder({ status, stage, errorMessage, disabled, onToggle }: AudioRecorderProps) {
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const [wasRecording, setWasRecording] = useState(false)

  const isRecording = status === 'recording'
  const isProcessing = status === 'processing'

  // Reset the counter at the start of each new recording, without waiting
  // for the first interval tick.
  if (isRecording !== wasRecording) {
    setWasRecording(isRecording)

    if (isRecording) setElapsedSeconds(0)
  }

  // Visual feedback only: the timer follows the status, not the MediaRecorder.
  // The counter restarts from zero on each recording and is only visible while
  // recording, so there is no need to reset it on stop.
  useEffect(() => {
    if (!isRecording) return

    let seconds = 0

    const intervalId = window.setInterval(() => {
      seconds += 1
      setElapsedSeconds(seconds)
    }, 1000)

    return () => window.clearInterval(intervalId)
  }, [isRecording])

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60)
    const rest = seconds % 60

    return `${String(minutes).padStart(2, '0')}:${String(rest).padStart(2, '0')}`
  }

  const stageDot = (stage && STAGE_DOTS[stage]) || UPLOADED_DOT

  const buttonClass = isRecording
    ? 'animate-pulse bg-red-500 hover:bg-red-600'
    : 'bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300'

  return (
    <div className="flex items-center gap-3 rounded-xl border border-indigo-100 bg-indigo-50/60 p-3">
      <button
        type="button"
        onClick={onToggle}
        disabled={isProcessing || disabled}
        aria-label={isRecording ? 'Stop recording' : 'Start recording'}
        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-white shadow-sm transition ${buttonClass}`}
      >
        {isProcessing ? (
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
        ) : isRecording ? (
          <StopIcon className="h-5 w-5" />
        ) : (
          <MicIcon className="h-5 w-5" />
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
          <span className="text-xs text-slate-400">
            {isRecording ? formatTime(elapsedSeconds) : 'E.g. “I spent 12 euros on pizza yesterday”'}
          </span>
        )}
      </div>
    </div>
  )
}
