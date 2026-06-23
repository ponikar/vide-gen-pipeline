"use client";

import { useEffect } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Lenis from "lenis";

import Nav from "./Nav";
import BgFx from "./BgFx";
import Hero from "./Journey";
import HowItWorks from "./HowItWorks";
import VideoGallery from "./VideoGallery";
import ComingSoon from "./ComingSoon";
import { Pricing, Faq, Footer } from "./Sections";

export default function LandingPage() {
  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);

    const ac = new AbortController();
    const { signal } = ac;

    const lenis = new Lenis({
      duration: 1.35,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    });
    lenis.on("scroll", ScrollTrigger.update);
    const raf = (time: number) => lenis.raf(time * 1000);
    gsap.ticker.add(raf);
    gsap.ticker.lagSmoothing(0);

    gsap.to("#progress", {
      scaleX: 1,
      ease: "none",
      scrollTrigger: { trigger: document.body, start: "top top", end: "bottom bottom", scrub: 0.3 },
    });

    const heroIntro = gsap.fromTo(
      ".hero-copy > *",
      { y: 34, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.85, stagger: 0.09, ease: "power3.out", delay: 0.15 }
    );

    document.querySelectorAll("[data-speed]").forEach((el) => {
      const speed = parseFloat((el as HTMLElement).dataset.speed ?? "0");
      gsap.to(el, { yPercent: -26 * speed, ease: "none", scrollTrigger: { trigger: document.body, start: "top top", end: "bottom bottom", scrub: 1 } });
    });

    document.querySelectorAll(".reveal").forEach((el) => {
      gsap.fromTo(el, { y: 30, opacity: 0 }, { y: 0, opacity: 1, duration: 1, ease: "power2.out", scrollTrigger: { trigger: el, start: "top 90%", toggleActions: "play none none none" } });
    });

    window.addEventListener("scroll", () => {
      document.getElementById("nav")?.classList.toggle("scrolled", window.scrollY > 60);
    }, { signal });

    function countUp(el: HTMLElement, target: number, dur: number, suffix?: string) {
      suffix = suffix || "";
      gsap.to({ v: 0 }, { v: target, duration: dur, ease: "power2.out", onUpdate: function () { el.textContent = Math.round(this.targets()[0].v) + suffix; } });
    }

    document.querySelectorAll("[data-count]").forEach((el) => {
      const target = +(el as HTMLElement).dataset.count!;
      const suffix = (el as HTMLElement).dataset.suffix || "";
      ScrollTrigger.create({ trigger: el, start: "top 85%", once: true, onEnter: () => countUp(el as HTMLElement, target, 1.4, suffix) });
    });

    (function () {
      const el = document.getElementById("waitlist-num");
      if (el) ScrollTrigger.create({ trigger: el, start: "top 85%", once: true, onEnter: () => countUp(el, 247, 1.6, "") });
    })();

    document.querySelectorAll(".faq-q").forEach((btn) => {
      btn.addEventListener("click", () => {
        const item = (btn as HTMLElement).parentElement!;
        const wasOpen = item.classList.contains("open");
        document.querySelectorAll(".faq-item").forEach((i) => i.classList.remove("open"));
        if (!wasOpen) item.classList.add("open");
      }, { signal });
    });

    const fine = window.matchMedia("(hover:hover) and (pointer:fine)").matches;
    if (fine) {
      document.querySelectorAll(".magnetic").forEach((btn) => {
        btn.addEventListener("mousemove", (e) => {
          const r = btn.getBoundingClientRect();
          gsap.to(btn, { x: (e.clientX - r.left - r.width / 2) * 0.2, y: (e.clientY - r.top - r.height / 2) * 0.28, duration: 0.6, ease: "power2.out" });
        }, { signal });
        btn.addEventListener("mouseleave", () => gsap.to(btn, { x: 0, y: 0, duration: 0.7, ease: "power3.out" }), { signal });
      });
    }

    ScrollTrigger.refresh();

    return () => {
      ac.abort();
      heroIntro.kill();
      ScrollTrigger.getAll().forEach((t) => t.kill());
      gsap.ticker.remove(raf);
      lenis.destroy();
    };
  }, []);

  return (
    <>
      <div id="progress" />
      <BgFx />
      <Nav />
      <Hero />
      <HowItWorks />
      <VideoGallery />
      <div className="wrap">
        <Pricing />
        <div className="divider" />
        <Faq />
      </div>
      <ComingSoon />
      <Footer />
    </>
  );
}
