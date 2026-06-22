---
name: goldfish-video
description: "Generate brainrot short-form videos for Gold Fish — TTS voiceover, SRT captions, FFmpeg assembly, and Instagram upload. Use this when creating or posting Gold Fish content."
---

# Gold Fish Video Pipeline

Internal end-to-end pipeline for brainrot video generation. No third-party video APIs needed.

## Stack

| Component | Tool | Location |
|---|---|---|
| Voiceover TTS | Kokoro | `localhost:5001/v1/audio/speech` |
| Caption sync | faster-whisper (small.en) | `generate_srt.py` |
| Video assembly | FFmpeg | System CLI |
| Gameplay clips | Supabase storage | `brainrot-videos.md` |
| Output | MP4 9:16 1080x1920 | `experiments/<app>/output/` |

## Pipeline Flow

```
Script segments
    ↓
[Kokoro TTS] → MP3 audio segments (speed 1.15x)
    ↓
[Concatenate] → single MP3 with pauses
    ↓
[faster-whisper] → SRT with word-level timestamps
    ↓
[FFmpeg assembly] → crop to 9:16 + burn subtitles + merge audio
    ↓
Output MP4
    ↓
[Instagram API] → post via pipeline.ts (optional)
```

## Step-by-Step Instructions

### Step 1: Write the Script

Create a script with `(start_sec, text, voice)` segments. Use voices:
- `af_bella` — female, casual
- `am_eric` — male, casual
- `bf_emma` — female, slightly deeper

Speed: `1.15` for 1.15x (slightly faster than normal speech).

### Step 2: Generate TTS

```bash
python3 gen_tts.py
```

Or for a custom segment list, POST to Kokoro:
```bash
curl -X POST http://localhost:5001/v1/audio/speech \
  -H "Content-Type: application/json" \
  -d '{"model":"kokoro","input":"Your text","voice":"af_bella","response_format":"mp3","speed":1.15}' \
  -o output.mp3
```

### Step 3: Concatenate Audio

```bash
# Create a text file listing all MP3s in order:
file '/path/to/seg_00.mp3'
file '/path/to/seg_01.mp3'
...

ffmpeg -y -f concat -safe 0 -i filelist.txt -c copy final_audio.mp3
```

### Step 4: Generate SRT Captions

```bash
python3 generate_srt.py final_audio.mp3 subtitles.srt
```

Uses faster-whisper (small.en) for word-level timestamps.

### Step 5: Assemble Video

```bash
ffmpeg -y \
  -ss <start_sec> -t <duration> -i gameplay.mp4 \
  -i final_audio.mp3 \
  -i subtitles.srt \
  -filter_complex \
    "[0:v]crop=iw*0.45:ih:iw*0.275:0,scale=1080:1920[vid]; \
     [2]subtitles=filename=subtitles.srt:force_style='FontName=Arial,FontSize=52,PrimaryColour=&H00FFFFFF,BorderStyle=3,BorderColour=&H99000000,Alignment=2,MarginV=100'[sub]; \
     [vid][sub]overlay=0:0[final_v]" \
  -map "[final_v]" -map "1:a" \
  -c:v libx264 -preset fast -crf 22 \
  -c:a aac -b:a 128k \
  -shortest \
  output/reel_final.mp4
```

**Crop formula:** Takes center 45% of landscape footage → scales to 1080x1920 vertical.
**Subtitle style:** White text, black border, centered, MarginV=100 (lower third).
**Duration flag:** `-t` should match audio duration + 0.5s buffer.

### Step 6: Post to Instagram

```bash
npm run instagram:post -- \
  --token *** \
  --user-id <IG_USER_ID> \
  --video-url <PUBLIC_VIDEO_URL> \
  --caption "Your caption here #hashtags"
```

Or use the full pipeline for reel + insights:
```bash
npm run instagram:post -- --token *** --user-id <id> --video-url <url> --caption "<caption>"
npm run instagram:insights -- --token *** --media-id <media_id>
```

## Key Scripts Reference

| Script | Purpose | Location |
|---|---|---|
| `gen_tts.py` | Generate TTS MP3 segments | `/root/.openclaw/workspace/gen_tts.py` |
| `generate_srt.py` | Transcribe audio → SRT captions | `/root/.openclaw/workspace/generate_srt.py` |
| `generate_reelXX.py` | TTS generation for specific reel | `experiments/<app>/generate_reelXX.py` |
| `assemble_reel.py` | FFmpeg assembly for specific reel | `experiments/<app>/assemble_reel.py` |
| `pipeline.ts` | Instagram post + insights | `landing-page/src/lib/instagram/pipeline.ts` |
| `brainrot-videos.md` | Gameplay clip URLs | `/root/.openclaw/workspace/brainrot-videos.md` |

## Brainrot Video Layout

Split-screen vertical 9:16 (1080x1920):
- **Top half:** Text overlay area (subtitles burned in here)
- **Bottom half:** Gameplay footage (cropped from center of landscape)

## Caption Formula

