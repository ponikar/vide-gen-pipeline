"use client";

import { useEffect } from "react";

/**
 * Ports the original vanilla script.js 1:1 into a client-side effect.
 * It operates on the already-rendered DOM (by id / class), exactly like the
 * static site did, so behavior is identical. A window guard prevents the
 * animation loops from starting twice under React Strict Mode in dev.
 */
export default function SiteEffects() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.__vgsInit) return;
    window.__vgsInit = true;

    var html = document.documentElement;
    var hasGSAP = typeof window.gsap !== "undefined"; // eslint-disable-line no-unused-vars

    /* ---------- Hero floating stat cards (four-quadrant scatter) ---------- */
    var heroData = [
      { icon: "🎬", title: "Auto-posted", sub: "TikTok & Instagram",
        pos: "top:9%;left:5%", rot: -7, fx: "-60vw", fy: "-30vh" },
      { icon: "✍️", title: "AI Script Written", sub: "Every 24 hours",
        pos: "top:8%;right:5%", rot: 6, fx: "60vw", fy: "-26vh" },
      { icon: "🔥", title: "Brainrot Format", sub: "Gets watched",
        pos: "top:40%;left:3%", rot: 5, fx: "-60vw", fy: "0vh" },
      { icon: "📈", title: "Hook in 3 seconds", sub: "Stops the scroll",
        pos: "bottom:9%;left:8%", rot: -5, fx: "-32vw", fy: "40vh" },
      { icon: "🔊", title: "TTS Voiceover", sub: "Auto-generated",
        pos: "bottom:10%;right:7%", rot: 7, fx: "40vw", fy: "40vh" }
    ];

    var heroWrap = document.getElementById("heroImages");
    var heroCards = [];
    if (heroWrap) {
      heroData.forEach(function (d, i) {
        var card = document.createElement("div");
        card.className = "hero-img stat";
        card.setAttribute("style", d.pos);
        card.style.setProperty("--rot", d.rot + "deg");
        card.style.setProperty("--fx", d.fx);
        card.style.setProperty("--fy", d.fy);
        card.style.setProperty("--delay", (1.0 + i * 0.1) + "s");
        card.innerHTML =
          '<div class="hero-img-inner">' +
            '<div class="stat-card">' +
              '<div class="stat-icon">' + d.icon + "</div>" +
              '<div class="stat-title">' + d.title + "</div>" +
              '<div class="stat-sub">' + d.sub + "</div>" +
            "</div>" +
          "</div>";
        heroWrap.appendChild(card);
        heroCards.push(card);
      });
      void heroWrap.offsetWidth; // paint the opacity:0 baseline before "landed" is added
    }

    /* ---------- Custom cursor ---------- */
    var cursor = document.getElementById("cursor");
    var mx = window.innerWidth / 2, my = window.innerHeight / 2, cx = mx, cy = my;
    window.addEventListener("mousemove", function (e) { mx = e.clientX; my = e.clientY; });
    function cursorLoop() {
      cx += (mx - cx) * 0.15; cy += (my - cy) * 0.15;
      if (cursor) cursor.style.transform = "translate(" + cx + "px," + cy + "px) translate(-50%,-50%)";
      requestAnimationFrame(cursorLoop);
    }
    cursorLoop();
    document.querySelectorAll("a, button, .tech-card, .hero-img").forEach(function (el) {
      el.addEventListener("mouseenter", function () { if (cursor) cursor.classList.add("hover"); });
      el.addEventListener("mouseleave", function () { if (cursor) cursor.classList.remove("hover"); });
    });

    /* ---------- Hero parallax (separate from entrance transform) ---------- */
    var tpx = 0, tpy = 0, ppx = 0, ppy = 0;
    window.addEventListener("mousemove", function (e) {
      tpx = (e.clientX / window.innerWidth - 0.5);
      tpy = (e.clientY / window.innerHeight - 0.5);
    });
    function parallaxLoop() {
      ppx += (tpx - ppx) * 0.06; ppy += (tpy - ppy) * 0.06;
      for (var i = 0; i < heroCards.length; i++) {
        var depth = (i % 3 + 1) * 8;
        heroCards[i].style.transform = "translate(" + (ppx * depth) + "px," + (ppy * depth) + "px)";
      }
      requestAnimationFrame(parallaxLoop);
    }
    parallaxLoop();

    /* ---------- Split hero title/sub into words ---------- */
    function splitWords(el) {
      if (!el) return [];
      var words = el.textContent.trim().split(/\s+/);
      el.innerHTML = words.map(function (w) {
        return '<span class="word"><span class="inner">' + w + "</span></span>";
      }).join(" ");
      return Array.prototype.slice.call(el.querySelectorAll(".word .inner"));
    }
    var titleInners = splitWords(document.getElementById("heroTitle"));
    var subInners = splitWords(document.getElementById("heroSub"));
    titleInners.concat(subInners).forEach(function (w) {
      w.style.display = "inline-block";
      w.style.transform = "translateY(24px)";
      w.style.opacity = "0";
      w.style.transition = "transform .7s cubic-bezier(.16,1,.3,1), opacity .7s ease";
    });

    /* ---------- Intro + entrance (no GSAP dependency) ---------- */
    var introStarted = false;
    function startIntro() {
      if (introStarted) return; introStarted = true;
      var logo = document.querySelector(".intro-logo");
      if (logo) { logo.style.transition = "opacity .7s ease"; requestAnimationFrame(function () { logo.style.opacity = "1"; }); }

      requestAnimationFrame(function () {
        heroCards.forEach(function (c) {
          void c.offsetWidth; // commit the opacity:0 baseline so the transition fires
          c.classList.add("landed");
        });
      });

      setTimeout(function () {
        html.classList.add("intro-done");
        titleInners.forEach(function (w, i) {
          setTimeout(function () { w.style.transform = "translateY(0)"; w.style.opacity = "1"; }, i * 50);
        });
        setTimeout(function () {
          subInners.forEach(function (w, i) {
            setTimeout(function () { w.style.transform = "translateY(0)"; w.style.opacity = "1"; }, i * 20);
          });
          var cta = document.querySelector(".hero-cta");
          if (cta) { cta.style.transition = "opacity .6s ease, transform .6s ease"; cta.style.opacity = "1"; }
        }, 300);
      }, 2300);
    }
    if (document.readyState === "complete") startIntro();
    window.addEventListener("load", startIntro);
    setTimeout(startIntro, 1500);

    /* ---------- Scramble ---------- */
    var CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    function scramble(el) {
      var labelEl = el.querySelector(".label-text");
      if (!labelEl) return;
      var finalText = el.getAttribute("data-text") || labelEl.textContent;
      var frame = 0, totalFrames = 12;
      var interval = setInterval(function () {
        var revealCount = Math.floor((frame / totalFrames) * finalText.length);
        var out = "";
        for (var i = 0; i < finalText.length; i++) {
          if (finalText[i] === " ") { out += " "; continue; }
          out += i < revealCount ? finalText[i] : CHARS[Math.floor(Math.random() * CHARS.length)];
        }
        labelEl.textContent = out;
        frame++;
        if (frame > totalFrames) { labelEl.textContent = finalText; clearInterval(interval); }
      }, 40);
    }

    /* ---------- IntersectionObserver: reveals, scramble, count-up ---------- */
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        var t = e.target;
        if (t.classList.contains("reveal-up")) t.classList.add("in");
        if (t.classList.contains("scramble")) scramble(t);
        if (t.classList.contains("stat-num")) countUp(t);
        io.unobserve(t);
      });
    }, { threshold: 0.18 });
    document.querySelectorAll(".reveal-up, .scramble, .stat-num").forEach(function (el) { io.observe(el); });

    /* ---------- count-up to correct targets ---------- */
    function countUp(el) {
      var target = parseInt(el.getAttribute("data-target"), 10);
      var prefix = el.getAttribute("data-prefix") || "";
      var suffix = el.getAttribute("data-suffix") || "";
      var dur = 1500, start = null;
      function step(now) {
        if (start === null) start = now;
        var p = Math.min((now - start) / dur, 1);
        var eased = 1 - Math.pow(1 - p, 3);
        el.textContent = prefix + Math.round(eased * target) + suffix;
        if (p < 1) requestAnimationFrame(step);
        else el.textContent = prefix + target + suffix;
      }
      requestAnimationFrame(step);
    }

    /* ---------- Word-by-word scroll reveal ---------- */
    var revealEls = [];
    function setupRevealText(id) {
      var el = document.getElementById(id);
      if (!el) return;
      var words = el.textContent.trim().split(/\s+/);
      el.innerHTML = words.map(function (w) { return '<span class="rword">' + w + "</span>"; }).join(" ");
      revealEls.push({ el: el, words: Array.prototype.slice.call(el.querySelectorAll(".rword")) });
    }
    setupRevealText("revealText");
    setupRevealText("revealText2");
    function updateReveals() {
      var vh = window.innerHeight;
      revealEls.forEach(function (r) {
        var rect = r.el.getBoundingClientRect();
        var startY = vh * 0.85, endY = vh * 0.35;
        var progress = (startY - rect.top) / (startY - endY + rect.height);
        var clamped = Math.max(0, Math.min(1, progress));
        var lit = Math.floor(clamped * r.words.length * 1.1);
        for (var i = 0; i < r.words.length; i++) r.words[i].style.color = i < lit ? "#f7f5f2" : "#444";
      });
    }

    /* ---------- Horizontal cards driven every frame ---------- */
    var hcardsData = [
      { title: "Runs On Autopilot", sub: "Every 24 hours", desc: "Scripts written, videos generated, and posts scheduled — automatically." },
      { title: "Reach Your Audience", sub: "TikTok & Instagram", desc: "Auto-posted to the platforms where your users actually scroll." },
      { title: "Zero Effort Required", sub: "Fully hands-off", desc: "No editing, no scheduling, no logins. Set it up once and you're done." },
      { title: "Built to Get Watched", sub: "Brainrot format", desc: "3-second hooks, TTS voiceover, and burned-in captions that stop the scroll." }
    ];
    var hcTitle = document.getElementById("hcTitle");
    var hcSub = document.getElementById("hcSubtitle");
    var hcDesc = document.getElementById("hcDesc");
    var hcards = Array.prototype.slice.call(document.querySelectorAll(".hcard"));
    var hcDotsWrap = document.getElementById("hcDots");
    var hcDots = [];
    if (hcDotsWrap) {
      hcardsData.forEach(function (_, i) {
        var d = document.createElement("span");
        d.className = "d" + (i === 0 ? " on" : "");
        hcDotsWrap.appendChild(d); hcDots.push(d);
      });
    }
    var activeCard = -1;
    function setCard(i) {
      if (i === activeCard) return;
      activeCard = i;
      hcards.forEach(function (c, idx) { c.classList.toggle("active", idx === i); });
      hcDots.forEach(function (d, idx) { d.classList.toggle("on", idx === i); });
      if (hcTitle) hcTitle.textContent = hcardsData[i].title;
      if (hcSub) hcSub.textContent = hcardsData[i].sub;
      if (hcDesc) hcDesc.textContent = hcardsData[i].desc;
    }
    setCard(0);
    var hcSection = document.getElementById("hcards");
    function updateHCards() {
      if (!hcSection) return;
      if (window.innerWidth <= 900) { return; } // mobile: cards auto-cycle instead of scroll-driven
      var rect = hcSection.getBoundingClientRect();
      var total = hcSection.offsetHeight - window.innerHeight;
      var scrolled = Math.min(Math.max(-rect.top, 0), total);
      var progress = total > 0 ? scrolled / total : 0;
      var idx = Math.min(hcardsData.length - 1, Math.floor(progress * hcardsData.length * 0.999));
      setCard(idx);
    }

    /* ---------- Unified scroll tick (works with or without Lenis) ---------- */
    function tick() { updateHCards(); updateReveals(); }
    window.addEventListener("scroll", tick, { passive: true });
    window.addEventListener("resize", tick);
    function rafTick() { tick(); requestAnimationFrame(rafTick); }
    rafTick();

    /* ---------- Mobile: auto-cycle the autopilot cards (desktop uses scroll) ---------- */
    function hcInView() {
      if (!hcSection) return false;
      var r = hcSection.getBoundingClientRect();
      return r.top < window.innerHeight * 0.85 && r.bottom > window.innerHeight * 0.15;
    }
    var hcTimer = null;
    function hcStartAuto() {
      if (hcTimer) clearInterval(hcTimer);
      hcTimer = setInterval(function () {
        if (window.innerWidth > 900 || !hcInView()) return;
        setCard((activeCard + 1) % hcardsData.length);
      }, 3000);
    }
    hcStartAuto();
    hcDots.forEach(function (d, idx) {
      d.style.cursor = "pointer";
      d.addEventListener("click", function () { setCard(idx); hcStartAuto(); });
    });

    /* ---------- Mobile menu ---------- */
    var hamburger = document.getElementById("hamburger");
    var mobileMenu = document.getElementById("mobileMenu");
    if (hamburger && mobileMenu) {
      hamburger.addEventListener("click", function () { mobileMenu.classList.toggle("open"); });
      mobileMenu.querySelectorAll("a").forEach(function (a) {
        a.addEventListener("click", function () { mobileMenu.classList.remove("open"); });
      });
    }

    /* ---------- Lenis smooth scroll (optional) ---------- */
    if (typeof window.Lenis !== "undefined") {
      try {
        var lenis = new window.Lenis({ duration: 1.1, smoothWheel: true });
        lenis.on("scroll", tick);
        (function raf(time) { lenis.raf(time); requestAnimationFrame(raf); })();
        document.querySelectorAll('a[href^="#"]').forEach(function (a) {
          a.addEventListener("click", function (e) {
            var id = a.getAttribute("href");
            if (id.length > 1) {
              var t = document.querySelector(id);
              if (t) { e.preventDefault(); lenis.scrollTo(t, { offset: -20 }); }
            }
          });
        });
      } catch (err) { /* fall back to native scroll */ }
    }
  }, []);

  return null;
}
