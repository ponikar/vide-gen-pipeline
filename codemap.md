
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
