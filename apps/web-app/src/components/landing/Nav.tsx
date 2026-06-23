import Link from "next/link";

export default function Nav() {
	return (
		<nav id="nav">
			<a href="#" className="nav-logo">
				<span className="dot" />
				Vid-Gen-Scale
			</a>
			<ul className="nav-links">
				<li>
					<a href="#how">How It Works</a>
				</li>
				<li>
					<a href="#roadmap">Roadmap</a>
				</li>
				<li>
					<a href="#pricing">Pricing</a>
				</li>
				<li>
					<a href="#faq">FAQ</a>
				</li>
			</ul>
			<Link href="/dashboard" className="nav-cta">
				Dashboard
			</Link>
		</nav>
	);
}
