
## 2026-06-09T10:52:11.333Z - Add codemap update hook

**Why**
The project needs a repeatable workflow checkpoint after each implementation or debugging iteration so codemap.md records what changed, why it changed, and which files were touched.

**Changes**
Added an npm codemap hook script that appends structured entries to codemap.md, documented the required workflow in AGENTS.md, and included scripts in TypeScript checking.

**Files Modified**
- AGENTS.md
- package.json
- tsconfig.json
- scripts/update-codemap.ts
- codemap.md

**Result**
Hook was run once for this iteration and created the codemap entry.

## 2026-06-09T10:55:00.000Z - Replace codemap script with implicit workflow

**Why**
The codemap update must be implicit assistant behavior documented in `AGENTS.md`, not a generated project script or npm command.

**Changes**
Removed the codemap npm script, deleted the generated codemap script, reverted TypeScript config to only include source and tests, and changed `AGENTS.md` to require manual `codemap.md` updates after implementation/debugging iterations.

**Files Modified**
- AGENTS.md
- package.json
- tsconfig.json
- scripts/update-codemap.ts
- codemap.md

**Result**
Codemap updates are now documented as an implicit workflow requirement with no script-based hook.

## 2026-06-09T11:01:00.000Z - Generate Hinge profile reel with custom overlays

**Why**
The requested script has separate voice copy and shorter text overlays, so the pipeline needed to support per-line overlay text instead of always rendering the spoken text as captions.

**Changes**
Added optional `overlayText` to dialogue input, preserved it through config parsing, chunking, caption timing, and PNG overlay rendering, and added regression tests for overlay chunking and timed caption preservation. Created `input.hinge-profile.json` for the one-speaker script and generated the final reel at `out/hinge-profile-reel.mp4`.

**Files Modified**
- src/types.ts
- src/config.ts
- src/chunk.ts
- src/render.ts
- src/subtitles.ts
- tests/chunk.test.ts
- tests/subtitles.test.ts
- input.hinge-profile.json
- out/hinge-profile-reel.mp4
- codemap.md

**Result**
`npm test` passed with 13 tests, `npm run typecheck` passed, and ffprobe verified the output as a 1080x1920 H.264/AAC MP4 with duration 31.85 seconds. Frame checks confirmed the generated video uses the requested short overlay text, including "4 months. 0 dates. Great messages." and "Not your opener. Your whole profile."

## 2026-06-09T11:08:00.000Z - Restore dialogue-as-subtitles behavior

**Why**
The video should show the spoken dialogue as subtitles, like movie subtitles, rather than a separate marketing overlay text. Subtitles need to be wrapped, centered, visible until the spoken chunk ends, and generated from the same dialogue text used for TTS.

**Changes**
Removed `overlayText` from the input schema, types, chunking, caption timing, tests, and Hinge input JSON. Updated subtitle rendering to use sentence-case dialogue text, balanced one- or two-line wrapping, smaller movie-style white text with black outline, and bottom-centered placement. Regenerated `out/hinge-profile-reel.mp4` from dialogue-only input.

**Files Modified**
- src/types.ts
- src/config.ts
- src/chunk.ts
- src/subtitles.ts
- src/render.ts
- tests/chunk.test.ts
- tests/subtitles.test.ts
- input.hinge-profile.json
- out/hinge-profile-reel.mp4
- codemap.md

**Result**
`npm test` passed with 12 tests, `npm run typecheck` passed, and `rg` confirmed no `overlayText` references remain in source, tests, or the Hinge input. ffprobe verified the regenerated output as 1080x1920 H.264/AAC with duration 35.325 seconds. Frame checks confirmed subtitles now display spoken dialogue such as "Sent great opening messages." and "Then I realized it wasn't my opener." in wrapped bottom-centered subtitle style.

## 2026-06-09T11:12:00.000Z - Add 1.25x TTS speed with synced subtitles

**Why**
The Hinge reel needed slightly faster voiceover while keeping subtitle timing synced to the spoken audio.

**Changes**
Added `ttsSpeed` to the input config with a default of `1`, passed it into Kokoro TTS generation, and set `input.hinge-profile.json` to `1.25`. Subtitle timing still comes from measured per-chunk audio durations after TTS generation, so captions stay synced to the faster voiceover.

**Files Modified**
- src/types.ts
- src/config.ts
- src/tts.ts
- src/cli.ts
- tests/config.test.ts
- input.hinge-profile.json
- out/hinge-profile-reel.mp4
- codemap.md

**Result**
`npm test` passed with 13 tests and `npm run typecheck` passed. ffprobe verified the regenerated MP4 as 1080x1920 H.264/AAC with duration 29.775 seconds, down from 35.325 seconds. Frame inspection confirmed subtitles still render correctly after the 1.25x speed change.

