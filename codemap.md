Project: AttentionSpam
Architecture
Two-app setup:
- apps/web-app/ — Next.js (App Router) dashboard + marketing landing page
- apps/video-server/ — Hono server with in-memory job queue, Kokoro TTS (ONNX), pipeline rendering, Supabase Storage upload
Communication: Dashboard calls video-server via HTTP (POST /api/generate, GET /api/status/:jobId, GET /api/output/:jobId). No WebSocket — 2s polling.
Storage: Rendered MP4s uploaded to Supabase Storage (videos bucket). Local filesystem outputs are temporary. SUPABASE_URL = https://hlneqkcervrvftffotxn.supabase.co.
Landing Page (Root /)
- No Clerk redirect — root shows a marketing landing page
- Ported from origin/landing-page branch
- Components: Nav, BgFx, Journey, HowItWorks, VideoGallery, ComingSoon, Sections
- Dependencies: gsap@3.12.5, lenis@1.1.14 (scroll + animation)
- Font: Inter
Hero Section (Journey.tsx → Iphone15Pro)
- Phone mockup: MagicUI Iphone15Pro component, adapted. Final approach uses SVG mask (maskUnits="userSpaceOnUse") to punch out the screen area. Video at z-10 (percentage-positioned at screen coords), SVG frame at default z-index, Dynamic Island SVG overlay on top. No percentage-based SVG mask mixing issues.
- Phone colors: Hardcoded dark (#404040 bezel, #262626 body) — no Tailwind dark variants.
- Video source: /videos/1.mp4 (was uppercase .MP4, renamed to lowercase). No slideshow — single video after HDR issues + crossfade delay complaints.
- Badge: .phone-badge at z-index 20 (inline style) to stay above video z-10.
- HDR lesson: Previous black overlay was from an HDR video source — not a code bug.
Video Gallery Section (VideoGallery.tsx)
- 4 cards in a grid. Real videos: 1.mp4, 2.mp4, 3.mp4 (renamed from uppercase .MP4/.mov to lowercase). 4th card reuses 1.mp4.
- GSAP scroll-triggered reveal animation (stagger 0.13s, y: 40 → 0).
- Card layout: dark background (#0a100f), gradient overlay, label at bottom.
All Video Files (in public/videos/)
- 1.mp4 (56MB, 18.5s)
- 2.mp4 (36MB, 18.5s)
- 3.mp4 (49MB)
Video Generation Flow (Dashboard)
1. User creates app → redirects to /dashboard/${app.id} (no chat, no onboard)
2. App detail page shows VideoFineTuneSection with 3 skeleton placeholders
3. Polls video-server at 2s interval via tRPC (getStatus)
4. Video-server: job queue → Kokoro TTS → ffmpeg pipeline → Supabase upload
5. User can multi-select favorite videos inline → Save stores JSON array in apps.fineTunePreference (jsonb column)
6. One fine-tune chance per app (fine_tuned=true locks it)
7. prompts/hook.md and prompts/video.md are empty — user writes content
8. prompts/videos-context.md has categorized background MP4 URLs
Key Commits
- ea26a5c (current HEAD, v0 & main): landing page + phone mockup + real videos
Removed/Dead Code
- ApiKeysSection removed from dashboard
- use-video-generation.ts hook removed
- CSS .phone, .phone-body, .phone-notch, .phone-screen, .reel-video cleaned from globals.css
- Old placeholder videos (Hero-web.mp4, video1-web.mp4, video2-web.mp4, video3-web.mp4) — still referenced in some CARDS fallbacks but real videos take priority
Recent Additions: Cron Schedules + TikTok Provider + Agent-worker
- src/tiktok/ — TikTok API client (client.ts, types.ts, post.ts, index.ts). Upload flow: init → PUT video → publish.
- src/social/tiktok-provider.ts — TikTokSocialProvider implements SocialProvider interface. Registered in src/social/registry.ts.
- src/social/types.ts — ProviderName now includes 'tiktok'.
- apps/agent-worker/ — Standalone Hono server (port 3002) with POST /nudge webhook. Runs AI pipeline: research → script → render → caption → publish. Deps: hono, @neondatabase/serverless, @ai-sdk/google, ai, zod.
- apps/agent-worker/src/index.ts — Validates webhook_secret against cron_schedules DB, dispatches orchestrator.
- apps/agent-worker/src/orchestrator.ts — 5-phase pipeline creating video_jobs and calling SocialProvider.publish().
- apps/agent-worker/src/ai.ts — AI calls: research(), generateScript(), generateCaptions() via @ai-sdk/google.
- apps/web-app/src/db/schema.ts — Added cronSchedules table with webhook_secret, schedule config, lastTriggeredAt. Added cronScheduleId to videoJobs (FK → cronSchedules.id).
- apps/web-app/src/db/migrations/0002_cron_schedules.sql — CREATE TABLE cron_schedules (applied to production).
- apps/web-app/src/db/migrations/0003_solid_leo.sql — ALTER TABLE video_jobs ADD COLUMN cron_schedule_id (applied to production).
- apps/web-app/src/server/api/routers/cronSchedule.ts — tRPC router: create (generates secret), list, update, delete, regenerateSecret, getWebhookInfo.
- apps/web-app/src/app/dashboard/[appId]/page.tsx — CronScheduleSection component: create form, schedule list, webhook info display, secret management.
Single source of truth for env vars: root .env
- All shared env vars live ONLY in <root>/.env (POSTGRES_URL, SUPABASE_*, CLERK_*, INSTAGRAM_*, etc.)
- Per-app .env files exist ONLY for app-specific overrides (not shared with other apps)
- video-server .env: STORAGE_BUCKET, PORT (truly app-specific)
- agent-worker has no .env (all vars come from root)
- web-app loads root .env via: node --env-file=../../.env (no per-app .env needed)
- Hono apps (video-server, agent-worker) load root + local via: tsx watch --env-file=../../.env --env-file=.env
- Root scripts: dev:next, dev:video, dev:agent

Known Issues
- LandingPage.tsx has 2 pre-existing TS errors (clientX/clientY on untyped Event)
- Video-server is in-memory — restart loses queued jobs (handled by getStatus marking DB jobs as failed)
- ffmpeg + ffprobe must be installed on video-server host
- VIDEO_SERVER_URL=http://localhost:3001 in web-app .env
- Video-server uses @supabase/supabase-js with SUPABASE_SERVICE_ROLE_KEY
