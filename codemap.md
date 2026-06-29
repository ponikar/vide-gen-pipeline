Project: AttentionSpam

Architecture
Two-app setup:
- apps/web-app/ — Next.js (App Router) dashboard + marketing landing page
- apps/video-server/ — Hono server with in-memory job queue, Kokoro TTS (ONNX), pipeline rendering, Supabase Storage upload
Communication: Dashboard calls video-server via HTTP (POST /api/generate, GET /api/status/:jobId, GET /api/output/:jobId). No WebSocket — 2s polling.

Operational Logging and Agent Job State (2026-06-27, iteration 1)
- Added `src/logger.ts`, a shared structured stdout logger with levels, child context, nested error stack/cause serialization, request ID support, elapsed-time helpers, and automatic credential/content redaction. Added focused logger tests in `tests/logger.test.ts`.
- Agent-worker HTTP requests now receive/return `x-request-id`, emit lifecycle logs, and carry correlation context into onboarding preview generation and autonomous pipelines. AI structured-response failures, scheduler operations, preview stages, and nudge validation now produce readable structured events.
- Corrected autonomous job persistence: `video_jobs` is inserted once at pipeline start, phase changes use updates, failures update the existing job, and completion is saved only after every requested platform publishes and its post row is stored. Partial/missing/unsupported platform outcomes now fail the job instead of reporting false success. Accepted nudges persist `last_triggered_at`.
- Added `video_jobs.current_phase` to the Drizzle schema and migration `0008_add_video_job_phase.sql`, matching the worker's phase-state contract.
- Files modified in this iteration: `src/logger.ts`, `tests/logger.test.ts`, `apps/agent-worker/src/ai.ts`, `apps/agent-worker/src/fine-tune.ts`, `apps/agent-worker/src/index.ts`, `apps/agent-worker/src/orchestrator.ts`, `apps/web-app/src/db/schema.ts`, `apps/web-app/src/db/migrations/0008_add_video_job_phase.sql`, `apps/web-app/src/db/migrations/meta/_journal.json`, `codemap.md`.
- Initial agent-worker typecheck caught a `schedule_days` log-field naming typo in `apps/agent-worker/src/index.ts`; it was corrected before continuing. Remaining verification is pending.

Video Server Operational Logging (2026-06-27, iteration 2)
- Added a per-process video-server instance ID and request IDs on Hono requests/responses. Startup now reports dependency and TTS readiness, while missing jobs explicitly identify restart-related loss as a likely cause.
- Queue logs now cover acceptance, wait time, start, completion/failure, queue depth, running count, and total in-memory job count with job/request correlation.
- Rendering now reports timed source resolution, probe, TTS, composition, upload, and cleanup stages. Stage failures retain their full stack; cleanup failures are warnings and no longer replace an otherwise successful render result.
- Files modified in this iteration: `apps/video-server/src/index.ts`, `apps/video-server/src/queue.ts`, `apps/video-server/src/pipeline.ts`, `codemap.md`.
- Initial video-server typecheck caught that the new required queue logger still had an empty default options object; the default was removed. Verification continues after the correction.

Next.js and API Operational Logging (2026-06-27, iteration 3)
- Added tRPC-wide request lifecycle logging with request IDs, durations, operation names, error stacks, and authenticated user context. The Next.js tRPC and direct API boundaries return `x-request-id`; direct routes safely clone immutable redirect responses before adding the header.
- Added detailed state logs to preview generation/status/retry/preferences, schedules, onboarding, OAuth account persistence, public post publishing, API-key usage persistence, and analytics refreshes. Cross-service Next.js calls now forward the same request ID.
- Replaced silent video polling, token persistence, scraper, API-key timestamp, and analytics-provider failures with contextual warnings/errors. Analytics refresh now returns and logs attempted/updated/skipped/failed counts.
- Added generic request/error logging for the legacy Vercel `api/` handlers through `src/vercel-logging.ts`, without changing their response contracts.
- Added `tests/video-queue.test.ts` for queue success, retained failures, and concurrency backpressure.
- Files modified in this iteration: `src/vercel-logging.ts`, the server-side Next.js tRPC/logging modules and critical API/router files, legacy `api/` entrypoints, `tests/video-queue.test.ts`, and `codemap.md`.
- Verification so far: root typecheck passes; web-app typecheck reports only the two pre-existing unrelated `LandingPage.tsx` `clientX/clientY` typing errors.

Operational Logging Final Hardening and Verification (2026-06-27, iteration 4)
- Added bounded/sanitized database error messages, phase-completion durations, video startup failure reporting, request correlation inside render stages, reliable temp cleanup after output-directory failures, and `RETURNING` checks before logs claim preview state was saved.
- Expanded tests for initial/later agent job failures, failure-state persistence failure, immutable redirect request IDs, logger redaction/bounded errors, and video queue success/failure/concurrency.
- Runtime smoke verification passed outside the sandbox: agent-worker returned the supplied `x-request-id` and emitted correlated start/rejection/completion events; video-server reported dependency/TTS startup timing and returned the supplied request ID with a correlated validation warning. The initial sandboxed `tsx` run hit the known local IPC permission restriction. Force-stopping the TTS process after the successful smoke produced a native mutex shutdown abort; startup and request handling had already passed.
- The new migration is checked in but was not applied to any live database.
- Final verification: all 30 Vitest tests pass; root, agent-worker, and video-server typechecks pass; migration journal parsing and `git diff --check` pass. Web-app typecheck still reports only the two pre-existing unrelated `LandingPage.tsx` `clientX/clientY` errors.
- Files modified in this iteration: `src/logger.ts`, agent/video state and pipeline modules, preview status persistence, `tests/logger.test.ts`, `tests/agent-worker-state.test.ts`, `tests/http-logging.test.ts`, `tests/video-queue.test.ts`, and `codemap.md`.