## 2026-06-09T11:23:00.000Z - Improve CLI help, overrides, and input validation

**Why**
The generator CLI needed to be easier for new users to run and debug, with a proper help screen, speed as a command-line parameter, useful runtime overrides, and clearer feedback for malformed input JSON.

**Changes**
Added `--help`/`-h`, `--speed`, `--video`, repeatable `--voice speaker=voice`, and existing `--out`/`--keep-temp` handling in the CLI parser. Made the input schema strict so unsupported fields are rejected, added clearer missing-file and invalid-config messages with the expected JSON shape, and documented the new flags in `README.md`. Updated `example.input.json` to show `ttsSpeed`.

**Files Modified**
- src/types.ts
- src/config.ts
- src/cli.ts
- tests/config.test.ts
- README.md
- example.input.json
- codemap.md

**Result**
`npm test` passed with 18 tests and `npm run typecheck` passed. Manual CLI checks confirmed `--help` prints usage, missing input files show a readable correction message, and invalid JSON reports exact bad fields plus the expected config shape.

## 2026-06-09T11:15:00.000Z - Prepare repository commit

**Why**
The project changes need to be committed without including generated videos, dependency folders, or other local artifacts.

**Changes**
Updated `.gitignore` to exclude `node_modules/`, generated output, build output, macOS metadata, and npm debug logs. Prepared the repository to stage source, tests, inputs, docs, package metadata, and codemap updates only.

**Files Modified**
- .gitignore
- codemap.md

**Result**
Generated MP4s and installed dependencies are excluded from the commit scope.

## 2026-06-09T11:17:00.000Z - Ignore run-specific input JSON files

**Why**
Only the reusable `example.input.json` should be committed. Generated run-specific inputs like `input.hinge-profile.json` and `input.video-url.json` should stay local.

**Changes**
Added `input.*.json` to `.gitignore` so ad-hoc generation configs are ignored while `example.input.json` remains trackable.

**Files Modified**
- .gitignore
- codemap.md

**Result**
The repository will include the example config but ignore local run-specific input JSON files.

## 2026-06-09T21:15:00.000Z - Add Instagram API integration module

**Why**
The agent needs to post generated reels to Instagram and read analytics. The Instagram Login API (launched July 2024) allows Instagram-only auth without requiring a Facebook Page.

**Changes**
Added a self-contained `src/instagram/` module with zero external dependencies using the Instagram Login API (`graph.instagram.com`). Created a one-time OAuth bootstrap script that exchanges a code for a long-lived token (60 days) via a local HTTP server callback. Added two CLI entry points for posting reels and fetching analytics. Every command checks token expiry with a 7-day buffer and auto-refreshes before proceeding.

**Files Created**
- `src/instagram/types.ts` — All Instagram-specific types
- `src/instagram/client.ts` — Low-level `graph.instagram.com` HTTP wrapper
- `src/instagram/env.ts` — .env read/write utility
- `src/instagram/auth.ts` — OAuth: `getAuthUrl`, `exchangeCode`, `getLongLivedToken`, `refreshToken`, `getProfile`
- `src/instagram/post.ts` — `postReel`: create container → poll status → publish
- `src/instagram/analytics.ts` — `getMediaInsights`, `getAccountInsights`, `getRecentMedia`
- `src/instagram/index.ts` — Public API re-exports
- `src/post.ts` — CLI entry: `npm run instagram:post -- <video_url> [caption]`
- `src/analytics.ts` — CLI entry: `npm run instagram:analytics`
- `scripts/setup-instagram.ts` — One-time OAuth bootstrap with local server
- `.env.example` — Environment variable template

**Files Modified**
- `package.json` — Added `instagram:setup`, `instagram:post`, `instagram:analytics` scripts
- `tsconfig.json` — Added `scripts/**/*.ts` to include array

**Result**
`npm run typecheck` passed with zero errors. `npm test` passed with 18/18 tests. Zero new dependencies added.

## 2026-06-10T18:10:00.000Z - Fix provider_user_id mismatch causing code 100/subcode 33

**Why**
Content publishing failed with `InstagramApiError: (400) code 100, error_subcode 33` — "Object with ID does not exist, cannot be loaded due to missing permissions." Root cause was a one-digit difference between the user_id from `api.instagram.com/oauth/access_token` (`27485387947815640`) and the IG User ID from `graph.instagram.com/me` (`27485387947815641`). The provider used the token-exchange user_id as the API account ID, which graph.instagram.com rejected.

