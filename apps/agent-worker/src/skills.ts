import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

function load(path: string): string {
	return readFileSync(resolve(__dirname, path), "utf-8");
}

const hookMd = load("../../../prompts/hook.md");
const videoMd = load("../../../prompts/video.md");
const videosContextMd = load("../../../prompts/videos-context.md");

export function getHookCheatSheet(): string {
	return `HOOK FORMULAS:
- missing_piece: "X isn't the problem. It's Y."
- hidden_thing: "There's a [thing] nobody's talking about."
- reveal_tease: "By the end of this you'll know X. But first—"
- wrong_assumption_flip: "Everyone said do X. I did the opposite."
- unpopular_opinion: "Unpopular opinion: [belief audience holds is wrong]"
- direct_accusation: "You're doing X wrong. Here's proof."
- stop_scrolling_callout: "Stop scrolling if you're [identity] and [problem]."
- pov_frame: "POV: You're a [identity] and [relatable situation]."
- shared_secret: "This is only for [specific group]."
- mistake_warning: "Don't do X until you've seen this."
- cost_frame: "I wasted X before I understood Y. You don't have to."
- window_closing: "This works now. It won't once everyone does it."
- direct_before_after: "Here's how I went from X to Y in Z time."
- discovery_moment: "I found a [thing] that [outcome]. It changed everything."

TEMPLATES:
- brainrot: split-screen with gameplay, 30s max, hook = sentence 1
- ugc: person talking to camera, casual, sounds like a real reaction
- slideshow: 6-slide carousel, slide 1 = thumbnail + text hook

TRIGGERS (pick 2, always include identity):
- Curiosity Gap: reveal just enough to show they're missing something
- Pattern Interrupt: violate expectations, force active mode
- Identity Targeting: name specific identity/situation/belief
- Open Loop: promise payoff, delay resolution

SCORING (rate each hook 1-5):
- specificity: does it feel written for exactly one type of person?
- tension: does it create discomfort/curiosity/urgency?
- payability: can the content deliver on what the hook promises?
Drop any hook scoring below 3 on payability.`;
}

export function getDialogueRules(): string {
	return `DIALOGUE RULES:
- No periods inside lines (period = TTS chunk boundary = pause = kills flow)
- One emotional beat per line — each line lands separately
- No questions in rage-bait — viewer disengages when asked to think
- Single speaker (A) throughout — no A/B structure
- No passive language — direct, accusatory, specific ("You're just short" not "Maybe you're short")
- First 3 seconds = pure attack, no setup, no "hey guys", no context
- CTA should feel like start of something, not end (open loop)`;
}

export function getCaptionFormula(): string {
	return `CAPTION FORMULA: [Hook/Identity call] + [Specific pain] + [Open loop] + [Profile off-ramp]`;
}

export function getProductionParams(): string {
	return `PRODUCTION PARAMS:
- Voice: af_jessica, speed 1.2
- No third-party video APIs
- Burned captions required
- Output: MP4 9:16 1080x1920`;
}

export function getVideoContext(): string {
	const subwayLines: string[] = [];
	const minecraftLines: string[] = [];
	let current = "";

	for (const line of videosContextMd.split("\n")) {
		if (line.includes("Subway Surfers")) current = "subway";
		else if (line.includes("Minecraft")) current = "minecraft";
		else if (current && line.match(/^\d+\.\s+https?:\/\//)) {
			if (current === "subway") subwayLines.push(line.replace(/^\d+\.\s+/, "").trim());
			else minecraftLines.push(line.replace(/^\d+\.\s+/, "").trim());
		}
	}

	return `BACKGROUND VIDEOS:
Subway Surfers (fast-paced, energetic): ${subwayLines.join(", ")}
Minecraft Parkour (measured, story-driven): ${minecraftLines.join(", ")}`;
}
