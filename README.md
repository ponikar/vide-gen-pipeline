# Vid-Gen-Scale

Marketing site for **Vid-Gen-Scale** — an AI content engine that automatically scripts, generates, and posts brainrot-style vertical videos to TikTok and Instagram for app developers.

Built with **Next.js (App Router)**. This is a faithful port of the original static HTML/CSS/JS site — same design, layout, dark theme, grid background, animations, and the auto-cycling "Runs On Autopilot" cards.

## Tech

- Next.js 14 (App Router, JavaScript)
- Plain global CSS (`app/globals.css`) — no UI framework
- [Lenis](https://github.com/darkroomengineering/lenis) for smooth scroll (loaded via CDN)

## Project structure

```
app/
  layout.js       # <html>/<head>, fonts, metadata, Lenis script
  page.js         # all page markup (server component)
  SiteEffects.js  # "use client" — cursor, intro, hero cards, carousel,
                  # scramble, count-up, reveal, marquee, mobile menu
  globals.css     # the full stylesheet
public/
  videos/         # gallery videos (mp4)
```

## Develop

```bash
npm install
npm run dev      # http://localhost:3000
```

## Build

```bash
npm run build
npm start
```

## Deploy

Works out of the box on Vercel (or any Node host). It also still deploys fine to Netlify with the Next.js runtime.