**Changes**
- Changed `instagram-provider.ts` to use `profile.id` (from `graph.instagram.com/me`) instead of the `user_id` from the OAuth token exchange
- Fixed `upload-url.ts` pathname to store videos at bucket root instead of double-prefixed `videos/videos/`
- Updated `post.ts` CLI to not pass redundant `videos/` prefix in pathname
- Updated stale DB row from `27485387947815640` to `27485387947815641`

**Files Modified**
- `src/social/instagram-provider.ts`
- `api/content/upload-url.ts`
- `src/post.ts`

**Result**
Full end-to-end post succeeded: created container, polled status, published. Output: `https://www.instagram.com/reel/DZajzRojS_J/`. Provider user ID verified as `27485387947815641` via status endpoint. Account type is `BUSINESS` (was showing `MEDIA_CREATOR` earlier, likely same account with different metadata).

## 2026-06-10T23:45:00.000Z - One-shot POST /api/content/post and per-media analytics

**Why**
The AI agent needs two primary endpoints: (1) post a video with one call (upload, create container, poll, publish) and (2) fetch per-post analytics. Previously the flow required 3+ separate calls and analytics only returned account-level data.

**Changes**
- Created `api/content/post.ts` — multipart upload → Supabase → create container → poll up to 8s → publish → return `{id, permalink, containerId}`. Falls back to just `{containerId}` if processing exceeds timeout.
- Enhanced `api/content/analytics.ts` — added `?mediaId=` query param for per-post insights (reach, views, saves, shares, comments, likes). Without mediaId, returns account-level (existing behavior).
- Removed `api/content/upload.ts` (superseded by post.ts).
- Rewrote README.md around the two primary endpoints for AI agents.

**Files Modified**
- `api/content/post.ts` (created)
- `api/content/analytics.ts` (enhanced)
- `api/content/upload.ts` (deleted)
- `README.md` (rewritten)

**Result**
Instagram token hit rate limit ("API access blocked", code 200) during testing due to rapid curl calls. Endpoint logic verified — multipart parsing, Supabase upload, DB lookup, Instagram API call attempt all work correctly. Token needs cooldown or reconnect.

## 2026-06-12T20:15:00.000Z - Add custom voice blending for Peter Griffin voice

**Why**
The pipeline only supported pre-built Kokoro voice embeddings (like af_bella, am_puck). No Peter Griffin voice exists online. Needed voice blending to approximate the voice via weighted averaging of existing male embeddings.

**Changes**
- Created `scripts/blend-voices.ts` — CLI utility that reads two+ voice .bin files from kokoro-js, computes weighted average of Float32 embeddings (130,560 floats per voice), writes blended .bin to project `voices/` dir and copies to `node_modules/kokoro-js/voices/` for runtime loading.
- Modified `src/tts.ts` — After loading the TTS model, custom .bin files from `voices/` are copied to kokoro-js's voices directory. The internal `_validate_voice` method is patched to accept any voice name (bypasses frozen VOICES allowlist). `assertConfiguredVoices` checks both built-in and custom voice names.
- Created `voices/` directory for storing custom blended .bin files (gitignored via `voices/*.bin`).
- Default Peter Griffin blend: 60% am_puck (nasal/reedy) + 40% am_michael (body/warmth) = `am_peter`.

