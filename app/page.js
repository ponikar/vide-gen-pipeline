import SiteEffects from "./SiteEffects";

export default function Home() {
  return (
    <>
      {/* full-page background grid */}
      <div className="bg-grid" aria-hidden="true"></div>

      {/* Custom Cursor */}
      <div className="cursor" id="cursor"></div>

      {/* Intro / Loading */}
      <div className="intro" id="intro">
        <div className="intro-logo">
          <svg className="bird" viewBox="0 0 32 32" width="40" height="40" aria-hidden="true">
            <path d="M2 22 L16 4 L30 22 L16 15 Z" fill="#f7f5f2" />
            <path d="M16 15 L16 28" stroke="#f7f5f2" strokeWidth="2.4" fill="none" strokeLinecap="round" />
          </svg>
          <span className="intro-word">Vid-Gen-Scale</span>
        </div>
      </div>

      {/* Navigation */}
      <header className="nav" id="nav">
        <a className="nav-brand" href="#top">
          <svg className="bird" viewBox="0 0 32 32" width="20" height="20" aria-hidden="true">
            <path d="M2 22 L16 4 L30 22 L16 15 Z" fill="#f7f5f2" />
            <path d="M16 15 L16 28" stroke="#f7f5f2" strokeWidth="2.6" fill="none" strokeLinecap="round" />
          </svg>
          <span>Vid-Gen-Scale</span>
        </a>
        <nav className="nav-links" id="navLinks">
          <a href="#approach" className="scramble-link"><span className="t1">How It Works</span><span className="t2">How It Works</span></a>
          <a href="#roadmap" className="scramble-link"><span className="t1">Roadmap</span><span className="t2">Roadmap</span></a>
          <a href="#pricing" className="scramble-link"><span className="t1">Pricing</span><span className="t2">Pricing</span></a>
          <a href="#faq" className="scramble-link"><span className="t1">FAQ</span><span className="t2">FAQ</span></a>
        </nav>
        <a href="#footer" className="btn btn-light nav-cta">Get Early Access</a>
        <button className="hamburger" id="hamburger" aria-label="Menu">
          <span></span><span></span>
        </button>
      </header>

      <div className="mobile-menu" id="mobileMenu">
        <a href="#approach">How It Works</a>
        <a href="#roadmap">Roadmap</a>
        <a href="#pricing">Pricing</a>
        <a href="#faq">FAQ</a>
        <a href="#footer" className="btn btn-light">Get Early Access</a>
      </div>

      <main id="top">
        {/* HERO */}
        <section className="hero" id="hero">
          <div className="hero-grid">
            <div className="hero-left">
              <div className="hero-badge"><span className="dot"></span>AI Content Engine for App Developers</div>
              <h1 className="hero-title">
                <span className="ht-1">You build the app.</span>{" "}
                <span className="ht-2">We handle the content.</span>
              </h1>
              <p className="hero-sub">Vid-Gen-Scale automatically scripts, creates, and posts brainrot videos to TikTok and Instagram. Zero effort from you.</p>
              <div className="hero-actions">
                <a href="#footer" className="btn btn-light hero-cta">Get Early Access — Free <span className="arr">→</span></a>
                <a href="#approach" className="btn btn-ghost">See how it works <span className="arr">↓</span></a>
              </div>
            </div>

            <div className="hero-right">
              <div className="phone">
                <div className="phone-notch"></div>
                <video className="phone-video" src="/videos/Hero-web.mp4" autoPlay muted loop playsInline preload="metadata"></video>
                <div className="phone-ui">
                  <div className="tt-rail">
                    <div className="tt-btn">
                      <svg viewBox="0 0 24 24" width="24" height="24" fill="#fff" aria-hidden="true"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>
                      <small>24.2k</small>
                    </div>
                    <div className="tt-btn">
                      <svg viewBox="0 0 24 24" width="24" height="24" fill="#fff" aria-hidden="true"><path d="M4 4h16a1 1 0 0 1 1 1v11a1 1 0 0 1-1 1H9l-4 4V5a1 1 0 0 1 1-1z"/></svg>
                      <small>1.8k</small>
                    </div>
                    <div className="tt-btn">
                      <svg viewBox="0 0 24 24" width="24" height="24" fill="#fff" aria-hidden="true"><path d="M3 11l18-8-8 18-2.5-7.5L3 11z"/></svg>
                      <small>Share</small>
                    </div>
                  </div>
                  <div className="tt-caption">
                    <div className="tt-user">@vidgenscale</div>
                    <div className="tt-text">when your app finally finds its audience 🚀 #buildinpublic</div>
                  </div>
                </div>
              </div>
              <div className="phone-badge"><span className="dot"></span>Approved &amp; posted · TikTok &amp; Instagram</div>
            </div>
          </div>
        </section>

        {/* WHAT WE DO INTRO */}
        <section className="whatwedo-intro section" id="approach">
          <div className="wrap">
            <div className="label scramble" data-text="How It Works"><span className="dot"></span><span className="label-text">How It Works</span></div>
            <p className="reveal-text" id="revealText">Growing your app shouldn&apos;t feel like a second job. Vid-Gen-Scale makes it automatic. Through AI scripting, brainrot video generation, and auto-posting — we run the full content pipeline so you don&apos;t have to.</p>
          </div>
        </section>

        {/* HORIZONTAL SCROLL CARDS */}
        <section className="hcards" id="hcards">
          <div className="hcards-sticky">
            <div className="hcards-inner">
              <div className="hcards-left">
                <div className="label scramble" data-text="How It Works"><span className="dot"></span><span className="label-text">How It Works</span></div>
                <h2 className="hcards-title" id="hcTitle">Runs On Autopilot</h2>
                <p className="hcards-subtitle" id="hcSubtitle">Every 24 hours</p>
                <div className="hcards-dots" id="hcDots"></div>
              </div>

              <div className="hcards-center">
                {/* Card 1 */}
                <div className="hcard active" data-i="0">
                  <div className="pipeline">
                    <div className="pipe-trigger">
                      <span className="pipe-trigger-time">Every 24 Hours</span>
                      <span className="pipe-trigger-tag">TRIGGER</span>
                    </div>
                    <div className="pipe-steps">
                      <div className="pipe-step">
                        <div className="pipe-icon">✍️</div>
                        <div className="pipe-body">
                          <div className="pipe-title">Write the Script</div>
                          <div className="pipe-desc">AI generates a hook + voiceover script for your app</div>
                        </div>
                      </div>
                      <div className="pipe-step">
                        <div className="pipe-icon">🎬</div>
                        <div className="pipe-body">
                          <div className="pipe-title">Generate the Video</div>
                          <div className="pipe-desc">Brainrot-style vertical video assembled with captions and TTS</div>
                        </div>
                      </div>
                      <div className="pipe-step">
                        <div className="pipe-icon">📤</div>
                        <div className="pipe-body">
                          <div className="pipe-title">Post to TikTok &amp; Instagram</div>
                          <div className="pipe-desc">Auto-posted at the optimal time. You review and approve before anything goes live.</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Card 2 */}
                <div className="hcard" data-i="1">
                  <div className="orbit">
                    <div className="orbit-ring r1"></div>
                    <div className="orbit-ring r2"></div>
                    <div className="orbit-center">
                      <svg className="bird" viewBox="0 0 32 32" width="22" height="22"><path d="M2 22 L16 4 L30 22 L16 15 Z" fill="#1b1b1b" /><path d="M16 15 L16 28" stroke="#1b1b1b" strokeWidth="2.4" fill="none" /></svg>
                    </div>
                    <img className="orbit-av a1" src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=80&q=80&auto=format&fit=crop" alt="" />
                    <img className="orbit-av a2" src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=80&q=80&auto=format&fit=crop" alt="" />
                    <img className="orbit-av a3" src="https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=80&q=80&auto=format&fit=crop" alt="" />
                    <img className="orbit-av a4" src="https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=80&q=80&auto=format&fit=crop" alt="" />
                    <img className="orbit-av a5" src="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=80&q=80&auto=format&fit=crop" alt="" />
                    <img className="orbit-av a6" src="https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=80&q=80&auto=format&fit=crop" alt="" />
                  </div>
                </div>

                {/* Card 3 */}
                <div className="hcard" data-i="2">
                  <div className="bubbles">
                    <div className="big-bubble b1">100%</div>
                    <div className="big-bubble b2">24/7</div>
                    <div className="small-bubble">Hands-off</div>
                    <img className="bub-av v1" src="https://images.unsplash.com/photo-1531427186611-ecfd6d936c79?w=80&q=80&auto=format&fit=crop" alt="" />
                    <img className="bub-av v2" src="https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?w=80&q=80&auto=format&fit=crop" alt="" />
                  </div>
                </div>

                {/* Card 4 */}
                <div className="hcard" data-i="3">
                  <div className="bubbles">
                    <div className="big-bubble b2">9:16</div>
                    <div className="big-bubble b1">3s</div>
                    <div className="small-bubble">5.0 <span className="stars">★★★★★</span></div>
                    <img className="bub-av v1" src="https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=80&q=80&auto=format&fit=crop" alt="" />
                    <img className="bub-av v2" src="https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=80&q=80&auto=format&fit=crop" alt="" />
                  </div>
                </div>
              </div>

              <div className="hcards-right">
                <p className="hcards-desc" id="hcDesc">Scripts written, videos generated, and posts scheduled — automatically.</p>
              </div>
            </div>
          </div>
        </section>

        {/* FEATURE MARQUEE */}
        <section className="marquee-section section">
          <div className="label scramble center" data-text="Everything it does — automatically"><span className="dot"></span><span className="label-text">Everything it does — automatically</span></div>
          <div className="marquee">
            <div className="marquee-track">
              <span>AI Scripts</span><span>Brainrot Videos</span><span>TTS Voiceover</span><span>Burned-in Captions</span><span>Auto-Posting</span><span>TikTok</span><span>Instagram</span><span>Zero Effort</span>
              <span>AI Scripts</span><span>Brainrot Videos</span><span>TTS Voiceover</span><span>Burned-in Captions</span><span>Auto-Posting</span><span>TikTok</span><span>Instagram</span><span>Zero Effort</span>
            </div>
          </div>
        </section>

        {/* BUILT FOR BUILDERS */}
        <section className="flex-section" id="services">
          <div className="wrap">
            <div className="label scramble" data-text="Built for builders"><span className="dot"></span><span className="label-text">Built for builders</span></div>
            <p className="reveal-text right" id="revealText2">Content that markets your app on autopilot. Consistent, on-trend, and built to grow your reach — while you stay focused on shipping.</p>
          </div>
          <div className="service-cards">
            <article className="service-card reveal-up">
              <div className="service-img"><img src="https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=1000&q=80&auto=format&fit=crop" alt="Creator working on content" /></div>
              <div className="service-body">
                <h3>Always-On Content</h3>
                <p>A fresh batch of videos every single day, posted while you sleep. No calendar, no burnout.</p>
              </div>
            </article>
            <article className="service-card reveal-up">
              <div className="service-img"><img src="https://images.unsplash.com/photo-1542751371-adc38448a05e?w=1000&q=80&auto=format&fit=crop" alt="Indie developer at desk" /></div>
              <div className="service-body">
                <h3>Made for Indie Devs</h3>
                <p>Built for solo founders who&apos;d rather ship features than learn video editing.</p>
              </div>
            </article>
          </div>
        </section>

        {/* VIDEO GALLERY */}
        <section className="video-gallery section" id="gallery">
          <div className="wrap">
            <div className="label scramble center" data-text="What goes out"><span className="dot"></span><span className="label-text">What goes out</span></div>
            <h2 className="vg-head reveal-up">Videos your audience actually watches.</h2>
            <p className="vg-sub reveal-up">Brainrot-style vertical videos, generated and posted automatically. This is what goes out every day.</p>
            <div className="vg-grid">
              <article className="vg-card reveal-up">
                <video src="/videos/Hero-web.mp4" autoPlay muted loop playsInline preload="metadata"></video>
                <div className="vg-overlay">
                  <div className="vg-title">Hook in 3 seconds.</div>
                  <div className="vg-desc">Stops the scroll before they even think about it.</div>
                </div>
              </article>
              <article className="vg-card reveal-up">
                <video src="/videos/video1-web.mp4" autoPlay muted loop playsInline preload="metadata"></video>
                <div className="vg-overlay">
                  <div className="vg-title">TTS voiceover.</div>
                  <div className="vg-desc">Scripted, narrated, and timed automatically.</div>
                </div>
              </article>
              <article className="vg-card reveal-up">
                <video src="/videos/video2-web.mp4" autoPlay muted loop playsInline preload="metadata"></video>
                <div className="vg-overlay">
                  <div className="vg-title">Burned-in captions.</div>
                  <div className="vg-desc">Every word on screen, perfectly synced.</div>
                </div>
              </article>
              <article className="vg-card reveal-up">
                <video src="/videos/video3-web.mp4" autoPlay muted loop playsInline preload="metadata"></video>
                <div className="vg-overlay">
                  <div className="vg-title">Auto-posted.</div>
                  <div className="vg-desc">TikTok &amp; Instagram, on schedule. You approve each batch before it goes out.</div>
                </div>
              </article>
            </div>
          </div>
        </section>

        {/* STATS */}
        <section className="stats-section section" id="cases">
          <div className="wrap stats-grid">
            <div className="stats-headcol">
              <div className="label scramble" data-text="By the numbers"><span className="dot"></span><span className="label-text">By the numbers</span></div>
              <h2 className="stats-head reveal-up">Built to run itself.</h2>
            </div>
            <div className="stats-list">
              <div className="stat-row reveal-up">
                <div className="stat-num" data-target="100" data-suffix="%">0%</div>
                <p className="stat-desc"><b>100%</b> — Automated end to end. Scripts, videos, and posting all handled for you</p>
              </div>
              <div className="stat-row reveal-up">
                <div className="stat-num" data-target="24" data-suffix="/7">0/7</div>
                <p className="stat-desc"><b>24/7</b> — Always on. A fresh batch of videos goes out every single day</p>
              </div>
              <div className="stat-row reveal-up">
                <div className="stat-num" data-target="2" data-suffix="">0</div>
                <p className="stat-desc"><b>2</b> — Platforms posted to automatically: TikTok and Instagram</p>
              </div>
              <div className="stat-row reveal-up">
                <div className="stat-num" data-target="0" data-suffix="">0</div>
                <p className="stat-desc"><b>0</b> — Manual editing or scheduling. You review batches and we handle the rest.</p>
              </div>
            </div>
          </div>
        </section>

        {/* TECHNOLOGIES */}
        <section className="tech-section section">
          <div className="wrap">
            <div className="label scramble" data-text="Works with your stack"><span className="dot"></span><span className="label-text">Works with your stack</span></div>
            <h2 className="tech-head reveal-up">Built your app in anything? We&apos;ll market it.</h2>
            <div className="tech-cols">
              <div className="tech-col reveal-up">
                <div className="tech-coltitle">Native</div>
                <div className="tech-row">
                  <span className="tech-platform">iOS</span>
                  <span className="tech-card" style={{ "--c": "#f05138" }}><i className="ti">Sw</i>Swift</span>
                  <span className="tech-card" style={{ "--c": "#438eff" }}><i className="ti">Oc</i>Objective-c</span>
                </div>
                <div className="tech-row">
                  <span className="tech-platform">Android</span>
                  <span className="tech-card" style={{ "--c": "#a855f7" }}><i className="ti">Kt</i>Kotlin</span>
                  <span className="tech-card" style={{ "--c": "#e76f00" }}><i className="ti">Jv</i>Java</span>
                </div>
              </div>
              <div className="tech-col reveal-up">
                <div className="tech-coltitle">Hybrid</div>
                <div className="tech-row">
                  <span className="tech-platform">Flutter</span>
                  <span className="tech-card" style={{ "--c": "#42a5f5" }}><i className="ti">Fl</i>Flutter</span>
                  <span className="tech-card" style={{ "--c": "#6c7a89" }}><i className="ti">Dt</i>Dart</span>
                </div>
                <div className="tech-row">
                  <span className="tech-platform">React Native</span>
                  <span className="tech-card" style={{ "--c": "#61dafb" }}><i className="ti">Rn</i>React Native</span>
                  <span className="tech-card" style={{ "--c": "#3178c6" }}><i className="ti">Ts</i>Typescript</span>
                </div>
                <div className="tech-row">
                  <span className="tech-platform"></span>
                  <span className="tech-card" style={{ "--c": "#ec4899" }}><i className="ti">Kt</i>Kotlin</span>
                  <span className="tech-card" style={{ "--c": "#f7df1e" }}><i className="ti">Js</i>Javascript</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* COMPARISON */}
        <section className="vs-section section">
          <div className="wrap">
            <h2 className="vs-title reveal-up">Vid-Gen-Scale VS Doing It Yourself</h2>
            <div className="vs-table">
              <div className="vs-head">
                <div className="vs-feat"></div>
                <div className="vs-col vs-blueprint">Vid-Gen-Scale</div>
                <div className="vs-col">Doing It Yourself<small>You + CapCut</small></div>
                <div className="vs-col">Freelancers<small>Fiverr, Upwork</small></div>
                <div className="vs-col">Agencies<small>Social media agencies</small></div>
              </div>
              <div className="vs-row reveal-up">
                <div className="vs-feat">Fully Automated Pipeline</div>
                <div className="vs-col"><span className="vs-dot"></span></div>
                <div className="vs-col vs-no">No</div>
                <div className="vs-col vs-no">No</div>
                <div className="vs-col vs-no">No</div>
              </div>
              <div className="vs-row reveal-up">
                <div className="vs-feat">AI-written scripts and hooks for your app</div>
                <div className="vs-col"><span className="vs-dot"></span></div>
                <div className="vs-col vs-no">No</div>
                <div className="vs-col vs-no">Sometimes</div>
                <div className="vs-col vs-no">Sometimes</div>
              </div>
              <div className="vs-row reveal-up">
                <div className="vs-feat">Auto-posts to TikTok &amp; Instagram</div>
                <div className="vs-col"><span className="vs-dot"></span></div>
                <div className="vs-col vs-no">No</div>
                <div className="vs-col vs-no">No</div>
                <div className="vs-col vs-no">Sometimes</div>
              </div>
              <div className="vs-row reveal-up">
                <div className="vs-feat">A fresh batch of videos every single day</div>
                <div className="vs-col"><span className="vs-dot"></span></div>
                <div className="vs-col vs-no">No</div>
                <div className="vs-col vs-no">Sometimes</div>
                <div className="vs-col vs-no">Sometimes</div>
              </div>
            </div>
          </div>
        </section>

        {/* PRICING */}
        <section className="pricing-section section" id="pricing">
          <div className="wrap">
            <div className="label scramble center" data-text="Pricing"><span className="dot"></span><span className="label-text">Pricing</span></div>
            <h2 className="pricing-head reveal-up">Free while we&apos;re in early access.</h2>
            <p className="pricing-sub reveal-up">Vid-Gen-Scale is free to use right now. We&apos;re onboarding founders one by one. Get in early and shape what we build.</p>
            <div className="price-card reveal-up">
              <div className="price-eyebrow">Early Access</div>
              <div className="price-amount">$0<span>/mo</span></div>
              <div className="price-note">No credit card. No catch.</div>
              <ul className="price-list">
                <li>AI-written scripts &amp; hooks</li>
                <li>Brainrot video generation</li>
                <li>Auto-posting to TikTok &amp; Instagram</li>
                <li>A fresh batch of videos every day</li>
                <li>First access to new features</li>
              </ul>
              <a href="#top" className="btn btn-light price-cta">Get Early Access — Free</a>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="faq-section section" id="faq">
          <div className="wrap">
            <div className="label scramble center" data-text="FAQ"><span className="dot"></span><span className="label-text">FAQ</span></div>
            <h2 className="faq-head reveal-up">Questions answered.</h2>
            <div className="faq-list">
              <details className="faq-item reveal-up">
                <summary>What exactly is automated?<span className="faq-ic" aria-hidden="true"></span></summary>
                <div className="faq-a">Almost everything. You give us your app description once. We write the scripts and generate the brainrot videos automatically. Before anything goes live, you get a quick approval step — then we post to TikTok and Instagram on your schedule. All AI-generated content is automatically labeled as such on TikTok, as required by their guidelines.</div>
              </details>
              <details className="faq-item reveal-up">
                <summary>Do I need any video editing skills?<span className="faq-ic" aria-hidden="true"></span></summary>
                <div className="faq-a">No. The entire video — voiceover, captions, background footage, text hooks — is generated automatically.</div>
              </details>
              <details className="faq-item reveal-up">
                <summary>Which platforms do you post to?<span className="faq-ic" aria-hidden="true"></span></summary>
                <div className="faq-a">TikTok and Instagram Reels. YouTube is on the roadmap.</div>
              </details>
              <details className="faq-item reveal-up">
                <summary>Is it really free right now?<span className="faq-ic" aria-hidden="true"></span></summary>
                <div className="faq-a">Yes. We&apos;re in early access and onboarding founders manually. No credit card, no catch.</div>
              </details>
              <details className="faq-item reveal-up">
                <summary>What kind of videos do you make?<span className="faq-ic" aria-hidden="true"></span></summary>
                <div className="faq-a">Brainrot-style vertical videos — gameplay footage in the background, TTS voiceover, burned-in captions, and a text hook at the top. The format that gets watched.</div>
              </details>
              <details className="faq-item reveal-up">
                <summary>When will the agent / analytics features launch?<span className="faq-ic" aria-hidden="true"></span></summary>
                <div className="faq-a">We&apos;re building them now. Everyone in early access will get them first.</div>
              </details>
            </div>
          </div>
        </section>

        {/* ROADMAP */}
        <section className="roadmap-section section" id="roadmap">
          <div className="wrap">
            <div className="label scramble center" data-text="On the roadmap"><span className="dot"></span><span className="label-text">On the roadmap</span></div>
            <h2 className="roadmap-head reveal-up">We&apos;re just getting started.</h2>
            <p className="roadmap-sub reveal-up">The pipeline is live. Here&apos;s what&apos;s coming next.</p>
            <div className="roadmap-grid">
              <article className="roadmap-card reveal-up">
                <div className="rc-top"><div className="rc-icon">✅</div><span className="rc-tag">Coming soon</span></div>
                <h3 className="rc-title">Approval Mode</h3>
                <p className="rc-desc">Review and approve each batch before it goes live. Coming soon: optional full autopilot mode once approval is complete.</p>
              </article>
              <article className="roadmap-card reveal-up">
                <div className="rc-top"><div className="rc-icon">🤖</div><span className="rc-tag">Coming soon</span></div>
                <h3 className="rc-title">Agent That Learns</h3>
                <p className="rc-desc">Posts go out. The agent watches what gets clicks, not just views. Next batch gets smarter automatically.</p>
              </article>
              <article className="roadmap-card reveal-up">
                <div className="rc-top"><div className="rc-icon">📊</div><span className="rc-tag">Coming soon</span></div>
                <h3 className="rc-title">Click Tracking &amp; Analytics</h3>
                <p className="rc-desc">See exactly which videos drove people to your landing page. UTM tracking built in, no setup needed.</p>
              </article>
              <article className="roadmap-card reveal-up">
                <div className="rc-top"><div className="rc-icon">🧪</div><span className="rc-tag">Coming soon</span></div>
                <h3 className="rc-title">Hook A/B Testing</h3>
                <p className="rc-desc">The agent tests different opening hooks across batches and doubles down on what converts.</p>
              </article>
              <article className="roadmap-card reveal-up">
                <div className="rc-top"><div className="rc-icon">▶️</div><span className="rc-tag">Coming soon</span></div>
                <h3 className="rc-title">YouTube Support</h3>
                <p className="rc-desc">Same pipeline, new platform. AI-scripted videos over b-roll, posted to YouTube automatically.</p>
              </article>
              <article className="roadmap-card reveal-up">
                <div className="rc-top"><div className="rc-icon">🎥</div><span className="rc-tag">Coming soon</span></div>
                <h3 className="rc-title">UGC Format Videos</h3>
                <p className="rc-desc">AI talking head videos for founders who want a face on camera without being on camera.</p>
              </article>
            </div>
          </div>
        </section>

        {/* FOOTER */}
        <footer className="footer section" id="footer">
          <div className="wrap">
            <div className="footer-grid">
              <div className="footer-left">
                <div className="footer-brand">
                  <svg className="bird" viewBox="0 0 32 32" width="44" height="44"><path d="M2 22 L16 4 L30 22 L16 15 Z" fill="#f7f5f2" /><path d="M16 15 L16 28" stroke="#f7f5f2" strokeWidth="2.2" fill="none" strokeLinecap="round" /></svg>
                  <span className="footer-wordmark">Vid-Gen-Scale</span>
                </div>
              </div>
              <div className="footer-right">
                <div className="cta-card">
                  <div className="label"><span className="dot"></span><span className="label-text">Ready to grow?</span></div>
                  <p className="cta-body">Built for indie devs who&apos;d rather ship than market. Set it up once, grow every day.</p>
                  <a href="#top" className="btn btn-dark">Get Early Access — Free</a>
                </div>
                <div className="footer-photo">
                  <img src="https://images.unsplash.com/photo-1607799279861-4dd421887fb3?w=1000&q=80&auto=format&fit=crop" alt="Indie developer working at night" />
                </div>
              </div>
            </div>

            <div className="footer-meta">
              <span>© 2026 Vid-Gen-Scale. Built for indie app developers.</span>
              <span className="footer-legal"><a href="/terms">Terms &amp; Conditions</a><a href="/privacy">Privacy Policy</a></span>
            </div>

            <div className="footer-links">
              <div className="fl-col">
                <span className="fl-label">Explore</span>
                <a href="#approach">How It Works</a>
                <a href="#roadmap">Roadmap</a>
                <a href="#pricing">Pricing</a>
                <a href="#faq">FAQ</a>
              </div>
              <div className="fl-col">
                <span className="fl-label">Follow us</span>
                <a href="#">TikTok</a>
                <a href="#">Twitter</a>
              </div>
              <div className="fl-col">
                <span className="fl-label">Contact us</span>
                <a href="mailto:hello@vidgenscale.com">hello@vidgenscale.com</a>
              </div>
            </div>
          </div>
        </footer>
      </main>

      <SiteEffects />
    </>
  );
}
