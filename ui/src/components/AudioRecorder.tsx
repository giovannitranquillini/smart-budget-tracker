// src/components/AudioRecorder.tsx
import { useEffect, useState } from 'react'
import { MicIcon, StopIcon } from './ui/icons'

export type RecorderStatus = 'idle' | 'recording' | 'processing' | 'done' | 'error'

type AudioRecorderProps = {
  status: RecorderStatus
  errorMessage?: string
  onToggle: () => void
}

const LABELS: Record<RecorderStatus, string> = {
  idle: 'Detta il movimento e lascia che l’AI compili la form',
  recording: 'Sto ascoltando… premi stop quando hai finito',
  processing: 'Sto elaborando l’audio…',
  done: 'Trascrizione pronta: controlla i campi e salva',
  error: 'Non sono riuscito a leggere l’audio',
}

export default function AudioRecorder({ status, errorMessage, onToggle }: AudioRecorderProps) {
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const [wasRecording, setWasRecording] = useState(false)

  const isRecording = status === 'recording'
  const isProcessing = status === 'processing'

  // Azzera il contatore all'inizio di ogni nuova registrazione, senza aspettare
  // il primo tick dell'intervallo.
  if (isRecording !== wasRecording) {
    setWasRecording(isRecording)

    if (isRecording) setElapsedSeconds(0)
  }

  // Solo feedback visivo: il timer segue lo stato, non il MediaRecorder.
  // Il contatore riparte da zero a ogni registrazione ed è visibile solo mentre
  // si registra, quindi non serve resettarlo allo stop.
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

  const buttonClass = isRecording
    ? 'animate-pulse bg-red-500 hover:bg-red-600'
    : 'bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300'

  return (
    <div className="flex items-center gap-3 rounded-xl border border-indigo-100 bg-indigo-50/60 p-3">
      <button
        type="button"
        onClick={onToggle}
        disabled={isProcessing}
        aria-label={isRecording ? 'Ferma registrazione' : 'Avvia registrazione'}
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

        <span className="text-xs text-slate-400">
          {isRecording ? formatTime(elapsedSeconds) : 'Es. «ieri ho speso 12 euro di pizza»'}
        </span>
      </div>
    </div>
  )
}
