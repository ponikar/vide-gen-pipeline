"use client";

import { useEffect, useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

/* inline icons — stroke = currentColor, grayscale */
const IconLoop = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 2l4 4-4 4" /><path d="M3 11v-1a4 4 0 0 1 4-4h14" />
    <path d="M7 22l-4-4 4-4" /><path d="M21 13v1a4 4 0 0 1-4 4H3" />
  </svg>
);
const IconChart = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 3v18h18" /><path d="M8 17v-5M13 17V8M18 17v-9" />
  </svg>
);
const IconSplit = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="6" cy="6" r="2" /><circle cx="6" cy="18" r="2" /><circle cx="18" cy="12" r="2" />
    <path d="M8 6h4a4 4 0 0 1 4 4M8 18h4a4 4 0 0 0 4-4" />
  </svg>
);
const IconCheck = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><path d="M22 4 12 14.01l-3-3" />
  </svg>
);
const IconPlay = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2.5" y="5" width="19" height="14" rx="3.5" /><path d="M10 9l5 3-5 3z" />
  </svg>
);
const IconUser = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" />
  </svg>
);

const CARDS = [
  { icon: <IconLoop />, title: "Agent That Learns", desc: "Posts go out. The agent watches what gets clicks, not just views. Next batch gets smarter automatically." },
  { icon: <IconChart />, title: "Click Tracking & Analytics", desc: "See exactly which videos drove people to your landing page. UTM tracking built in, no setup needed." },
  { icon: <IconSplit />, title: "Hook A/B Testing", desc: "The agent tests different opening hooks across batches and doubles down on what converts." },
  { icon: <IconCheck />, title: "Approval Mode", desc: "Review batches before they go live, or let it run fully on autopilot. Your call." },
  { icon: <IconPlay />, title: "YouTube Support", desc: "Same pipeline, new platform. AI-scripted videos over b-roll, posted to YouTube automatically." },
  { icon: <IconUser />, title: "UGC Format Videos", desc: "AI talking head videos for founders who want a face on camera without being on camera." },
];

export default function ComingSoon() {
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    gsap.registerPlugin(ScrollTrigger);

    const q = gsap.utils.selector(el);
    const cards = q(".cs-card");

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      gsap.set(cards, { opacity: 1, y: 0 });
      return;
    }

    const ctx = gsap.context(() => {
      gsap.fromTo(
        cards,
        { opacity: 0, y: 30 },
        { opacity: 1, y: 0, duration: 0.6, ease: "power2.out", stagger: 0.12, scrollTrigger: { trigger: el, start: "top 75%", once: true } }
      );
    }, el);

    return () => ctx.revert();
  }, []);

  return (
    <section className="cs" id="roadmap" ref={ref}>
      <div className="cs-inner">
        <div className="cs-head">
          <div className="cs-eyebrow">On the roadmap</div>
          <h2 className="cs-title">We&apos;re just getting started.</h2>
          <p className="cs-sub">The pipeline is live. Here&apos;s what&apos;s coming next.</p>
        </div>
        <div className="cs-grid">
          {CARDS.map((c, i) => (
            <div className="cs-card" key={i}>
              <span className="cs-badge">Coming Soon</span>
              <div className="cs-ic">{c.icon}</div>
              <div className="cs-card-title">{c.title}</div>
              <div className="cs-card-desc">{c.desc}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
