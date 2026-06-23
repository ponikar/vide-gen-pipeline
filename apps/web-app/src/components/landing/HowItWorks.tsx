"use client";

import { useEffect, useRef } from "react";
import { gsap } from "gsap";

const IconCycle = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 12a9 9 0 0 1 15-6.7L21 8" /><path d="M21 3v5h-5" />
    <path d="M21 12a9 9 0 0 1-15 6.7L3 16" /><path d="M3 21v-5h5" />
  </svg>
);
const IconPen = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 20h9" /><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
  </svg>
);
const IconFilm = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2.5" y="2.5" width="19" height="19" rx="2.5" />
    <path d="M7 2.5v19M17 2.5v19M2.5 12h19M2.5 7h4.5M2.5 17h4.5M17 7h4.5M17 17h4.5" />
  </svg>
);
const IconSend = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="m22 2-7 20-4-9-9-4Z" /><path d="M22 2 11 13" />
  </svg>
);

const NODES = [
  { label: "Every 24 Hours", sub: "Trigger", icon: <IconCycle />, trigger: true },
  { label: "Write the Script", sub: "AI generates a hook + voiceover script for your app", icon: <IconPen /> },
  { label: "Generate the Video", sub: "Brainrot-style vertical video assembled with captions and TTS", icon: <IconFilm /> },
  { label: "Post to TikTok & Instagram", sub: "Auto-posted at the optimal time — no action needed from you", icon: <IconSend /> },
];

const OFFSETS = [0, 20, 6, 28];

export default function HowItWorks() {
  const rootRef = useRef(null);

  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;

    const q = gsap.utils.selector(el);
    const nodes = q(".hiw-node");
    const lines = q(".hiw-line-fill");

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      gsap.set(nodes, { opacity: 1, y: 0 });
      gsap.set(lines, { scaleY: 1 });
      return;
    }

    gsap.set(nodes, { opacity: 0, y: 18 });
    gsap.set(lines, { scaleY: 0 });

    const tl = gsap.timeline({ repeat: -1, repeatDelay: 2, paused: true });
    nodes.forEach((node, i) => {
      if (i > 0) tl.to({}, { duration: 0.4 });
      tl.to(node, { opacity: 1, y: 0, duration: 0.5, ease: "power2.out" });
      if (i < nodes.length - 1 && lines[i]) {
        tl.to(lines[i], { scaleY: 1, duration: 0.35, ease: "none" });
      }
    });

    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => (e.isIntersecting ? tl.play() : tl.pause())),
      { threshold: 0, rootMargin: "-20% 0px -20% 0px" }
    );
    io.observe(el);

    return () => {
      io.disconnect();
      tl.kill();
    };
  }, []);

  return (
    <section className="hiw" id="how" ref={rootRef}>
      <div className="hiw-inner">
        <div className="hiw-copy">
          <h2 className="hiw-title">Fully Automatic.<br />Every Single Day.</h2>
          <p className="hiw-sub">While you sleep, Vid-Gen-Scale runs the full pipeline — scripts written, videos made, posts scheduled. Automatically.</p>
        </div>

        <div className="hiw-flow">
          <div className="hiw-track">
            {NODES.map((n, i) => (
              <div className="hiw-step" key={i} style={{ marginLeft: OFFSETS[i] }}>
                <div className={`hiw-node${n.trigger ? " is-trigger" : ""}`}>
                  <div className="hiw-ic">{n.icon}</div>
                  <div className="hiw-text">
                    <div className="hiw-label">{n.label}</div>
                    <div className="hiw-sublabel">{n.sub}</div>
                  </div>
                </div>
                {i < NODES.length - 1 && (
                  <div className="hiw-line" style={{ marginLeft: n.trigger ? 27 : 23 }}>
                    <span className="hiw-line-fill" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
