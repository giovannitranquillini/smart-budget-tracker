# Setup ambiente Speech-to-Text con faster-whisper (GPU)

Guida per configurare un ambiente Python con `faster-whisper` e supporto GPU CUDA, per trascrizione audio in batch.

## Requisiti

- GPU NVIDIA con driver installato
- Python 3.12
- ~4GB di VRAM (testato con modello `small`)

## 1. Verifica che la GPU sia visibile al sistema

```bash
nvidia-smi
```

Prendi nota del valore **CUDA Version** mostrato in alto a destra: ti servirà al passo 4 per scegliere i pacchetti giusti.

Se questo comando fallisce (`command not found` o errori di driver), il driver NVIDIA non è installato correttamente. Prova:

```bash
ubuntu-drivers devices
sudo ubuntu-drivers autoinstall
sudo reboot
```

Dopo il riavvio, ripeti `nvidia-smi` per confermare che la GPU sia visibile prima di proseguire.

## 2. Crea l'ambiente virtuale

```bash
cd /home/giovanni/Desktop/smart-budget-tracker/ai/speech-to-text
python3 -m venv whisper-env
source whisper-env/bin/activate
```

> Per ricreare l'ambiente da zero (es. dopo problemi): `rm -rf whisper-env` prima del comando sopra.

## 3. Installa faster-whisper

```bash
pip install --upgrade pip
pip install faster-whisper

# or

pip install -r requirements.txt
```

## 4. Installa le librerie NVIDIA (cuBLAS / cuDNN)

Scegli in base alla **CUDA Version** vista al passo 1:

**CUDA 12.x:**
```bash
pip install nvidia-cublas-cu12 nvidia-cudnn-cu12
```

**CUDA 11.x:**
```bash
pip install nvidia-cublas-cu11 nvidia-cudnn-cu8
```

## 5. Configura `LD_LIBRARY_PATH` in modo permanente per questo venv

```bash
echo 'export LD_LIBRARY_PATH=`python3 -c "import nvidia.cublas.lib, nvidia.cudnn.lib; print(nvidia.cublas.lib.__path__[0] + \":\" + nvidia.cudnn.lib.__path__[0])"`' >> whisper-env/bin/activate
```

Ricarica l'ambiente perché la modifica abbia effetto:

```bash
deactivate
source whisper-env/bin/activate
```

Verifica che la variabile sia stata settata:

```bash
echo $LD_LIBRARY_PATH
```

Dovresti vedere due path (cublas e cudnn) separati da `:`.

## 6. Script di esempio (`main.py`)

```python
from faster_whisper import WhisperModel

model = WhisperModel("small", device="cuda", compute_type="float16")
segments, info = model.transcribe("audio.mp3", beam_size=5)

for segment in segments:
    print(f"[{segment.start:.2f}s -> {segment.end:.2f}s] {segment.text}")
```

> Nota: `segments` è un generatore. Senza il ciclo `for` che lo consuma, non viene stampato nulla.

## 7. Esegui

```bash
python main.py
```

Al primo avvio il modello (`small`, ~500MB) viene scaricato automaticamente da Hugging Face e messo in cache locale (`~/.cache/huggingface`).

---

## Riepilogo comandi (setup rapido)

```bash
cd /home/giovanni/Desktop/smart-budget-tracker/ai/speech-to-text
nvidia-smi   # controlla CUDA Version prima di continuare

rm -rf whisper-env
python3 -m venv whisper-env
source whisper-env/bin/activate

pip install --upgrade pip
pip install faster-whisper
pip install nvidia-cublas-cu12 nvidia-cudnn-cu12   # adatta cu12/cu11 in base a nvidia-smi

echo 'export LD_LIBRARY_PATH=`python3 -c "import nvidia.cublas.lib, nvidia.cudnn.lib; print(nvidia.cublas.lib.__path__[0] + \":\" + nvidia.cudnn.lib.__path__[0])"`' >> whisper-env/bin/activate
deactivate
source whisper-env/bin/activate

python main.py
```

## Troubleshooting

| Errore | Causa probabile | Soluzione |
|---|---|---|
| `TypeError: expected str, bytes or os.PathLike object, not NoneType` | `__file__` non disponibile su namespace package NVIDIA | Usa `__path__[0]` invece di `os.path.dirname(__file__)` (vedi passo 5) |
| `RuntimeError: CUDA failed with error no CUDA-capable device is detected` | Driver NVIDIA non caricato o mismatch di versione | Verifica `nvidia-smi`, reinstalla driver, riavvia |
| `CUDA out of memory` | VRAM insufficiente per il modello scelto | Usa modello più piccolo (`base`) o `compute_type="int8_float16"` |
| Warning HF Hub rate limit | Nessun token Hugging Face configurato | Opzionale: imposta `HF_TOKEN` per download più veloci |