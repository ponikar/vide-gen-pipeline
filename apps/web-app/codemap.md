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
