# Speech-to-Text environment setup with faster-whisper (GPU)

Guide to setting up a Python environment with `faster-whisper` and CUDA GPU support, for batch audio transcription.

## Requirements

- NVIDIA GPU with the driver installed
- Python 3.12
- ~4GB of VRAM (tested with the `small` model)

## 1. Check that the GPU is visible to the system

```bash
nvidia-smi
```

Take note of the **CUDA Version** value shown in the top right: you'll need it in step 4 to pick the right packages.

If this command fails (`command not found` or driver errors), the NVIDIA driver is not installed correctly. Try:

```bash
ubuntu-drivers devices
sudo ubuntu-drivers autoinstall
sudo reboot
```

After the reboot, run `nvidia-smi` again to confirm the GPU is visible before moving on.

## 2. Create the virtual environment

```bash
cd /home/giovanni/Desktop/smart-budget-tracker/ai/speech-to-text
python3 -m venv whisper-env
source whisper-env/bin/activate
```

> To recreate the environment from scratch (e.g. after problems): `rm -rf whisper-env` before the command above.

## 3. Install faster-whisper

```bash
pip install --upgrade pip
pip install faster-whisper

# or

pip install -r requirements.txt
```

## 4. Install the NVIDIA libraries (cuBLAS / cuDNN)

Choose based on the **CUDA Version** seen in step 1:

**CUDA 12.x:**
```bash
pip install nvidia-cublas-cu12 nvidia-cudnn-cu12
```

**CUDA 11.x:**
```bash
pip install nvidia-cublas-cu11 nvidia-cudnn-cu8
```

## 5. Set `LD_LIBRARY_PATH` permanently for this venv

```bash
echo 'export LD_LIBRARY_PATH=`python3 -c "import nvidia.cublas.lib, nvidia.cudnn.lib; print(nvidia.cublas.lib.__path__[0] + \":\" + nvidia.cudnn.lib.__path__[0])"`' >> whisper-env/bin/activate
```

Reload the environment for the change to take effect:

```bash
deactivate
source whisper-env/bin/activate
```

Check that the variable has been set:

```bash
echo $LD_LIBRARY_PATH
```

You should see two paths (cublas and cudnn) separated by `:`.

## 6. Example script (`main.py`)

```python
from faster_whisper import WhisperModel

model = WhisperModel("small", device="cuda", compute_type="float16")
segments, info = model.transcribe("audio.mp3", beam_size=5)

for segment in segments:
    print(f"[{segment.start:.2f}s -> {segment.end:.2f}s] {segment.text}")
```

> Note: `segments` is a generator. Without the `for` loop consuming it, nothing gets printed.

## 7. Run

```bash
python main.py
```

On the first run the model (`small`, ~500MB) is downloaded automatically from Hugging Face and cached locally (`~/.cache/huggingface`).

---

## Command summary (quick setup)

```bash
cd /home/giovanni/Desktop/smart-budget-tracker/ai/speech-to-text
nvidia-smi   # check the CUDA Version before continuing

rm -rf whisper-env
python3 -m venv whisper-env
source whisper-env/bin/activate

pip install --upgrade pip
pip install faster-whisper
pip install nvidia-cublas-cu12 nvidia-cudnn-cu12   # pick cu12/cu11 based on nvidia-smi

echo 'export LD_LIBRARY_PATH=`python3 -c "import nvidia.cublas.lib, nvidia.cudnn.lib; print(nvidia.cublas.lib.__path__[0] + \":\" + nvidia.cudnn.lib.__path__[0])"`' >> whisper-env/bin/activate
deactivate
source whisper-env/bin/activate

python main.py
```

## Troubleshooting

| Error | Likely cause | Fix |
|---|---|---|
| `TypeError: expected str, bytes or os.PathLike object, not NoneType` | `__file__` not available on the NVIDIA namespace package | Use `__path__[0]` instead of `os.path.dirname(__file__)` (see step 5) |
| `RuntimeError: CUDA failed with error no CUDA-capable device is detected` | NVIDIA driver not loaded or version mismatch | Check `nvidia-smi`, reinstall the driver, reboot |
| `CUDA out of memory` | Not enough VRAM for the chosen model | Use a smaller model (`base`) or `compute_type="int8_float16"` |
| HF Hub rate limit warning | No Hugging Face token configured | Optional: set `HF_TOKEN` for faster downloads |