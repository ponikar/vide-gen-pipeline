"use client";

import { useEffect, useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

const CARDS = [
  {
    src: "/videos/video1-web.mp4",
    title: "Hook in 3 seconds.",
    desc: "Stops the scroll before they even think about it.",
  },
  {
    src: "/videos/video2-web.mp4",
    title: "TTS voiceover.",
    desc: "Scripted, narrated, and timed automatically.",
  },
  {
    src: "/videos/video3-web.mp4",
    title: "Burned-in captions.",
    desc: "Every word on screen, perfectly synced.",
  },
  {
    src: "/videos/Hero-web.mp4",
    title: "Auto-posted.",
    desc: "TikTok & Instagram, on schedule, no login needed from you.",
  },
];

export default function VideoGallery() {
  const rootRef = useRef(null);

  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;

    gsap.registerPlugin(ScrollTrigger);

    const q = gsap.utils.selector(el);
    const cards = q(".vg-card");

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      gsap.set(cards, { opacity: 1, y: 0 });
      return;
    }

    // stagger in, left to right — slight fade + slide up
    const tween = gsap.fromTo(
      cards,
      { opacity: 0, y: 40 },
      {
        opacity: 1,
        y: 0,
        duration: 0.7,
        ease: "power3.out",
        stagger: 0.13,
        scrollTrigger: { trigger: el, start: "top 78%", toggleActions: "play none none none" },
      }
    );

    return () => {
      tween.scrollTrigger?.kill();
      tween.kill();
    };
  }, []);

  return (
    <section className="vg" id="videos" ref={rootRef}>
      <div className="vg-inner">
        <div className="vg-head">
          <h2 className="vg-title">Videos your audience actually watches.</h2>
          <p className="vg-sub">
            Brainrot-style vertical videos, generated and posted automatically. This is what goes out every day.
          </p>
        </div>

        <div className="vg-row">
          {CARDS.map((c, i) => (
            <div className="vg-card" key={i}>
              <video
                className="vg-video"
                src={c.src}
                autoPlay
                muted
                loop
                playsInline
                preload="auto"
              />
              <div className="vg-overlay" />
              <div className="vg-label">
                <div className="vg-label-t">{c.title}</div>
                <div className="vg-label-d">{c.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