```
[Hook / Identity call] + [Specific pain] + [Open loop] + [Profile off-ramp]

Example:
"If you've been on Hinge for 3 months and still getting ghosted after great first messages —
you're making this one mistake. The fix is on my profile."
```

## Voice Speed

Use `1.15` speed for Kokoro TTS. This lands at roughly 1.2x perceived speed — fast enough to feel urgent, natural enough to sound like a person talking, not a narration.

## Gameplay Clip Selection

From `brainrot-videos.md`:
- **Subway Surfers:** High energy, fast-paced — use for chaotic/conflict-driven scripts
- **Minecraft Parkour:** Measured pacing — use for confessional/story-driven scripts

Pick one clip per reel. Avoid consecutive repeats. Random selection within category.

## Reliable Assembly Workflow (No faster-whisper needed)

When SRT timestamps are known from script timing, build SRT directly from segment start times:

1. **Generate segments** with known start_ms + text
2. **Get actual durations** per segment via ffprobe
3. **Build SRT** from (start_ms, end_ms, text) tuples — no transcription needed
4. **Concatenate audio** with silence padding to target start times
5. **FFmpeg assemble** — use `ultrafast` preset, add `+faststart` movflag, run with nohup if session timeout is a risk

### Build SRT from timestamps:
```python
def fmt_time(ms):
    h = int(ms // 3600000)
    m = int((ms % 3600000) // 60000)
    s = int((ms % 60000) // 1000)
    return f"{h:02d}:{m:02d}:{s:02d},{ms % 1000:03d}"

# For each segment: (start_ms, text)
# end_ms = start_ms + int(duration_ms)
```

### FFmpeg assembly (reliable):
```bash
ffmpeg -y \
  -ss 10 -t 42 -i gameplay.mp4 \
  -i final_audio.mp3 \
  -i subtitles.srt \
  -filter_complex "[0:v]crop=iw*0.45:ih:iw*0.275:0,scale=1080:1920[vid];[2]subtitles=filename=subtitles.srt:force_style='FontName=Arial,FontSize=52,PrimaryColour=&H00FFFFFF,BorderStyle=3,BorderColour=&H99000000,Alignment=2,MarginV=100'[sub];[vid][sub]overlay=0:0[final_v]" \
  -map "[final_v]" -map "1:a" \
  -c:v libx264 -preset ultrafast -crf 26 \
  -c:a aac -b:a 96k \
  -movflags +faststart \
  -shortest \
  output/reel.mp4
```
- `ultrafast` — much faster encode, avoids session timeout kills
- `+faststart` — moov atom at front, file playable before complete write
- Run in background with nohup if needed

## Anti-Patterns

- Do NOT use third-party video generation APIs (MiniMax, Veo, etc.) — internal pipeline is sufficient
- Do NOT use `video_generate` tool unless internal pipeline is explicitly unavailable
- Do NOT use speed below 1.1 — sounds too slow for short-form content
- Do NOT skip the SRT step — burned captions are required for hook text overlays
- Do NOT use `fast` or `medium` preset when session timeout is a risk — use `ultrafast`

---

## Production Parameters (Locked from Live Testing)

These parameters are locked based on production learning. Do not change without Darshan's approval.

### Voice: af_jessica
- **Voice:** `af_jessica` (single voice for rage-bait scripts)
- **Speed:** `1.2`
- **Rationale:** `af_jessica` has the right energy — fast, direct, no-nonsense. Speed 1.2 gives urgency without sounding robotic. Lower speeds (1.0–1.1) sound sleepy.

### Dialogue Line Rules
- **No periods inside lines** — periods create TTS chunk boundaries = pauses = rage flow killed
- **One emotional beat per line** — "You're not ugly" and "You're just short" must be separate lines
- **No questions in rage-bait** — viewer disengages when asked to think
- **No A/B structure** — single voice throughout for rage-bait continuity
- **No passive language** — "make it make sense" is weak; "You're just short" hits harder

### Video Output
- **Format:** MP4,9:16, 1080x1920
- **Location:** `/root/.openclaw/cli-tools/vide-gen-pipeline/out/`
- **Naming:** `reel-h2-v[N].mp4` (version increment per iteration)

### Tunnel for Sharing
- **Primary:** serveo.net SSH tunnel (`ssh -R80:localhost:8080 serveo.net`)
- **Fallback:** tmpfiles.org direct upload
- **Serveo tunnel must be backgrounded with nohup** — tunnel dies when session ends
- **Check tunnel URL:** `curl -sI https://serveo.net` after startup

### CLI Tool Location
- **Path:** `/root/.openclaw/cli-tools/vide-gen-pipeline`
- **Input file:** `reel-h2-input.json` (overwrite per reel)
- **Run command:** `cd /root/.openclaw/cli-tools/vide-gen-pipeline && npm run generate -- ./reel-h2-input.json`
- **Output:** `./out/reel-h2-v[N].mp4`

### Performance Log
- **Location:** `/root/.openclaw/workspace/logs/reel-performance.md`
- **Update after every reel post**
- **Track:** hook, script, voice params, video file, public URL, views, reach, likes, comments, shares, saves, 3s hold, result
