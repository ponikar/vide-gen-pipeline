# Codemap

## 2026-06-28 — TikTok OAuth redirect URI

- Changed the TikTok authorization and token-exchange flows to use the registered production callback URI exactly.
- This prevents redirect URI mismatches when requests arrive through preview or alternate deployment origins.
- Files modified:
  - `src/lib/tiktok/auth.ts`
  - `src/app/api/auth/tiktok/route.ts`
  - `src/app/api/auth/tiktok/callback/route.ts`
  - `codemap.md`
- Verification: `npm run typecheck` reached unrelated existing errors in
  `src/components/landing/LandingPage.tsx:162-163` because `clientX` and
  `clientY` are accessed on `Event`. No errors were reported in the modified
  TikTok OAuth files.

## 2026-06-28 — TikTok OAuth response handling

- Fixed access-token and refresh-token parsing to match TikTok OAuth v2's
  top-level response fields instead of incorrectly reading a `data` wrapper.
- Added TikTok's required profile fields to the user-info request and accepted
  the API's successful `error.code: "ok"` envelope.
- Files modified:
  - `src/lib/tiktok/auth.ts`
  - `codemap.md`
- Verification: `git diff --check` passed. `npm run typecheck` remains blocked
  only by the existing `Event.clientX/clientY` errors in
  `src/components/landing/LandingPage.tsx:162-163`; no errors were reported in
  the modified TikTok OAuth code.
