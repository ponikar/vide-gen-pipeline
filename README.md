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
