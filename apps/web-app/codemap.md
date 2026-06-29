# Codemap

## 2026-06-29 — Privacy Policy & Terms aligned to TikTok `user.info.basic` + `video.upload` scopes

- Rewrote Privacy Policy and Terms to accurately reflect actual TikTok integration:
  - Only `user.info.basic` and `video.upload` scopes
  - Draft/upload-only flow (inbox delivery, not direct publish)
  - Removed all claims about auto-posting, recurring schedules, automated publishing
  - Removed "username" from data collection (not available from `user.info.basic`)
  - Updated disclosure language (users responsible, not auto-applied)
  - Updated data retention to "within 30 days" for TikTok disconnect/deletion
  - Replaced placeholder legal entity name with operator name
- Files modified:
  - `src/app/privacy/page.js`
  - `src/app/terms/page.js`
  - `codemap.md`
- Verification: `pnpm run typecheck` passes with no errors.
- Flagged: TikTok OAuth scope string in `src/lib/tiktok/auth.ts:67` still requests `video.publish` and `video.list` in production — must match before legal text is accurate.

## 2026-06-29 — Landing page auth buttons

- Replaced "Get Early Access" CTA buttons with conditional Login/Dashboard buttons across the landing page and legal pages.
- Uses Clerk `auth()` (server-side) to check authentication state and conditionally render:
  - Logged out → links to `/sign-in` with "Login"
  - Logged in → links to `/dashboard` with "Dashboard"
- Clerk env vars already configured with `NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/dashboard`, so sign-in flow automatically redirects to dashboard.
- Files modified:
  - `src/app/page.tsx`
  - `src/components/landing-redesign/LandingPage.js`
  - `src/app/terms/page.js`
  - `src/app/privacy/page.js`
  - `codemap.md`
- Verification: `pnpm run typecheck` passes with no errors.

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
