# Gold Fish

Multi-provider social media API. Post reels and fetch analytics — all through two simple endpoints.

```
AI Agent ──POST /api/content/post──> Vercel ──> Supabase Storage
                                              ──> Instagram Graph API
         ──GET /api/content/analytics──> Vercel ──> Instagram Graph API
```

## Setup

```bash
npm install
```

Required env vars:

```
INSTAGRAM_APP_ID=
INSTAGRAM_APP_SECRET=
POSTGRES_URL=
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
```

Deploy to Vercel (auto-deploys on push), then:

```bash
npm run migrate
npm run connect -- instagram    # opens browser for OAuth
```

Check connection: `GET /api/auth/instagram/status`

---

## For AI Agents — Two Endpoints

### 1. Post a Reel

Upload a video + caption in one call. The API uploads to Supabase, creates the Instagram container, polls for processing, and publishes — all in one shot.

```bash
curl -s -F "provider=instagram" \
  -F "caption=Your caption" \
  -F "video=@out/reel.mp4" \
  https://your-project.vercel.app/api/content/post
```

**Response** (on success):
```json
{
  "id": "18012345678901234",
  "permalink": "https://www.instagram.com/reel/DZabc1234_5/",
  "containerId": "18102399730884094"
}
```

If processing takes longer than 8 seconds, it returns just the `containerId` — poll and publish separately using the status/publish endpoints below.

**Videos up to 4.5MB.** For larger files, upload directly to Supabase with a signed URL and use `POST /api/content/create`.

### 2. Fetch Analytics

**Account-level** (no mediaId):
```bash
curl https://your-project.vercel.app/api/content/analytics?provider=instagram
```
Returns recent media list + aggregated reach, views, profile_visits, follows.

**Per-post** (pass mediaId from the post response):
```bash
curl "https://your-project.vercel.app/api/content/analytics?provider=instagram&mediaId=18012345678901234"
```
Returns media details + individual reach, views, saves, shares, comments, likes.

---

## Additional Endpoints

| Method | Path | What it does |
|--------|------|-------------|
| `GET` | `/api/auth/:provider/url` | Get OAuth URL |
| `GET` | `/api/auth/:provider/callback` | OAuth callback |
| `GET` | `/api/auth/:provider/status` | Connection status |
| `POST` | `/api/content/create` | Create container from an already-hosted video URL |
| `POST` | `/api/content/upload-url` | Get signed Supabase upload URL + public URL |
| `GET` | `/api/content/post/:containerId/status` | Poll container processing status |
| `POST` | `/api/content/post/:containerId/publish` | Publish a finished container |

## Providers

| Provider   | Status  |
|------------|---------|
| Instagram  | ✅      |
| TikTok     | 🔜      |

Add new providers by implementing `SocialProvider` in `src/social/` and registering in `registry.ts`.

## Development

```bash
npm run dev           # Local Vercel dev server
npm run typecheck     # TypeScript check
npm test              # Run tests
npm run migrate       # Run DB migrations
```
