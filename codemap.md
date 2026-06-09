
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

## 2026-06-09T17:08:00.000Z - Add forced-aligned word subtitle mode

**Why**
The subtitle renderer needed an accessibility-friendly mode that highlights the exact word being spoken, without estimating word timings from text length. Proper sync requires forced alignment against the generated TTS audio.

**Changes**
Added `subtitleMode` support with `line` as the default and `word` as the opt-in karaoke-style mode. Added a WhisperX alignment bridge that sends each generated TTS chunk and transcript to a Python helper, validates returned word timings, and attaches them to generated segments. Updated subtitle timing to convert per-chunk word timings into absolute video times while preserving punctuation from the original dialogue when word counts match. Added a word-mode renderer that builds a transparent 30fps caption animation with the active spoken word highlighted, then overlays it onto the 1080x1920 reel. Updated CLI help, input validation, docs, example JSON, and focused tests for the new mode.

**Files Modified**
- src/types.ts
- src/config.ts
- src/cli.ts
- src/alignment.ts
- src/subtitles.ts
- src/render.ts
- scripts/align-whisperx.py
- tests/config.test.ts
- tests/subtitles.test.ts
- README.md
- example.input.json
- codemap.md

**Result**
`npm run typecheck` passed, `npm test` passed with 20 tests, and `node --import tsx src/cli.ts --help` prints the new `--subtitle-mode <mode>` option. The word-mode dependency check was verified locally: because `python3` does not currently have WhisperX installed, word mode returns a clear setup message instead of a raw Python traceback. A full word-highlight MP4 render still requires installing WhisperX with `python3 -m pip install whisperx`.

## 2026-06-09T17:24:00.000Z - Test word-highlight generation end to end

**Why**
The new word subtitle mode needed a real generation test, not just unit tests, because it depends on Python alignment, Torch model caching, FFmpeg rendering, and burned-in visual output.

**Changes**
Created a local `.venv` for WhisperX testing after the global Python refused package installs. Added `.venv/` and `.cache/` to `.gitignore`. Updated alignment to accept `WHISPERX_PYTHON` so the CLI can use an isolated Python environment, and routed WhisperX/Torch/Hugging Face caches into project-local `.cache/whisperx` to avoid sandbox writes to the user home directory. Updated `runCommand` to support command-specific environment variables. Documented the alternate Python environment and cache behavior in `README.md`.

**Files Modified**
- .gitignore
- src/process.ts
- src/alignment.ts
- README.md
- codemap.md

**Generated Test Artifacts**
- out/test-line-reel.mp4
- out/test-clean-bg.mp4
- out/test-word-reel.mp4
- out/test-word-clean-reel.mp4
- .venv/
- .cache/

**Result**
`npm run typecheck` passed and `npm test` passed with 20 tests after the cache/environment changes. Line-mode generation succeeded at `out/test-line-reel.mp4` with 1080x1920 output and 29.775s duration. Word-mode generation succeeded with `WHISPERX_PYTHON=.venv/bin/python` at `out/test-word-clean-reel.mp4`; ffprobe verified 1080x1920 output with 6.850s duration. Extracted frame checks found both white subtitle pixels and yellow active-word pixels in the subtitle band, and visual inspection confirmed the word-highlight subtitle layer is burned into a clean source video.

## 2026-06-09T18:35:00.000Z - Fix word subtitle spacing and verify real background output

**Why**
The isolated word-mode test used FFmpeg `testsrc2`, which intentionally produced RGB color columns and was confusing as a pipeline output. The word subtitle renderer also relied on leading spaces inside SVG `tspan` elements, which were collapsed and made words run together.

**Changes**
Updated the word subtitle SVG renderer to use explicit `dx` spacing between word `tspan` elements instead of leading whitespace. Regenerated the clean isolated test to verify subtitle typography, then generated a real Subway Surfers word-mode output from `input.video-url.json` so the background check uses an actual gameplay video.

**Files Modified**
- src/render.ts
- codemap.md

**Generated Test Artifacts**
- out/test-word-clean-reel.mp4
- out/test-word-subway-reel.mp4

**Result**
`npm run typecheck` passed and `npm test` passed with 20 tests. `out/test-word-subway-reel.mp4` generated successfully with `WHISPERX_PYTHON=.venv/bin/python`; ffprobe verified 1080x1920 output with 6.850s duration. Frame inspection confirmed the real Subway Surfers background renders normally with no synthetic color columns, and the word-highlight subtitle now has visible spacing between words.

## 2026-06-09T18:38:00.000Z - Strengthen active word highlight style

**Why**
The yellow active-word fill was not noticeable enough on busy gameplay, especially against Subway Surfers yellow ramps and coins.

**Changes**
Changed the active word style from yellow to high-contrast cyan, increased the active word stroke width, and added a small SVG glow/drop-shadow filter only on the active word. This keeps inactive subtitle words in the normal white movie-subtitle style while making the currently spoken word easier to spot.

**Files Modified**
- src/render.ts
- codemap.md

**Generated Test Artifacts**
- out/test-word-subway-reel.mp4

**Result**
`npm run typecheck` passed and `npm test` passed with 20 tests. Regenerated `out/test-word-subway-reel.mp4`; ffprobe verified 1080x1920 output with 6.850s duration. Frame inspection confirmed the cyan active word is visibly stronger on the real Subway Surfers background without disrupting subtitle readability.
