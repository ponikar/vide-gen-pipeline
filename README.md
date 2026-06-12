# Gold Fish

Multi-provider social media API. Post reels and fetch analytics.

```
AI Agent ──> Vercel ──> Supabase Storage (video)
                    ──> Instagram Graph API
                    ──> Neon Postgres (tokens)
```

## Setup

```bash
npm install
```

Required env vars — set on Vercel and in `.env` for local CLI:

```
INSTAGRAM_APP_ID=
INSTAGRAM_APP_SECRET=
POSTGRES_URL=
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
VERCEL_API_URL=https://vide-gen-pipeline.vercel.app
```

```bash
npm run migrate
npm run connect -- instagram    # opens browser for OAuth
```

---

## For AI Agents

### Video Generation

Generate a short-form video from a config JSON:

```bash
npm run generate -- input.json
```

**Input JSON shape:**

```json
{
  "video": "./assets/subway.mp4",
  "output": "./out/reel.mp4",
  "ttsSpeed": 1.25,
  "voices": {
    "A": "af_heart",
    "B": "clone:peter"
  },
  "dialogue": [
    { "speaker": "A", "text": "Here is the first line." },
    { "speaker": "B", "text": "This uses a cloned voice." }
  ]
}
```

**Options:**
```
--out <path>              Override output path
--video <path-or-url>     Override video source
--speed <number>          TTS speed (0.5-3.0)
--voice <speaker=voice>   Override a speaker's voice (repeatable)
--keep-temp               Keep temp files for debugging
```

**Available voices:**

| Built-in | Format | Example |
|----------|--------|---------|
| Kokoro base voices | `af_heart`, `am_adam`, `am_michael`, etc. | `"A": "af_heart"` |
| Blended voices | `<name>` (from `voices/*.bin`) | `"A": "am_peter"` |
| Cloned voices | `clone:<name>` (from `voices/<name>.wav`) | `"A": "clone:peter"` |

---

### Creating Custom Voices

**A) Voice cloning — upload a YouTube/speaker reference:**

```bash
npm run voice:create -- --name peter --url "https://youtube.com/watch?v=..."
```

This downloads the audio, normalises it, and saves to `voices/peter.wav` (15s trimmed from start). Use `clone:peter` in your config.

You can also use a local file:
```bash
npm run voice:create -- --name peter --input ./recordings/peter.wav
```

**B) Voice blending — mix existing Kokoro base voices:**

```bash
npx tsx scripts/blend-voices.ts am_puck:0.6 am_michael:0.4 --output am_peter
```

This creates `voices/am_peter.bin`. Use `am_peter` in your config.

---

### Reference Audio Guidelines (for good clones)

- **5-10 seconds** of clean, single-speaker audio
- **No background music**, noise, or other voices
- The speaker should be speaking naturally (not shouting/whispering)
- First 15s of a YouTube Short usually works well
- If the clone sounds off, try a different or shorter reference clip

---

### How It Works

Clone voices use this pipeline internally:

1. **Kokoro TTS** generates speech using a base voice (`am_michael` by default)
2. **Kanade voice conversion** (25Hz-clean model) transfers the reference speaker's characteristics onto the base speech
3. Output is saved as 24kHz mono WAV, then mixed into the final video

The whole setup (venv + model downloads) happens automatically on first use — no manual configuration needed.

---

### Post a Reel — Two Ways

**A) Small video (<4.5MB) — upload inline**

```bash
curl -s -F "provider=instagram" \
  -F "caption=Your caption" \
  -F "video=@out/reel.mp4" \
  https://vide-gen-pipeline.vercel.app/api/content/post
```

Returns `{"id":"...","permalink":"https://...","containerId":"..."}` or `{"containerId":"..."}` if processing exceeds 8s (poll & publish separately).

**B) Large video (any size) — upload directly to Supabase, then post**

Step 1 — Upload locally (bypasses Vercel's 4.5MB limit):
```bash
npm run upload out/reel.mp4
# prints: https://hlneqkcervrvftffotxn.supabase.co/storage/v1/object/public/videos/...
```

Step 2 — Post with the public URL:
```bash
curl -s -X POST https://vide-gen-pipeline.vercel.app/api/content/post \
  -H "Content-Type: application/json" \
  -d '{"provider":"instagram","blobUrl":"<url_from_step_1>","caption":"Your caption"}'
```

Same response format. The CLI does both steps automatically:
```bash
npm run post -- instagram out/video.mp4 "Your caption"
```

### Fetch Analytics

**Account-level:**
```bash
curl https://vide-gen-pipeline.vercel.app/api/content/analytics?provider=instagram
```

**Per-post** (mediaId from post response):
```bash
curl "https://vide-gen-pipeline.vercel.app/api/content/analytics?provider=instagram&mediaId=18012345678901234"
```

---

## Debugging

```bash
# Is the account connected?
curl https://vide-gen-pipeline.vercel.app/api/auth/instagram/status

# Get a fresh OAuth URL (reconnect)
curl https://vide-gen-pipeline.vercel.app/api/auth/instagram/url

# Poll container processing
curl "https://vide-gen-pipeline.vercel.app/api/content/post/CONTAINER_ID/status?provider=instagram"

# Publish a finished container
curl -X POST "https://vide-gen-pipeline.vercel.app/api/content/post/CONTAINER_ID/publish?provider=instagram"
```

## Providers

| Provider   | Status  |
|------------|---------|
| Instagram  | ✅      |
| TikTok     | 🔜      |

## Development

```bash
npm run dev           # Local Vercel dev server
npm run typecheck     # TypeScript check
npm test              # Run tests
npm run migrate       # Run DB migrations
```
