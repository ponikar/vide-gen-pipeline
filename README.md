# Gold Fish

v0.0.1 generates one short-form reel from a provided background MP4 and dialogue.

It creates Kokoro voiceover, derives subtitle timings from the generated audio durations, burns subtitles directly into the video, and writes a final MP4.

## Requirements

- Node.js 22+
- npm
- `ffmpeg`
- `ffprobe`

## Install

```bash
npm install
```

## Generate

```bash
npm run generate -- ./example.input.json
```

Optional:

```bash
npm run generate -- ./example.input.json --out ./out/custom.mp4
npm run generate -- ./example.input.json --speed 1.25
npm run generate -- ./example.input.json --voice A=am_michael
npm run generate -- ./example.input.json --video https://example.com/background.mp4
npm run generate -- ./example.input.json --keep-temp
npm run generate -- --help
```

## Input

```json
{
  "video": "./assets/subway.mp4",
  "output": "./out/reel.mp4",
  "ttsSpeed": 1.25,
  "voices": {
    "A": "af_heart",
    "B": "am_adam"
  },
  "dialogue": [
    { "speaker": "A", "text": "Here is the first line." },
    { "speaker": "B", "text": "And here is the reply." }
  ]
}
```

The final output is only the MP4. Subtitle files are temporary and are deleted unless `--keep-temp` is passed.