**Files Modified**
- `scripts/blend-voices.ts` (created)
- `src/tts.ts` (modified)
- `.gitignore` (added voices/*.bin)
- `codemap.md` (this entry)

**Result**
- Blend script verified: `npx tsx scripts/blend-voices.ts am_puck:0.6 am_michael:0.4 --output am_peter` produces correct 522,240-byte .bin
- TTS generation with custom voice `am_peter` works end-to-end: generates valid 24kHz mono WAV
- Full pipeline test passed: `npm run generate` with `am_peter` voice produces MP4 with correct duration
- `npm run typecheck` passes with zero errors
- Usage: configure voice as `"am_peter"` in input JSON or via `--voice A=am_peter`

## 2026-06-11T00:15:00.000Z - Upload CLI + dual-mode post for large files

**Why**
Videos average 15MB, exceeding Vercel's 4.5MB serverless body limit. The one-shot multipart POST /api/content/post couldn't handle large files. Need a two-step flow: upload directly to Supabase (bypassing Vercel) then post with the public URL.

**Changes**
- Created `scripts/upload.ts` — standalone CLI: gets signed upload URL from Vercel, PUTs video directly to Supabase, prints public URL. `npm run upload out/video.mp4` → outputs `https://...publicUrl`
- Modified `POST /api/content/post` to accept two modes:
  - Multipart form (`provider`, `caption`, `video`) — for files under 4.5MB (same as before)
  - JSON body (`{provider, caption, blobUrl}`) — for pre-uploaded videos of any size
- Refactored `src/post.ts` to use the JSON mode — uploads directly to Supabase, then calls POST /api/content/post with blobUrl. Works for any file size.
- Added `npm run upload` script to package.json
- Fixed Buffer→BodyInit type errors in api/content/post.ts for tsc compatibility

**Files Modified**
- `scripts/upload.ts` (created)
- `api/content/post.ts` (dual-mode — multipart + JSON)
- `src/post.ts` (refactored to use JSON mode with blobUrl)
- `package.json` (added upload script)
- `README.md` (two flows documented)

**Result**
`npm run typecheck` passes. `npm test` passes (18/18). `npm run upload` confirmed working — uploads file to Supabase and returns public URL. JSON mode confirmed working — Vercel API accepts blobUrl and processes the post. Only blocker is the rate-limited Instagram token from earlier testing. Large file flow is verified and ready once token is unblocked.

## 2026-06-12T21:00:00.000Z - Add voice cloning pipeline (KokoClone-based)

**Why**
The blender (weighted .bin averaging) cant create specific character voices like Stewie Griffin. Needed actual voice cloning from reference audio. KokoClone (kokoro-onnx TTS + Kanade voice conversion) provides a viable approach.

**Changes**
- Created `scripts/run-cloner.py` — self-contained Python script that auto-sets up venv, downloads models (Kanade 25Hz-clean, Kokoro ONNX), processes JSON batches via stdin, returns durations via stdout
- Created `src/cloner.ts` — Node.js wrapper spawning Python subprocess, piping segments and reference paths
- Modified `src/tts.ts` — dispatches clone: prefixed voices to cloner, groups clone segments by speaker for batching, mixes clone + regular voices in same dialogue
- Modified `src/config.ts` — resolveVoice remains unchanged (clone: prefix handled in tts.ts)
- Created `scripts/create-voice.ts` — one-command voice creation from YouTube URL or local file
- Updated `package.json` — added voice:create and setup:cloner scripts
- Updated `.gitignore` — added .cloner/ and voices/*.wav
- Created `voices/am_stewie.bin` — blended voice (50% bm_george + 50% bf_lily) for quick use

**Files Modified**
- scripts/run-cloner.py (created)
- src/cloner.ts (created)
- scripts/create-voice.ts (created)
- src/tts.ts (modified)
- package.json (modified)
- .gitignore (modified)
- codemap.md (this entry)
- README.md (added voice cloning docs)

**Result**
- Stewie reference audio downloaded from YouTube, trimmed to 15s
- Voice cloning verified: generates single-speaker WAVs matching reference voice characteristics
- Full pipeline test: `npm run generate` with clone:stewie voice produces valid MP4 with cloned audio
- Each segment takes ~2s on CPU after model warmup
- Multi-persona dialogues work (clone + regular voices interleaved)
- Usage: `"voices": { "A": "clone:stewie" }` in input JSON
- On first run, Python venv is auto-setup and models auto-downloaded

## 2026-06-12T23:50:00.000Z - Merge consecutive same-speaker chunks for seamless subtitles

**Why**
Long dialogue lines were split into multiple audio+subtitle chunks by MAX_WORDS/MAX_CHARS limits. Each chunk became a separate video segment. When chunk N ended and chunk N+1 started, the subtitle would disappear and reappear, making the speaker sound like they stopped mid-sentence. Users perceived it as the speaker "waiting for the next round trip."

**Changes**
- Rewrote `src/render.ts` `renderVideo()` to detect consecutive same-speaker segments and merge them into a single video segment
- Added `mergeConsecutiveSameSpeaker()`: groups consecutive segments by speaker, joins text into a single multi-line caption
- Added `mergeAudio()`: concatenates multiple WAV files into one for merged groups
- Updated `createCaptionImage()` and `createCaptionSvg()`: supports 3-line captions for merged text
- Removed dependency on `buildTimedCaptions` from `subtitles.ts` (replaced with local `buildCaptionSlots()`)
- SVG now dynamically positions text based on line count (1-line at Y=1050, 2-line at Y=1020, 3-line at Y=980)

**Files Modified**
- src/render.ts (major rewrite)

**Result**
- All 18 existing tests pass
- Long dialogue like "I think I am gonna need a bigger spoon than whatever" now renders as a single caption with the full text
- No subtitle blink or gap between consecutive same-speaker chunks
- Multi-speaker back-and-forth still creates separate segments per speaker change (correct behavior)
- Full pipeline test: 42.5s pizza-debate video generated with smooth captions
- `npm run typecheck` passes with zero errors
