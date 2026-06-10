# Gold Fish

Multi-provider social media publishing API. Post reels to Instagram (TikTok etc. next) from any AI agent via a simple HTTP API — no SDKs, no heavy libs.

## Architecture

```
AI Agent ──POST──> Vercel API ──> Supabase Storage (video)
                              ──> Instagram Graph API
                              ──> Neon Postgres (tokens)
```

- **Vercel serverless** API routes handle OAuth, posting, analytics
- **Supabase Storage** (signed URLs) hosts video files — upload bypasses Vercel's 4.5MB body limit
- **Neon Postgres** stores connected accounts with OAuth tokens
- **Instagram API with Instagram Login** — no Facebook Page required, supports Business & Creator accounts

## Setup

```bash
npm install
```

### Environment

```bash
INSTAGRAM_APP_ID=your_app_id
INSTAGRAM_APP_SECRET=your_app_secret
POSTGRES_URL=postgresql://...
SUPABASE_URL=https://...
SUPABASE_SERVICE_ROLE_KEY=...
VERCEL_API_URL=https://your-project.vercel.app
```

### Deploy

Push to GitHub — Vercel auto-deploys.

```bash
git push origin main
```

Run the DB migration:

```bash
npm run migrate
```

## Connect an Instagram Account

```bash
npm run connect -- instagram
```

Opens a browser for Instagram OAuth. After authorizing, the token is stored in the DB. Check status:

```bash
curl https://your-project.vercel.app/api/auth/instagram/status
# {"connected":true,"username":"dating.ready","providerUserId":"27485387947815641","expiresAt":"..."}
```

## Post a Reel (End to End)

### CLI

```bash
npm run post -- instagram ./out/video.mp4 "Your caption here"
```

This does:
1. Gets a signed Supabase upload URL → uploads the video
2. Creates an Instagram media container with the video URL
3. Polls until Instagram finishes processing
4. Publishes the container
5. Prints the permalink

### HTTP API (for AI agents)

```bash
# 1. Upload video
UPLOAD=$(curl -s -X POST https://your-project.vercel.app/api/content/upload-url \
  -H "Content-Type: application/json" \
  -d '{}')
UPLOAD_URL=$(echo "$UPLOAD" | jq -r '.uploadUrl')
PUBLIC_URL=$(echo "$UPLOAD" | jq -r '.publicUrl')

curl -X PUT "$UPLOAD_URL" \
  -H "Content-Type: video/mp4" \
  --data-binary @out/video.mp4

# 2. Create media container
CONTAINER=$(curl -s -X POST https://your-project.vercel.app/api/content/create \
  -H "Content-Type: application/json" \
  -d "{\"provider\":\"instagram\",\"blobUrl\":\"$PUBLIC_URL\",\"caption\":\"Your caption\"}")
CONTAINER_ID=$(echo "$CONTAINER" | jq -r '.containerId')

# 3. Poll for processing
while true; do
  STATUS=$(curl -s "https://your-project.vercel.app/api/content/post/$CONTAINER_ID/status?provider=instagram")
  CODE=$(echo "$STATUS" | jq -r '.status')
  [ "$CODE" = "FINISHED" ] && break
  [ "$CODE" = "ERROR" ] && echo "Failed: $(echo $STATUS | jq -r '.errorMessage')" && exit 1
  sleep 5
done

# 4. Publish
RESULT=$(curl -s -X POST "https://your-project.vercel.app/api/content/post/$CONTAINER_ID/publish?provider=instagram")
echo "Posted: $(echo $RESULT | jq -r '.permalink')"
```

### One-shot (AI agent)

```bash
curl -s -F "provider=instagram" \
  -F "caption=Your caption" \
  -F "video=@out/video.mp4" \
  https://your-project.vercel.app/api/content/upload
# {"containerId":"...","publicUrl":"..."}
```

This does everything — uploads to Supabase, creates the container, returns the ID. Poll and publish separately.

## API Reference

### `GET /api/auth/:provider/status`
Connection status. Returns `{connected, username, providerUserId, expiresAt}`.

### `GET /api/auth/:provider/url`
OAuth URL. Returns `{url}`. Open in a browser to authorize.

### `GET /api/auth/:provider/callback`
OAuth callback (handles `?code=`). Not called directly.

### `POST /api/content/upload-url`
Returns a signed Supabase upload URL + public URL.

```json
// Request: {"pathname":"optional-filename.mp4"}
// Response: {"uploadUrl":"...signed...","publicUrl":"...public..."}
```

### `POST /api/content/upload`
One-shot upload + container creation. Accepts multipart/form-data.

```bash
curl -F "provider=instagram" \
  -F "caption=Your caption" \
  -F "video=@video.mp4" \
  https://.../api/content/upload
```

Returns `{"containerId":"...","publicUrl":"..."}`. Poll and publish via the `/post/:id` endpoints. Videos up to 4.5MB (Vercel body limit); for larger files, use the two-step flow.

### `POST /api/content/create`
Creates a media container on Instagram.

```json
// Request: {"provider":"instagram","blobUrl":"https://...","caption":"..."}
// Response: {"containerId":"..."}
```

### `GET /api/content/post/:containerId/status`
Poll container processing status.

```
// Response: {"status":"FINISHED|IN_PROGRESS|ERROR|EXPIRED","errorMessage":"..."}
```

### `POST /api/content/post/:containerId/publish`
Publish a finished container.

```
// Response: {"id":"...","permalink":"https://instagram.com/reel/..."}
```

## Providers

| Provider   | Status  | OAuth                             | API                    |
|------------|---------|-----------------------------------|------------------------|
| Instagram  | ✅      | `instagram.com/oauth/authorize`   | `graph.instagram.com`  |
| TikTok     | 🔜      | —                                 | —                      |

Add new providers by implementing `SocialProvider` in `src/social/` and registering in `registry.ts`.

## Development

```bash
npm run dev           # Local Vercel dev server
npm run typecheck     # TypeScript check
npm test              # Run tests
npm run migrate       # Run DB migrations
```
