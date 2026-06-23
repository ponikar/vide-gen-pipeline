const FAQS = [
	{
		q: "What exactly is automated?",
		a: "Everything. You give us your app description once. We write the scripts, generate the brainrot videos, and post them to TikTok and Instagram on a schedule. You don't touch anything after setup.",
	},
	{
		q: "Do I need any video editing skills?",
		a: "No. The entire video — voiceover, captions, background footage, text hooks — is generated automatically.",
	},
	{
		q: "Which platforms do you post to?",
		a: "TikTok and Instagram Reels. YouTube is on the roadmap.",
	},
	{
		q: "Is it really free right now?",
		a: "Yes. We're in early access and onboarding founders manually. No credit card, no catch.",
	},
	{
		q: "What kind of videos do you make?",
		a: "Brainrot-style vertical videos — gameplay footage in the background, TTS voiceover, burned-in captions, and a text hook at the top. The format that gets watched.",
	},
	{
		q: "When will the agent / analytics features launch?",
		a: "We're building them now. Everyone in early access will get them first.",
	},
];

export function Pricing() {
	return (
		<div className="section" id="pricing">
			<div className="ea-box reveal">
				<div className="label ea-label">Pricing</div>
				<h2 className="h2">Free while we&apos;re in early access.</h2>
				<p className="sub ea-sub">
					Vid-Gen-Scale is free to use right now. We&apos;re onboarding founders
					one by one. Get in early and shape what we build.
				</p>
				<a href="#" className="btn-fill magnetic ea-cta">
					Get Early Access — Free<span className="arr">→</span>
				</a>
			</div>
		</div>
	);
}

export function Faq() {
	return (
		<div className="section" id="faq">
			<div className="faq-wrap">
				<div className="faq-head reveal">
					<div
						className="label"
						style={{ justifyContent: "center", display: "flex" }}
					>
						FAQ
					</div>
					<h2 className="h2">Questions answered.</h2>
				</div>
				<div className="faq-list reveal">
					{FAQS.map((item, i) => (
						<div className="faq-item" key={i}>
							<button className="faq-q">
								{item.q}
								<span className="faq-icon">+</span>
							</button>
							<div className="faq-a">
								<div className="faq-a-inner">{item.a}</div>
							</div>
						</div>
					))}
				</div>
			</div>
		</div>
	);
}

export function Footer() {
	return (
		<div className="footer">
			<div className="footer-logo">
				<span className="dot" />
				Vid-Gen-Scale
			</div>
			<ul className="footer-links">
				<li>
					<a href="#">Privacy</a>
				</li>
				<li>
					<a href="#">Terms</a>
				</li>
				<li>
					<a href="#">Twitter</a>
				</li>
			</ul>
			<div className="footer-copy">
				© 2026 Vid-Gen-Scale. Built for indie app developers.
			</div>
		</div>
	);
}
