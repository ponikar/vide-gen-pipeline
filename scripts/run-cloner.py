#!/usr/bin/env python3
"""Self-contained voice cloner for AttentionSpam pipeline.

Auto-sets up its venv and dependencies on first run.
If not already running in the venv, creates/sets up the venv
and re-executes itself via subprocess to ensure all imports work.

Input JSON (stdin):
{
  "segments": [
    {"text": "Hello world", "path": "/tmp/segment-0001.wav"},
    ...
  ],
  "reference": "/path/to/reference.wav",
  "baseVoice": "am_michael",
  "speed": 0.9
}

Output JSON (stdout):
{"status": "ok", "count": 5, "durations": [2.5, 1.8, ...]}
or
{"status": "error", "message": "..."}
"""

import json
import os
import subprocess
import sys
import tempfile
import time

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
VENV_DIR = os.path.normpath(os.path.join(SCRIPT_DIR, "..", ".cloner", "venv"))
VENV_PYTHON = os.path.join(VENV_DIR, "bin", "python3")
CACHE_DIR = os.path.normpath(os.path.join(SCRIPT_DIR, "..", ".cloner", "cache"))


def _ensure_venv():
    """Create the venv and install deps if missing. Returns path to venv python."""
    if os.path.exists(VENV_PYTHON):
        return VENV_PYTHON

    print("Setting up voice cloner environment (one-time)...", file=sys.stderr)
    os.makedirs(os.path.dirname(VENV_DIR), exist_ok=True)

    result = subprocess.run(
        [sys.executable, "-m", "venv", VENV_DIR],
        capture_output=True, text=True,
    )
    if result.returncode != 0:
        print(f"Failed to create venv: {result.stderr}", file=sys.stderr)
        return None

    pip = os.path.join(VENV_DIR, "bin", "pip")
    deps = [
        "torch",
        "torchaudio",
        "soundfile",
        "huggingface_hub",
        "kokoro-onnx",
        "misaki[en]",
        "git+https://github.com/frothywater/kanade-tokenizer",
    ]
    for dep in deps:
        print(f"  Installing {dep}...", file=sys.stderr)
        r = subprocess.run([pip, "install", dep], capture_output=True, text=True)
        if r.returncode != 0:
            print(f"  Failed: {r.stderr[-300:]}", file=sys.stderr)
            return None

    print("Voice cloner environment ready.", file=sys.stderr)
    return VENV_PYTHON


def _ensure_kokoro_model():
    import urllib.request
    os.makedirs(CACHE_DIR, exist_ok=True)

    files = {
        "kokoro.onnx": "https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0/kokoro-v1.0.onnx",
        "voices-v1.0.bin": "https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0/voices-v1.0.bin",
    }

    for filename, url in files.items():
        local = os.path.join(CACHE_DIR, filename)
        if not os.path.exists(local):
            print(f"Downloading {filename}...", file=sys.stderr)
            urllib.request.urlretrieve(url, local)

    return CACHE_DIR


def run_cloner(input_data: dict) -> dict:
    import torch
    import soundfile as sf
    from kanade_tokenizer import KanadeModel, load_audio, load_vocoder, vocode
    from kokoro_onnx import Kokoro

    device = torch.device("cpu")
    segments = input_data["segments"]
    ref_path = input_data["reference"]
    base_voice = input_data.get("baseVoice", "am_michael")
    speed = input_data.get("speed", 0.9)

    if not os.path.exists(ref_path):
        return {"status": "error", "message": f"Reference not found: {ref_path}"}

    print("Loading Kanade 25Hz-clean...", file=sys.stderr)
    model = KanadeModel.from_pretrained("frothywater/kanade-25hz-clean").to(device).eval()
    vocoder = load_vocoder(model.config.vocoder_name).to(device)
    sr = model.config.sample_rate

    print("Loading Kokoro...", file=sys.stderr)
    _ensure_kokoro_model()
    kokoro = Kokoro(
        os.path.join(CACHE_DIR, "kokoro.onnx"),
        os.path.join(CACHE_DIR, "voices-v1.0.bin"),
    )

    print("Loading reference audio...", file=sys.stderr)
    ref_wav = load_audio(ref_path, sample_rate=sr).to(device)

    durations = []

    for seg in segments:
        text = seg["text"]
        out_path = seg["path"]
        t0 = time.time()

        with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as f:
            tmp = f.name

        try:
            samples, sr_tts = kokoro.create(text, voice=base_voice, speed=speed, lang="en-us")
            sf.write(tmp, samples, sr_tts)

            source_wav = load_audio(tmp, sample_rate=sr).to(device)
            with torch.inference_mode():
                mel = model.voice_conversion(source_wav, ref_wav)
                converted = vocode(vocoder, mel.unsqueeze(0))
            sf.write(out_path, converted.cpu().numpy().squeeze(), sr)

            dur = time.time() - t0
            durations.append(dur)
            print(f"  [{len(durations)}] {dur:.1f}s -> {os.path.basename(out_path)}", file=sys.stderr)
        finally:
            if os.path.exists(tmp):
                os.unlink(tmp)

    return {"status": "ok", "count": len(durations), "durations": durations}


def main():
    stdin_data = sys.stdin.read()

    # If not already running inside the venv, re-exec via subprocess
    if not sys.executable.startswith(VENV_DIR):
        venv_python = _ensure_venv()
        if not venv_python:
            result = {
                "status": "error",
                "message": "Failed to set up Python environment. Run 'npm run setup:cloner' manually.",
            }
            print(json.dumps(result))
            sys.exit(1)

        result = subprocess.run(
            [venv_python, __file__],
            input=stdin_data,
            capture_output=True, text=True,
        )
        sys.stdout.write(result.stdout)
        sys.stderr.write(result.stderr)
        sys.exit(result.returncode)

    try:
        input_data = json.loads(stdin_data)
        result = run_cloner(input_data)
    except Exception as e:
        result = {"status": "error", "message": str(e)}

    print(json.dumps(result))


if __name__ == "__main__":
    main()