Next.js Logger Module Resolution Fix (2026-06-27)
- Root cause: web-app imports referenced the shared TypeScript logger with a `.js` suffix. TypeScript typechecking accepted the substitution, but the Next.js webpack resolver looked for a real external `.js` file and failed.
- Changed every web-app shared-logger import to an extensionless TypeScript-compatible specifier. Agent-worker, video-server, and legacy Node API imports keep `.js` because they run through NodeNext/tsx resolution.
- Verification: Next.js 15 dev server compiled `/api/trpc/[trpc]` successfully; a live `app.list` request reached tRPC, returned the expected unauthenticated 401, preserved `x-request-id`, and emitted the correlated structured log. No module-resolution error remains.
- Files modified in this iteration: `apps/web-app/src/server/http-logging.ts`, `apps/web-app/src/server/trpc.ts`, `apps/web-app/src/lib/api-key-auth.ts`, `apps/web-app/src/server/api/routers/cronSchedule.ts`, `apps/web-app/src/server/api/routers/videoGeneration.ts`, `apps/web-app/src/app/api/trpc/[trpc]/route.ts`, and `codemap.md`.

User-Approved TikTok Draft Scheduling (2026-06-27)
- Added a minimal per-app Create Post flow that reuses the onboarding preview endpoint, existing video-server queue/status polling, `video_jobs`, `posts`, `cron_schedules`, and the existing agent-worker crontab/nudge path. No feature-specific table or scheduler was added.
- On-demand preview requests generate one video. The user's idea is embedded as explicit required creative context for research, hooks, scripts, and background selection, and is stored with `flow: "on_demand"` so these jobs do not appear in onboarding fine-tuning.
- Approved videos are saved in `posts` with a real `scheduled_at` timestamp and linked to the existing cron schedule through `video_jobs.cron_schedule_id`. One-time cron nudges upload the rendered MP4 to TikTok Inbox, save the publish ID, update `scheduled`/`uploading`/`sent_to_inbox` or `failed`, disable the schedule, and remove its cron entry.
- TikTok Inbox upload uses the current `/v2/post/publish/inbox/video/init/` and `/v2/post/publish/status/fetch/` endpoints. The TikTok client now accepts the provider's normal `{ error: { code: "ok" } }` success envelope.
- Added migration `0009_add_post_schedule.sql`. It is checked in but was not applied to a live database.
- Verification: agent-worker and video-server typechecks pass; all 32 Vitest tests pass, including new TikTok Inbox upload coverage; `git diff --check` passes. Web-app typecheck still reports only the two known unrelated `LandingPage.tsx` event typing errors.
- Files modified in this iteration: `apps/agent-worker/src/fine-tune.ts`, `apps/agent-worker/src/index.ts`, `apps/agent-worker/src/scheduled-post.ts`, `apps/web-app/src/app/dashboard/[appId]/create/page.tsx`, `apps/web-app/src/app/dashboard/[appId]/page.tsx`, `apps/web-app/src/db/schema.ts`, `apps/web-app/src/db/migrations/0009_add_post_schedule.sql`, `apps/web-app/src/db/migrations/meta/_journal.json`, `apps/web-app/src/server/api/routers/videoGeneration.ts`, `apps/web-app/src/server/api/routers/cronSchedule.ts`, `apps/web-app/src/server/api/routers/analytics.ts`, `src/tiktok/client.ts`, `src/tiktok/post.ts`, `tests/tiktok-draft.test.ts`, and `codemap.md`.
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
6. Fine-tune can be repeated multiple times — users can regenerate, re-select, and re-save preferences
7. prompts/hook.md and prompts/video.md are empty — user writes content
8. prompts/videos-context.md has categorized background MP4 URLs
Key Commits
- ea26a5c (current HEAD, v0 & main): landing page + phone mockup + real videos
Removed/Dead Code
- ApiKeysSection removed from dashboard
- use-video-generation.ts hook removed
- CSS .phone, .phone-body, .phone-notch, .phone-screen, .reel-video cleaned from globals.css
- Old placeholder videos (Hero-web.mp4, video1-web.mp4, video2-web.mp4, video3-web.mp4) — still referenced in some CARDS fallbacks but real videos take priority
Recent Additions: Video description for AI learning loop
- posts.description column (nullable text) — stores a 2-3 sentence description
  of what the video shows, the hook, tone, and message. This is generated by the
  AI during script creation (dialogueSchema.videoDescription) and stored alongside
  each post. On future cycles, the research phase reads past descriptions to
  understand what content was produced without needing to watch the video.
- Migration 0004 applied to production DB.
- Updated orchestrator: fetches descriptions in research query, passes
  scriptResult.videoDescription into generation_params and posts INSERT.
- Updated ai.ts dialogueSchema to require videoDescription field.

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

