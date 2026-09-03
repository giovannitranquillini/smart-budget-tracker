import { useEffect, useRef, useState } from "react";

type RecordingStatus =
  | "idle"
  | "recording"
  | "sending"
  | "success"
  | "error";

  /**
   * FULLY AI GENERATED CODE.
   */
function App() {
  const [status, setStatus] = useState<RecordingStatus>("idle");
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [errorMessage, setErrorMessage] = useState("");

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);

  const isRecording = status === "recording";
  const isSending = status === "sending";

  // Timer della registrazione
  useEffect(() => {
    if (isRecording) {
      timerRef.current = window.setInterval(() => {
        setElapsedSeconds((current) => current + 1);
      }, 1000);
    }

    return () => {
      if (timerRef.current !== null) {
        window.clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [isRecording]);

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;

    return `${String(minutes).padStart(2, "0")}:${String(
      remainingSeconds
    ).padStart(2, "0")}`;
  };

  const startRecording = async () => {
    setErrorMessage("");

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
      });

      const mediaRecorder = new MediaRecorder(stream);

      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      setElapsedSeconds(0);

      mediaRecorder.ondataavailable = (event: BlobEvent) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, {
          type: mediaRecorder.mimeType,
        });

        // Chiude il microfono
        stream.getTracks().forEach((track) => track.stop());

        await sendAudio(audioBlob);
      };

      mediaRecorder.start();

      setStatus("recording");
    } catch (error) {
      console.error("Microphone error:", error);

      setErrorMessage(
        "Non è stato possibile accedere al microfono. Controlla i permessi del browser."
      );

      setStatus("error");
    }
  };

  const stopRecording = () => {
    const recorder = mediaRecorderRef.current;

    if (recorder && recorder.state !== "inactive") {
      recorder.stop();
    }

    setStatus("sending");
  };

  const sendAudio = async (audioBlob: Blob) => {
    try {
      const formData = new FormData();

      formData.append(
        "audio",
        audioBlob,
        "recording.webm"
      );

      const response = await fetch(
        "http://localhost:3001/budget/record/audio",
        {
          method: "POST",
          body: formData,
        }
      );

      if (!response.ok) {
        throw new Error("Upload failed");
      }

      setStatus("success");
    } catch (error) {
      console.error("Upload error:", error);

      setErrorMessage(
        "Si è verificato un problema durante l'invio dell'audio."
      );

      setStatus("error");
    }
  };

  const handleMicrophoneClick = () => {
    if (isRecording) {
      stopRecording();
      return;
    }

    if (status === "sending") {
      return;
    }

    startRecording();
  };

  const reset = () => {
    setStatus("idle");
    setElapsedSeconds(0);
    setErrorMessage("");
    audioChunksRef.current = [];
  };

  return (
    <main className="relative flex min-h-screen w-full items-center justify-center overflow-hidden bg-[#fafbff] px-6">

      {/* Background decoration */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-1/2 top-1/2 h-[500px] w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-indigo-100/40 blur-3xl" />

        <div className="absolute -left-32 -top-32 h-64 w-64 rounded-full bg-violet-100/40 blur-3xl" />

        <div className="absolute -bottom-32 -right-32 h-64 w-64 rounded-full bg-blue-100/40 blur-3xl" />
      </div>

      {/* Main content */}
      <section className="relative z-10 flex w-full max-w-lg flex-col items-center">

        {/* Small badge */}
        <div className="mb-7 flex items-center gap-2 rounded-full border border-slate-200/80 bg-white/80 px-4 py-2 shadow-sm backdrop-blur">
          <span
            className={`h-2 w-2 rounded-full ${
              isRecording
                ? "animate-pulse bg-red-500"
                : status === "success"
                  ? "bg-emerald-500"
                  : "bg-indigo-500"
            }`}
          />

          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            {isRecording
              ? "Registrazione"
              : status === "success"
                ? "Completato"
                : "Audio recorder"}
          </span>
        </div>

        {/* Heading */}
        <div className="text-center">
          <h1 className="text-4xl font-bold tracking-tight text-slate-950 sm:text-5xl">
            Registra il tuo
            <span className="mt-1 block bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent">
              messaggio
            </span>
          </h1>

          <p className="mx-auto mt-5 max-w-md text-base leading-7 text-slate-500">
            Premi il microfono, parla e quando hai finito
            premi nuovamente per inviare la registrazione.
          </p>
        </div>

        {/* Recording area */}
        <div className="relative mt-14 flex h-64 w-full items-center justify-center">

          {/* Animated rings */}
          {isRecording && (
            <>
              <div className="absolute h-56 w-56 animate-ping rounded-full border border-red-300/30" />

              <div className="absolute h-48 w-48 rounded-full border border-red-300/40" />

              <div className="absolute h-40 w-40 rounded-full bg-red-100/50" />
            </>
          )}

          {/* Soft glow */}
          {!isRecording && !isSending && (
            <div className="absolute h-40 w-40 rounded-full bg-indigo-200/30 blur-2xl" />
          )}

          {/* Microphone button */}
          <button
            type="button"
            onClick={handleMicrophoneClick}
            disabled={isSending}
            aria-label={
              isRecording
                ? "Ferma registrazione"
                : "Inizia registrazione"
            }
            className={`
              group
              relative z-10
              flex h-36 w-36
              items-center justify-center
              rounded-full
              transition-all duration-300
              focus:outline-none
              focus:ring-4
              disabled:cursor-not-allowed
              disabled:opacity-70

              ${
                isRecording
                  ? "bg-red-500 shadow-2xl shadow-red-500/30 focus:ring-red-200 hover:bg-red-600"
                  : isSending
                    ? "bg-slate-800 shadow-xl"
                    : status === "success"
                      ? "bg-emerald-500 shadow-xl shadow-emerald-500/25"
                      : "bg-indigo-600 shadow-2xl shadow-indigo-600/30 focus:ring-indigo-200 hover:scale-105 hover:bg-indigo-700"
              }
            `}
          >
            {/* Recording */}
            {isRecording && (
              <div className="flex items-center gap-[4px]">
                <span className="h-5 w-1.5 animate-[pulse_0.8s_ease-in-out_infinite] rounded-full bg-white" />

                <span className="h-9 w-1.5 animate-[pulse_0.6s_ease-in-out_infinite] rounded-full bg-white" />

                <span className="h-6 w-1.5 animate-[pulse_0.9s_ease-in-out_infinite] rounded-full bg-white" />

                <span className="h-11 w-1.5 animate-[pulse_0.7s_ease-in-out_infinite] rounded-full bg-white" />

                <span className="h-7 w-1.5 animate-[pulse_0.5s_ease-in-out_infinite] rounded-full bg-white" />

                <span className="h-4 w-1.5 animate-[pulse_0.8s_ease-in-out_infinite] rounded-full bg-white" />
              </div>
            )}

            {/* Sending */}
            {isSending && (
              <svg
                className="h-10 w-10 animate-spin text-white"
                viewBox="0 0 24 24"
                fill="none"
              >
                <circle
                  cx="12"
                  cy="12"
                  r="9"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  className="opacity-25"
                />

                <path
                  d="M21 12a9 9 0 0 0-9-9"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                />
              </svg>
            )}

            {/* Success */}
            {status === "success" && (
              <svg
                className="h-12 w-12 text-white"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M20 6L9 17l-5-5" />
              </svg>
            )}

            {/* Microphone */}
            {status === "idle" && (
              <svg
                className="h-12 w-12 text-white transition-transform duration-300 group-hover:scale-110"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect
                  x="9"
                  y="2"
                  width="6"
                  height="12"
                  rx="3"
                />

                <path d="M5 10a7 7 0 0 0 14 0" />

                <line
                  x1="12"
                  y1="19"
                  x2="12"
                  y2="22"
                />

                <line
                  x1="8"
                  y1="22"
                  x2="16"
                  y2="22"
                />
              </svg>
            )}

            {/* Error → microphone */}
            {status === "error" && (
              <svg
                className="h-12 w-12 text-white"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect
                  x="9"
                  y="2"
                  width="6"
                  height="12"
                  rx="3"
                />

                <path d="M5 10a7 7 0 0 0 14 0" />

                <line
                  x1="12"
                  y1="19"
                  x2="12"
                  y2="22"
                />

                <line
                  x1="8"
                  y1="22"
                  x2="16"
                  y2="22"
                />
              </svg>
            )}
          </button>
        </div>

        {/* Timer */}
        {isRecording && (
          <div className="mb-5 -mt-2">
            <span className="font-mono text-2xl font-semibold tracking-wider text-slate-800">
              {formatTime(elapsedSeconds)}
            </span>
          </div>
        )}

        {/* Status */}
        <div className="min-h-[76px] text-center">

          {status === "idle" && (
            <>
              <p className="font-medium text-slate-800">
                Tocca il microfono per iniziare
              </p>

              <p className="mt-2 text-sm text-slate-400">
                La registrazione verrà inviata automaticamente
              </p>
            </>
          )}

          {status === "recording" && (
            <>
              <p className="font-semibold text-red-500">
                Sto ascoltando...
              </p>

              <p className="mt-2 text-sm text-slate-400">
                Premi il pulsante quando hai finito
              </p>
            </>
          )}

          {status === "sending" && (
            <>
              <p className="font-semibold text-slate-800">
                Invio della registrazione...
              </p>

              <p className="mt-2 text-sm text-slate-400">
                Non chiudere questa pagina
              </p>
            </>
          )}

          {status === "success" && (
            <>
              <p className="font-semibold text-emerald-600">
                Audio inviato con successo
              </p>

              <button
                type="button"
                onClick={reset}
                className="mt-3 text-sm font-medium text-indigo-600 transition hover:text-indigo-700"
              >
                Registra un altro messaggio →
              </button>
            </>
          )}

          {status === "error" && (
            <>
              <p className="font-semibold text-red-500">
                Qualcosa è andato storto
              </p>

              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
                {errorMessage}
              </p>

              <button
                type="button"
                onClick={reset}
                className="mt-3 text-sm font-medium text-indigo-600 transition hover:text-indigo-700"
              >
                Riprova →
              </button>
            </>
          )}
        </div>

        {/* Bottom hint */}
        <div className="mt-12 flex items-center gap-2 text-xs text-slate-400">
          <svg
            className="h-4 w-4"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" />
            <path d="m9 12 2 2 4-4" />
          </svg>

          <span>La registrazione viene trasmessa in modo sicuro</span>
        </div>
      </section>
    </main>
  );
}

export default App;
