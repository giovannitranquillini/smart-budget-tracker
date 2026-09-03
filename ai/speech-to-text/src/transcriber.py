from faster_whisper import WhisperModel

# A module to transcribe audio using the Whisper model
# Get the audio file path and returns the transcribed text.
# source: https://github.com/SYSTRAN/faster-whisper

def transcribe_audio(file_path):
    print("Load Whisper model...", flush=True)

    model = WhisperModel(
        "small",
        device="cuda",
        compute_type="int8_float16"
    )

    print(f"Transcribing audio file: {file_path}...", flush=True)

    segments, info = model.transcribe(
        file_path,
        beam_size=5
    )

    print("Transcription started", flush=True)
    print(f"Language: {info.language}", flush=True)

    texts = []

    for segment in segments:
        print(
            f"[{segment.start:.2f}s -> {segment.end:.2f}s] {segment.text}",
            flush=True
        )
        texts.append(segment.text)

    print("Transcription finished", flush=True)

    return texts