Fixed
- Dashboard UI collapse (commit e225424):
  - Removed unlayered `* { margin: 0; padding: 0 }` from globals.css (overrode Tailwind padding/margin utilities via cascade layer precedence)
  - Scoped landing page `nav { position: fixed }` → `#nav` to prevent breaking dashboard sidebar's `<nav>`
  - Added missing `}` and fixed `if (isYes)` indentation in onboard/page.tsx (from scrape feature commit)

Recent Changes: Agent-worker Refactoring
- apps/agent-worker/src/ai.ts — Replaced `ai` + `@ai-sdk/google` with raw `@google/generative-ai` SDK (provider version pinned to 3.1.0, `ai` was on 4.x — incompatible). Uses `GoogleGenerativeAI` directly. Exports: `learnFromHistory()`, `generateScript()`, `generateHooks()`, `generateCaptions()`.
- apps/agent-worker/src/orchestrator.ts — Expanded from 5 to 9 phases: research → enroll → script → hooks → render → caption → publish → fetch_stats → done. Uses `appProfile` from `scraped_info` for AI context. Background tasks via `c.executionCtx.waitUntil()`.
- apps/agent-worker/src/skills.ts — New file: loads AI skill context from prompts/skills*.md. Reads all `prompts/skills-*.md` files and prepends to system prompts.
- apps/agent-worker/src/db.ts — Fixed user query (was querying users table which doesn't exist on this DB; now uses clerkUserId directly from apps table).
- apps/web-app/src/db/migrations/0005_*.sql — Added `app_profile` JSONB column to apps table (applied).

Recent Changes: Rich App Scraping (Migration 0006)
- apps/agent-worker/src/scraper.ts — Added `ScrapedInfo` extract: title, description, category, targetAudience, tone, contentFormat, visualStyle, brandColors, keyFeatures, appStoreUrl. Extracts from scraped HTML meta tags + structured data.
- apps/web-app/src/db/migrations/0006_scraped_info.sql — ADD COLUMN scraped_info JSONB to apps (applied).
- apps/web-app/src/app/dashboard/[appId]/page.tsx — Onboarding UI uses new fields: appProfile (editable description, target audience, tone), scrapedInfo (read-only), branding (colors + logomark).

Recent Changes: Calendar & Analytics Feature
- Schema: posts table now has `published_at`, `views`, `likes`, `comments`, `shares`, `reach` columns with defaults (0 for ints, NULL for reach).
- apps/web-app/src/db/migrations/0007_calendar_analytics.sql — ALTER TABLE posts ADD COLUMN x 6 (applied).
- apps/agent-worker/src/orchestrator.ts — INSERT now passes `published_at` and new stat columns (defaults 0).
- apps/tiktok/client.ts — Added `getVideoStats()` method + `VideoStats` type (viewCount, likeCount, commentCount, shareCount). TikTok OAuth scope now includes `video.publish` + `video.upload` + `user.info.basic` + `user.info.stats`.
- apps/web-app/src/server/api/routers/analytics.ts — New tRPC router: `getCalendar` (monthly calendar data with aggregated per-day stats, post list, cron schedule info), `refreshStats` (triggers agent-worker /refresh-stats).
- apps/web-app/src/server/api/root.ts — Added `analyticsRouter`.
- apps/web-app/src/app/dashboard/[appId]/analytics/page.tsx — Calendar UI: month grid with navigation, day cells colored by view count, click-to-expand day detail, month summary bar, refresh button.
- apps/web-app/src/app/dashboard/[appId]/page.tsx — Added "Analytics" nav link next to app header.

Onboarding Chat Fix (2026-06-26)
- Replaced the broken JSON-response onboarding flow with natural-language tRPC chat plus AI SDK tool calling. `apps/web-app/src/server/api/routers/onboarding.ts` exposes a `scrapeUrl` tool; the model decides whether to call it based on the user's message. There is no `JSON_PROMPT`, `responseSchema`, or model-text JSON parsing.
- `apps/web-app/src/app/dashboard/onboard/page.tsx` no longer blindly calls scrape on the first user message. It sends chat history to `api.onboarding.chat`, renders only `reply`, and shows a create action only when the tool returns structured `scrapedInfo`.
- `apps/web-app/src/server/api/routers/apps.ts` still uses AI SDK v6 structured output via `generateText({ output: Output.object(...) })` for direct `app.scrapeUrl`. The onboarding tool uses the same structured extraction internally after the model chooses the tool.
- Restored `onboarding` router registration in `apps/web-app/src/server/api/root.ts`.
- Verification: `npm run typecheck` in `apps/web-app` reports no onboarding errors. It still fails on the known unrelated `apps/web-app/src/components/landing/LandingPage.tsx` `clientX/clientY` Event typing errors.
- Files modified in this iteration: `apps/web-app/src/app/dashboard/onboard/page.tsx`, `apps/web-app/src/server/api/routers/onboarding.ts`, `apps/web-app/src/server/api/routers/apps.ts`, `apps/web-app/src/server/api/root.ts`, `codemap.md`.

Onboarding Tool-Call Diagnostics (2026-06-26)
- Added focused server logs in `apps/web-app/src/server/api/routers/onboarding.ts` for request start, latest user preview, `scrapeUrl` tool execution, fetch status/content type/body length, readable text length/preview, structured extraction success/failure, AI SDK step/tool counts, and final response shape.
- This is diagnostics-only; chat behavior and UI rendering were not changed.
- Verification: `npm run typecheck` in `apps/web-app` has no onboarding errors. It still fails only on the known unrelated `apps/web-app/src/components/landing/LandingPage.tsx` `clientX/clientY` Event typing errors.
- Files modified in this iteration: `apps/web-app/src/server/api/routers/onboarding.ts`, `codemap.md`.

Onboarding Scrape Extraction Fix (2026-06-26)
- Root cause from diagnostics: MiniMax did call `scrapeUrl`, but `generateText({ output: Output.object(...) })` failed with "No object generated: could not parse the response." Tool calling was working; structured extraction was the broken layer.
- Added `apps/web-app/src/server/app-scraper.ts` as the shared scrape/extract helper. It avoids LLM JSON/object extraction for scraped data, uses Apple lookup API for App Store URLs, and uses deterministic HTML title/meta/body extraction for normal websites.
- Updated `apps/web-app/src/server/api/routers/onboarding.ts` so the AI SDK tool still decides when scraping is needed, but the tool execution now calls the shared deterministic scraper and keeps the diagnostic logs.
- Updated `apps/web-app/src/server/api/routers/apps.ts` so the direct `app.scrapeUrl` endpoint uses the same helper instead of keeping the duplicate `Output.object` path.
- Verification: direct helper smoke tests passed for `https://apps.apple.com/au/app/malko-better-sleep-appblocker/id6762987084` (`source: app-store-lookup`, name `Malko: Better sleep appblocker`) and `https://aifantasy.ponikar.com` (`source: html-metadata`, name `AI Chat Fantasy`). `npm run typecheck` in `apps/web-app` still fails only on the known unrelated `LandingPage.tsx` `clientX/clientY` Event typing errors.
- Files modified in this iteration: `apps/web-app/src/server/app-scraper.ts`, `apps/web-app/src/server/api/routers/onboarding.ts`, `apps/web-app/src/server/api/routers/apps.ts`, `codemap.md`.

Node Worker Compatibility Fix (2026-06-26)
- Fixed `apps/agent-worker/src/index.ts` to dispatch the pipeline with a plain Node background promise instead of `c.executionCtx.waitUntil()`. Hono documents `executionCtx` as Cloudflare Workers-specific, so it is not the correct API for `@hono/node-server`.
- Updated `apps/agent-worker/package.json` and `apps/video-server/package.json` to load app-local env files with `--env-file-if-exists=.env`. Root `.env` remains required; per-app env files are documented as optional overrides, and `apps/agent-worker/.env` does not exist.
- Verification: both app typechecks pass. `agent-worker` starts under Node and `POST /api/schedules` returns the expected validation error for `{}`. `video-server` starts under Node and `/api/health` returns `{"status":"ok"}`. Initial sandboxed `tsx` startup failed on a local IPC permission issue, so runtime startup was verified outside the sandbox.
- Files modified in this iteration: `apps/agent-worker/src/index.ts`, `apps/agent-worker/package.json`, `apps/video-server/package.json`, `codemap.md`.

Onboarding Preview Video Generation via Agent Worker (2026-06-26)
- Added `apps/agent-worker/src/fine-tune.ts` to generate onboarding preview render payloads from app name, description, and scraped info only. It uses the existing research/hooks/script prompt stack with an explicit "new app, no performance history yet" context and returns render-ready payloads plus hook/script metadata.
- Added `POST /api/onboarding/preview-payloads` in `apps/agent-worker/src/index.ts`. It validates `{ app_id, count: 3 | 4 }` and returns `{ payloads }`; it does not render videos, publish, schedule cron, or read historical posts.
- Replaced the duplicate web-app AI generation in `apps/web-app/src/server/api/routers/videoGeneration.ts`. The web app now verifies Clerk app ownership/fine-tune state, calls the agent-worker for preview payloads, creates `video_jobs`, schedules video-server renders server-side, stores `videoServerJobId` and `generationParams`, proxies status polling server-side, retries from stored params, and saves only selected completed jobs with output URLs.
- Updated `apps/web-app/src/app/dashboard/[appId]/page.tsx` so preview jobs can have `videoServerJobId: null` when video-server scheduling fails. Removed unused public `NEXT_PUBLIC_VIDEO_SERVER_URL` from `apps/web-app/src/env.ts` so browser code has no video-server URL boundary.
- Verification: `npm run typecheck` passes in `apps/agent-worker`. `npm run typecheck` in `apps/web-app` still fails only on the known unrelated `apps/web-app/src/components/landing/LandingPage.tsx` `clientX/clientY` Event typing errors. `git diff --check` passes. Source search confirms browser code no longer references `NEXT_PUBLIC_VIDEO_SERVER_URL`, `/api/generate`, or `/api/status`; only server-side router/orchestrator code calls video-server endpoints.
- Files modified in this iteration: `apps/agent-worker/src/fine-tune.ts`, `apps/agent-worker/src/index.ts`, `apps/web-app/src/server/api/routers/videoGeneration.ts`, `apps/web-app/src/app/dashboard/[appId]/page.tsx`, `apps/web-app/src/env.ts`, `codemap.md`.

Onboarding Manual Info Tool Calling (2026-06-27)
- Hardened `apps/web-app/src/server/api/routers/onboarding.ts` so onboarding has two structured paths: `scrapeUrl` for URLs and `refineManualAppInfo` for manually supplied app details.
- Updated the onboarding system prompt to explicitly tell the AI to analyze user messages, extract manual app facts, sanitize/refine vague wording, and call `refineManualAppInfo` once app name plus core description are available. The manual tool returns the same `ScrapedInfo` shape as scraping, so the existing `api.app.create` path stores it in `apps.scraped_info` without a new DB contract.
- Added minimal server-side normalization for manual tool input: trim whitespace, truncate long text, dedupe list fields, and validate through the shared `scrapedInfoSchema`.
- Updated `apps/web-app/src/app/dashboard/onboard/page.tsx` button copy from "Create app from scraped info" to "Create app" because structured info can now come from either scraping or manual chat.
- Verification: `git diff --check` passes. `npm run typecheck` in `apps/web-app` still fails only on the known unrelated `apps/web-app/src/components/landing/LandingPage.tsx` `clientX/clientY` Event typing errors.
- Files modified in this iteration: `apps/web-app/src/server/api/routers/onboarding.ts`, `apps/web-app/src/app/dashboard/onboard/page.tsx`, `codemap.md`.

Onboarding Confirmation Auto-Create (2026-06-27)
- Extended `apps/web-app/src/server/api/routers/onboarding.ts` so chat requests can include a pending `ScrapedInfo` profile. The system prompt now tells the AI to call `confirmAppInfo` when the latest user message approves the pending profile, or `refineManualAppInfo` again when the user provides corrections.
- Added `confirmedInfo` to the onboarding chat response. `scrapedInfo` still means "profile ready for review"; `confirmedInfo` means "create this app now". The router still does not write apps directly, keeping DB creation in the existing `api.app.create` path.
- Updated `apps/web-app/src/app/dashboard/onboard/page.tsx` to store pending app info, send it on each chat turn, remove the manual create button, call `api.app.create` automatically when `confirmedInfo` is returned, and redirect immediately to `/dashboard/:appId` after creation succeeds.
- Verification: `git diff --check` passes. `npm run typecheck` in `apps/web-app` still fails only on the known unrelated `apps/web-app/src/components/landing/LandingPage.tsx` `clientX/clientY` Event typing errors.
- Files modified in this iteration: `apps/web-app/src/server/api/routers/onboarding.ts`, `apps/web-app/src/app/dashboard/onboard/page.tsx`, `codemap.md`.

Onboarding Preview Schema Fix (2026-06-27)
- Root cause: `AI_PROVIDER=minimax` made the agent worker use the default Anthropic-compatible MiniMax provider path for `generateObject`. Live verification showed MiniMax returned Markdown prose for the research stage while the AI SDK warned schema `responseFormat` was unsupported, causing `No object generated: response did not match schema` / parse failures before preview payloads were created.
- Updated `apps/agent-worker/src/ai.ts` to use MiniMax's OpenAI-compatible provider for structured calls, wrap models with JSON extraction, inject the actual JSON Schema into the system prompt, and log stage-specific `NoObjectGeneratedError` diagnostics with a response preview. Loosened LLM-facing schemas for model-selected labels and numeric score coercion so harmless wording drift does not fail validation.
- Updated `apps/agent-worker/src/fine-tune.ts` to normalize model-produced video categories into the supported background clip buckets and normalize the preview format before building the render payload.
- Verification: `pnpm --filter @attentionspam/agent-worker typecheck` passes. A live MiniMax `research()` smoke test now returns a valid object. A full `generateOnboardingPreviewPayloads()` smoke test with a fake DB row returned 3 payloads with valid formats, normalized categories, and dialogue lines.
- Files modified in this iteration: `apps/agent-worker/src/ai.ts`, `apps/agent-worker/src/fine-tune.ts`, `codemap.md`.

Video Background URL Fallback Fix (2026-06-27)
- Root cause: video URLs are selected in `apps/agent-worker` and sent unchanged to video-server. All URLs parsed from `prompts/videos-context.md` return `200 video/mp4`, but the hardcoded fallback `https://hlneqkcervrvftffotxn.supabase.co/storage/v1/object/public/videos/1.mp4` returns `400 application/json`. If clip extraction produced an empty list, video-server failed in `resolveVideoSource()` with `Failed to download video: 400 Bad Request`.
- Replaced that fallback in onboarding preview and cron render paths with the first valid listed Subway Surfers MP4. Updated `src/video.ts` download/content-type errors to include the failing URL.
- Verification: network HEAD check confirmed every listed background URL returns `200 video/mp4` and the old fallback returns `400 application/json`. `rg` confirms the old fallback is gone. `pnpm --filter @attentionspam/agent-worker typecheck` and root `npm run typecheck` pass.
- Files modified in this iteration: `apps/agent-worker/src/fine-tune.ts`, `apps/agent-worker/src/orchestrator.ts`, `src/video.ts`, `codemap.md`.

AI Background Video Selection (2026-06-27)
- Replaced the temporary deterministic/random clip selection in onboarding previews and scheduled generation with an AI selection stage. The model receives all 20 URLs from `video-urls.md`, their template names, the hook/script/research context, and recent choices, then returns one exact URL plus a short reason.
- The URL field uses a runtime enum built from the parsed options, and `resolveBackgroundVideoSelection()` rejects anything outside that list. This prevents invented or modified URLs while keeping template metadata application-owned. Onboarding selections feed earlier choices from the same batch back into the next prompt; scheduled jobs read the last 10 saved selections from `video_jobs`. Selected URL/template/reasoning are saved in job generation parameters and post metadata.
- Verification: the parser found 20 clips (5 Subway Surfers, 15 Minecraft Parkour) with no unknown templates; a live MiniMax selection chose a valid Minecraft clip different from the recent Subway clip and returned context-specific reasoning. `pnpm --filter @attentionspam/agent-worker typecheck`, root `npm run typecheck`, all 17 root tests, and `git diff --check` pass. The first smoke-test command was blocked before model execution because `.env` is not shell-sourceable; using Node's `--env-file=.env` loader succeeded.
- Files modified in this iteration: `apps/agent-worker/src/ai.ts`, `apps/agent-worker/src/fine-tune.ts`, `apps/agent-worker/src/orchestrator.ts`, `apps/agent-worker/src/skills.ts`, `codemap.md`.

Kokoro Model Resolution Diagnosis (2026-06-27)
- Traced video-server's `Unable to get model file path or buffer` queue failure to `KokoroTTS.from_pretrained()` in `src/tts.ts`. The exact message is thrown by `@huggingface/transformers` when it cannot return the requested ONNX file from its filesystem cache or download response; it occurs before voice validation, ffmpeg rendering, or upload.
- Remote checks found the Transformers cache under pnpm's `node_modules` package directory, while the PM2 logs show repeated restarts/SIGINTs and a pnpm install immediately before the failed jobs. Keeping the model cache inside replaceable `node_modules` makes resolution vulnerable during deploy/install windows. `loadTts()` also resolves the model afresh for every job instead of retaining one initialized promise.
- Current-state verification rules out a persistent bad model or network issue: all four Kokoro artifacts exist, the 92,361,116-byte q8 ONNX file is readable, disk space is available, Hugging Face returns 200 for config and 206 for a model range request, and isolated model loads both alone and with video-server's Hono/Supabase import graph succeed in 0.45-0.51 seconds with 28 voices. PM2 is currently stable, although it has 100 historical video-server restarts. The queue logs only `error.message`, so the exact file involved in past failures cannot be recovered.
- Recommended root fix: use a stable model/cache directory outside `node_modules`, preload one memoized Kokoro model promise at startup, and preserve the full error stack/file context in queue logs. No runtime code was changed during this diagnosis.
- Files modified in this iteration: `codemap.md`.

Kokoro Model Cache Reliability Fix (2026-06-27)
- Configured the same CommonJS Transformers instance used internally by `kokoro-js` to cache models in `KOKORO_CACHE_DIR` or `~/.cache/attentionspam/transformers`, outside replaceable pnpm `node_modules`. Added `@huggingface/transformers` as a direct dependency because runtime code now configures it explicitly.
- `src/tts.ts` now memoizes one Kokoro initialization promise for all jobs and clears it after failures so later attempts can recover. Video-server preloads system binaries and Kokoro before opening its listening port. Queue failures retain the client-safe message but log the original error object so PM2 captures the stack.
- Verification: a genuinely empty `/tmp` cache downloaded the four expected artifacts, including the 92,361,116-byte q8 ONNX model, and three concurrent preload calls completed through one shared initialization in 11.2 seconds. A warm-cache video-server startup waited for preload and then returned `{"status":"ok"}` from `/api/health`. The forced Ctrl-C used to stop that smoke process triggered an ONNX native shutdown mutex abort after successful verification; production PM2 was not changed. Video-server and root typechecks, all 17 tests, frozen offline lockfile verification, and `git diff --check` pass. An initial ESM environment configuration was rejected during testing because it did not configure Kokoro's CommonJS Transformers instance.
- Files modified in this iteration: `src/tts.ts`, `apps/video-server/src/index.ts`, `apps/video-server/src/queue.ts`, `apps/video-server/.env.example`, `package.json`, `pnpm-lock.yaml`, `codemap.md`.

Agent Worker Prompt Injection Diagnosis (2026-06-27)
- Confirmed that `prompts/hook.md` and `prompts/video.md` are read by `apps/agent-worker/src/skills.ts` but their `hookMd` and `videoMd` values are never referenced. `prompts/audio.md` is not loaded anywhere. `prompts/videos-context.md` only feeds the unused legacy `getVideoContext()` helper after background selection moved to `video-urls.md`.
- The model currently receives hardcoded summaries instead: a 1,684-character hook cheat sheet instead of the 31,882-character hook prompt, a separate 502-character dialogue-rules string instead of the 2,381-character natural-speech prompt, a 90-character caption formula, and none of the full video prompt. The AI SDK sends only the explicit `system` and `prompt` strings passed to `generateObject()`.
- Git history shows the dead Markdown loads and hardcoded summaries were introduced together in commit `05cc5de` (`Agentic pipeline with learning, hook generation, and skill injection`), so this was an incomplete initial integration rather than a later regression. `noUnusedLocals` is not enabled in the worker tsconfig, allowing the orphaned variables to pass typechecking.
- Recommended correction: inject `hook.md` into research/hook generation, inject `audio.md` plus the relevant dialogue rules into script generation, keep structured `video-urls.md` input for background selection, and do not inject all of `video.md` because much of it is an outdated operational guide rather than model guidance. No runtime code was changed during this diagnosis.
- Files modified in this iteration: `codemap.md`.

Agent Worker Crontab Newline Fix (2026-06-27)
- Fixed crontabWrite to ensure content ends with a newline before writing. `crontab` on macOS rejects files that don't end with a trailing newline. Both the direct `crontab` command and the fallback file write now use the normalized content.
- Files modified in this iteration: `apps/agent-worker/src/index.ts`, `codemap.md`.

Connected Accounts Check Before Scheduling (2026-06-27)
- Added server-side check in `cronSchedule.create` tRPC mutation: queries `connected_accounts` for the selected platforms on the given app and throws "Connect your Instagram account before scheduling." if any selected platform lacks a connected account.
- Added client-side check in `ScheduleForm`: queries connected accounts, computes missing platforms, shows a warning message, and disables the "Start Auto-Posting" button until all selected platforms have connected accounts. Mutation errors are also surfaced inline.
- Files modified in this iteration: `apps/web-app/src/server/api/routers/cronSchedule.ts`, `apps/web-app/src/app/dashboard/[appId]/page.tsx`, `codemap.md`.

Dashboard Sidebar Restructure + Social Page (2026-06-28, iteration 1)
- Removed sidebar from `dashboard/layout.tsx` — dashboard page no longer has sidebar
- Created `dashboard/[appId]/layout.tsx` with sidebar navigation: Options, Create Post, Analytics Post, Social
- Sidebar now only visible on app-specific pages (`/dashboard/[appId]/*`)
- Moved ConnectedAccountsSection from app detail page to new dedicated `/dashboard/[appId]/social` page
- Social page shows Instagram/TikTok account cards with connect/disconnect buttons
- Files modified: `apps/web-app/src/app/dashboard/layout.tsx`, `apps/web-app/src/app/dashboard/[appId]/page.tsx`, `apps/web-app/src/app/dashboard/[appId]/layout.tsx`, `apps/web-app/src/app/dashboard/[appId]/social/page.tsx`, `codemap.md`.

Repeatable Fine-Tune Video Generation (2026-06-28)
- Removed the `fineTuned` server-side gate in `videoGeneration.ts` generate procedure — users can now generate onboarding preview videos multiple times, even after the app has been fine-tuned.
- Refactored `VideoFineTuneSection` in `[appId]/page.tsx`: removed the `if (app?.fineTuned) return null` guard and the one-shot `started` state. The section is always visible. The button shows "Start Fine-Tune" / "Regenerate" / "Generating..." based on current state.
- Added explicit error messages for video generation failures and save failures (previously errors were silently swallowed).
- Added green success acknowledgment after saving preferences.
- Files modified in this iteration: `apps/web-app/src/server/api/routers/videoGeneration.ts`, `apps/web-app/src/app/dashboard/[appId]/page.tsx`, `codemap.md`.
- Verification: typecheck passes (only the 2 pre-existing LandingPage.tsx errors remain).

Landing Redesign and Legal Pages Port (2026-06-28, iteration 1)
- Ported the complete landing page, Terms & Conditions page, Privacy Policy page, interactive effects, compliance-copy updates, and four video assets from the unrelated-history `parth/landing-redesign` branch into the existing `apps/web-app` Next.js application. A merge or cherry-pick was intentionally avoided because the source branch is a standalone repository tree and would delete the monorepo application.
- Replaced the old landing route with the redesigned AttentionSpam page, added route-specific metadata, and added `/terms` and `/privacy`. Reused the web app's installed Lenis package instead of the source branch's CDN script.
- Moved the old landing-only global CSS out of `globals.css`, imported the redesign stylesheet, and scoped every redesign selector and CSS variable under `.vgs-site` so generic source selectors such as `.nav`, `.btn`, `main`, and `--border` cannot affect dashboard routes. Added self-hosted Next font variables for DM Sans and JetBrains Mono.
- Verification: `npm run typecheck` passes. An isolated production build compiled successfully and statically generated `/`, `/terms`, and `/privacy`; isolation was required because a concurrently running dev server was writing to the workspace `.next` directory. A temporary production server returned `200 text/html` for all three pages and `200 video/mp4` for all four copied videos, with response sizes matching the source assets. `git diff --check` passes. Visual browser inspection was blocked because the in-app browser connector could not initialize in this environment.
- Files modified in this iteration: `apps/web-app/src/app/layout.tsx`, `apps/web-app/src/app/page.tsx`, `apps/web-app/src/app/privacy/page.js`, `apps/web-app/src/app/terms/page.js`, `apps/web-app/src/components/landing-redesign/LandingPage.js`, `apps/web-app/src/components/landing-redesign/SiteEffects.js`, `apps/web-app/src/styles/globals.css`, `apps/web-app/src/styles/landing-redesign.css`, `apps/web-app/public/videos/Hero-web.mp4`, `apps/web-app/public/videos/video1-web.mp4`, `apps/web-app/public/videos/video2-web.mp4`, `apps/web-app/public/videos/video3-web.mp4`, `codemap.md`.

Landing Redesign and Legal Pages Port (2026-06-28, iteration 2)
- Removed the superseded `apps/web-app/src/components/landing` component tree after confirming that no application route imports it. Keeping it served no fallback path and left the project typecheck failing on two stale pointer-event typing errors.
- Verification: source search confirms the redesigned landing component is the only landing import, and `npm run typecheck` passes after the cleanup.
- Files modified in this iteration: `apps/web-app/src/components/landing/BgFx.tsx`, `apps/web-app/src/components/landing/ComingSoon.tsx`, `apps/web-app/src/components/landing/HowItWorks.tsx`, `apps/web-app/src/components/landing/Journey.tsx`, `apps/web-app/src/components/landing/LandingPage.tsx`, `apps/web-app/src/components/landing/Nav.tsx`, `apps/web-app/src/components/landing/Sections.tsx`, `apps/web-app/src/components/landing/VideoGallery.tsx`, `codemap.md`.

Create Post Page — Start Fresh on Every Visit (2026-06-28)
- Removed the auto-loading effect in `create/page.tsx` that loaded the latest `on_demand` job on page mount. Previously, navigating to the create page with a previously scheduled post would lock the form (textarea disabled, generate button hidden, schedule form hidden).
- Removed `isScheduled` from the textarea `disabled` check and removed the `!isScheduled` wrapper around the generate button — users can always type a new idea and generate, regardless of past scheduled posts.
- The `isScheduled` guard remains on the schedule form (`!isScheduled`) to prevent re-scheduling the same video job.
- Removed unused `getIdea` helper, `jobs` query, and stale invalidation calls.
- Files modified in this iteration: `apps/web-app/src/app/dashboard/[appId]/create/page.tsx`, `codemap.md`.
- Verification: typecheck passes.

Landing Sticky Features Diagnosis (2026-06-28)
- Root cause: the scoped redesign wrapper adds `overflow-x: hidden` to `.vgs-site`. CSS computes the other axis from `visible` to `auto`, making `.vgs-site` the nearest scrolling-mechanism ancestor of `.hcards-sticky`. The wrapper itself does not perform the document's vertical scrolling, so `position: sticky` is constrained against the wrong ancestor and the feature section scrolls away instead of remaining pinned for its full `400vh`.
- The section height and JavaScript progress calculation are otherwise consistent: four cards share the `300vh` scrollable interval left after subtracting the `100vh` sticky viewport. At viewport widths of 900px or less, the source implementation deliberately disables sticky behavior and switches to a three-second auto-cycle.
- Recommended correction: change `.vgs-site` to `overflow-x: clip` (or remove horizontal overflow clipping) so it does not establish a scroll container. If sticky behavior is also required below 901px, separately remove the responsive `position: relative`/`height: auto` overrides and the JavaScript width guard.
- No runtime code was changed during this diagnosis.
- Files modified in this iteration: `codemap.md`.

Landing Technology Section Removal (2026-06-28)
- Removed the “Built your app in anything? We’ll market it.” technology-stack section from the redesigned landing page.
- Removed its unused technology-pill CSS and cursor-effect selector so no dead section-specific code remains.
- Verification: `npm run typecheck`, source-reference search, and `git diff --check` pass.
- Files modified in this iteration: `apps/web-app/src/components/landing-redesign/LandingPage.js`, `apps/web-app/src/components/landing-redesign/SiteEffects.js`, `apps/web-app/src/styles/landing-redesign.css`, `codemap.md`.

TikTok Publish → Inbox/Draft Migration (2026-06-29)
- Changed TikTok publishing from direct `postReel()` (publish immediately) to `uploadDraft()` (deliver to TikTok Inbox for user review). This aligns with the published Privacy Policy & Terms which only claim `user.info.basic` + `video.upload` scopes. Users must now review and publish each video inside TikTok.
- `src/social/tiktok-provider.ts`: `createMedia` calls `uploadDraft()` instead of `postReel()`. `getMediaStatus` polls `/post/publish/status/fetch/` (inbox status) instead of `/video/publish/`. `publishMedia` stays as no-op (users publish inside TikTok).
- `apps/agent-worker/src/orchestrator.ts`: TikTok pipeline calls `uploadDraft()` (no caption param). Post records get `sent_to_inbox` status (not `published`). Link is `null` (no permalink for inbox delivery).
- `apps/web-app/src/components/landing-redesign/LandingPage.js`: "auto-posting" → "content upload" in How It Works section; "on autopilot" → "so you can stay focused on shipping" in Built for Builders section.
- `apps/web-app/src/app/dashboard/[appId]/page.tsx`: "Schedule auto-posting" → "Schedule content upload"; "generate and publish a video daily" → "generate a video daily and upload it to TikTok at your chosen time. You review and publish inside TikTok."
- TikTok OAuth scopes in `apps/web-app/src/lib/tiktok/auth.ts` kept as-is (including `video.publish`, `video.list`). Instagram provider/API routes unchanged. `postReel` function in `src/tiktok/post.ts` still exists but is no longer called.
- Verification: web-app typecheck passes. Agent-worker typecheck only hits the pre-existing `@ai-sdk/provider` module error in `src/ai.ts`. Root typecheck only hits the two pre-existing errors.
- Files modified in this iteration: `src/social/tiktok-provider.ts`, `apps/agent-worker/src/orchestrator.ts`, `apps/web-app/src/components/landing-redesign/LandingPage.js`, `apps/web-app/src/app/dashboard/[appId]/page.tsx`, `codemap.md`.

Known Issues
- Migrations 0006 and 0007 were registered in the journal but never run against Neon DB.
  Applied manually via psql on 2026-06-25.
- Video-server is in-memory — restart loses queued jobs (handled by getStatus marking DB jobs as failed)
- ffmpeg + ffprobe must be installed on video-server host
- VIDEO_SERVER_URL=http://localhost:3001 in web-app .env
- Video-server uses @supabase/supabase-js with SUPABASE_SERVICE_ROLE_KEY
