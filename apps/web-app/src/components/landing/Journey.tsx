import { Iphone15Pro } from "@/components/ui/iphone-15-pro";

export default function Hero() {
	return (
		<section className="hero" id="home">
			<div className="hero-inner">
				<div className="hero-copy">
					<div className="j-badge">
						<span className="dot" />
						AI content engine for app developers
					</div>
					<h1 className="j-h1">
						You build the app.
						<br />
						<span className="grad">We handle the content.</span>
					</h1>
					<p className="j-sub">
						Vid-Gen-Scale automatically scripts, creates, and posts brainrot
						videos to TikTok and Instagram. Zero effort from you.
					</p>
					<div className="j-ctas">
						<a href="#cta" className="btn-fill magnetic">
							Get Early Access — Free<span className="arr">→</span>
						</a>
						<a href="#how" className="btn-ghost magnetic">
							See how it works<span className="arr">↓</span>
						</a>
					</div>
				</div>

				<div className="hero-phone">
					<div className="max-w-[290px] w-full mx-auto relative">
						<Iphone15Pro videoSrc="/videos/1.mp4" />
						<div className="phone-badge" style={{ zIndex: 20 }}>
							<span className="dot" />
							Auto-posted · TikTok &amp; Instagram
						</div>
					</div>
				</div>
			</div>
		</section>
	);
}
