---
name: attentionspam-hooks
description: "Generate scroll-stopping hooks for app developer short-form videos (TikTok/Reels). Covers brainrot, UGC, and slideshow templates with a full hook formula library, psychological breakdown, AI generation instructions, and a testing + iteration framework."
---

# AttentionSpam Hook Engine

The hook is everything. A bad hook on a great video = zero views. A great hook on a mediocre video = thousands of views. Every other part of the pipeline is downstream of this.

This skill covers:
1. **Why hooks work** — the psychology, so AI can generate original ones, not just copy templates
2. **The three content templates** — Brainrot, UGC, Slideshow — and which hook styles fit each
3. **The hook formula library** — categorized, with app-specific examples
4. **AI generation instructions** — how to prompt for hooks given an app description
5. **The anti-patterns** — what makes hooks fail
6. **Testing framework** — how to iterate

---

## Part 1: Why Hooks Work (The Psychology)

Understanding the mechanism means AI can generate hooks that *feel* original rather than copying templates. There are four core psychological triggers. A great hook uses at least two simultaneously.

### Trigger 1: The Curiosity Gap
The human brain finds unresolved information genuinely uncomfortable. It will keep watching to close the gap — not out of enjoyment, but out of compulsion.

**The mechanism:** You reveal just enough to make the viewer aware they're missing something, then withhold the answer.

- Works: "The one setting in your iPhone that nobody told you about"
- Fails: "Here are some iPhone tips" (no gap — they already know what's coming)

The gap must be *specific* and *plausible*. Vague gaps ("something amazing is happening") don't work because the brain calculates they're not worth closing.

### Trigger 2: Pattern Interrupt
When scrolling, the brain is in autopilot — passively filtering for anything worth stopping for. Content that matches the expected pattern (another app ad, another tutorial) gets scrolled past without conscious processing.

**The mechanism:** Anything that violates expectations forces the brain to switch from passive to active mode. This is the 0.5 second window.

Pattern interrupts can be:
- **Visual** — unexpected first frame (something out of context, strong contrast, motion)
- **Verbal** — a sentence that contradicts what the person believes
- **Format** — something that doesn't look like content in your niche

**Brainrot is a pattern interrupt system** — the split-screen forces two attention systems to fire simultaneously (intellectual + visual), creating overstimulation that paradoxically *increases* retention. Creators using brainrot format consistently report 2-5x higher watch time than talking-head videos.

### Trigger 3: Identity Targeting / Tribal Call-Out
People don't scroll past content that is *about them*. When a hook names a specific identity, situation, or belief the viewer holds, it creates an immediate "this is for me" response.

**The mechanism:** Specificity feels like mind-reading. Generic = ignorable. Specific = "how did they know?"

- Works: "If you've built an app but have zero downloads, watch this"
- Fails: "Tips for app developers" (too broad, no identity activation)

The strongest form is the *accusation hook* — directly stating a mistake or belief the viewer holds, even if they'd push back on it. The pushback IS the watch. They stay to see if you're right.

### Trigger 4: Open Loop / Cliffhanger
Promise a payoff that hasn't arrived yet. The brain has a reward pathway that fires *in anticipation* of resolution — it wants the loop closed. If the video ends before the loop closes, it gets replayed.

**The mechanism:** State what will be revealed, but don't reveal it yet. Every sentence should delay the payoff while keeping the promise alive.

- Works: "By the end of this video, you'll know exactly why your app has zero downloads. But first—"
- The "but first" and the "here's why" structures are open loop engines.

**Compound hooks** — combining two or more triggers — are nearly impossible to scroll past. Example: Identity targeting ("if you built an app") + Curiosity gap ("there's a reason you have zero downloads") + Open loop ("and it's not what you think").

---

## Part 2: The Three Content Templates

AttentionSpam operates on three templates. Hook style, format, and AI generation approach differ per template.

---

### Template A: BRAINROT

**What it is:** Split-screen video. Top half = narrated content (story, fact, hot take). Bottom half = addictive gameplay (Subway Surfers, Minecraft parkour, satisfying ASMR). The dual-stimulus format hijacks two attention systems simultaneously, producing 85%+ average watch time vs. ~40% for standard content.

**Why it works for app marketing:** The gameplay keeps low-attention viewers watching while the script delivers the app message. You can convey a full 45-second pitch to someone who would have scrolled in 3 seconds on a normal video.

**Best hook types for brainrot:**
- Confessional / Story opener ("I built an app nobody downloaded for 8 months. Here's what I missed.")
- Shocking stat ("99% of apps fail in the first year. This is why.")
- Contrarian take ("Paid ads don't work for indie apps. Here's what does.")
- Identity accusation ("You're marketing your app like it's 2015.")

**Hook placement:** First spoken sentence + first text overlay must fire within 0–2 seconds. The gameplay starts instantly — it's the visual hook. The verbal/text hook lands on top of it.

**Duration rule (non-negotiable): 30 seconds maximum.** Reels longer than 30s see dramatically lower completion rates. If the script exceeds 30s, cut the body — never the hook. The hook IS the watch trigger. The body delivers the payoff. If the body is too long, the payoff never lands before the scroll.

**Format rules for the hook:**
- Script sentence 1 = the hook. No setup. No "hey guys." No context. Start with the conflict or the provocation.
- Text overlay on frame 1 should be the hook compressed to 5–8 words. Different from the voiceover — they should work together but not be identical.
- The hook must be payable. Whatever you promise in second 0–2, you must deliver by second 25.

**AI generation note:** When generating brainrot scripts, the hook IS sentence1. Generate 5–10 sentence-1 variants before writing the rest of the script. Pick the one with the strongest trigger combination, then build the body.

---

### Template B: UGC (User Generated Content Style)

**What it is:** A single person, phone camera, casual setting, talking directly to camera. No production value. Looks like something a real user posted about an app they discovered — not an ad. The most effective format for app install conversion in 2025–2026 because it blends into the For You feed and doesn't trigger ad-blindness.

**Key insight:** Users now ignore scripted, produced ads because they "see right through them." UGC-style content that feels native drives stronger engagement AND higher conversion. A tripod visible in the corner of a frame — because it's "authentic" — outperforms a $5,000 production. Backbone's UGC TikTok generated 130K likes, 3K comments, 8K shares filmed at home.

**Best hook types for UGC:**
- Reaction hook ("Wait — I've been doing this wrong the entire time")
- Discovery hook ("I just found an app that does [thing you thought was impossible]")
- POV hook ("POV: You finally stop manually tracking everything in notes")
- Callout hook ("If you're an indie developer and you don't know about this, I'm genuinely worried for you")
- Mistake confession ("I spent $2,000 on ads for my app before someone told me about this")

**Hook rules for UGC:**
- First frame must have the hook visible as text OR delivered verbally. Not "hi I'm [name]." Not context. The hook is first.
- Tone must be conversational and slightly imperfect. Too polished = ad. Slight hesitation, real-sounding sentence construction = native.
- The hook should sound like something the viewer's friend would say, not a brand.

**AI generation note:** When generating UGC scripts, write the hook as if a real user is reacting to using the app for the first time. First-person, present tense, surprise or frustration or relief as the dominant emotion. Avoid: marketing language, feature descriptions, superlatives ("amazing", "revolutionary"). Use: specific outcomes, personal reactions, relatable situations.

---

### Template C: SLIDESHOW (Image Carousel)

**What it is:** 6-slide image carousel with text overlays. No video required. TikTok data shows slideshows get 2.9x more comments and 2.6x more shares than standard video. Strong for visual categories (home, lifestyle, productivity, design tools). Lowest production cost — AI generates the images, text overlays are added programmatically.

**The hook in a slideshow is Slide 1.** This is the thumbnail AND the first impression. If Slide 1 doesn't stop the scroll, Slides 2–6 are never seen.

**Slide 1 hook = two components:**
1. **The image** — must stop the scroll visually. Strong contrast, unexpected composition, or a clear before/after setup visible at thumbnail size.
2. **The text overlay** — the hook sentence. Rendered in large, readable type in the top 30% of the frame.

**Best hook types for slideshows:**
- Before/After tease ("I showed my flatmate what AI thinks our kitchen could look like") — creates visual curiosity gap
- Relatability opener ("When you're proud of your app but your download count says 4") — identity trigger, often gets comments
- Controversy ("No, paid ads won't fix your distribution problem") — drives comments = more reach
- Social proof story ("A dev I know got 40,000 installs from organic content. Here's the exact format.")
- POV / scenario ("POV: Day 1 of posting instead of paying for ads")

**Text overlay rules specific to slideshow hooks:**
- 4–6 words per line maximum. Readable at a glance.
- 3–4 lines total. Centered at 28% from top (safe zone above TikTok controls).
- Use reactions, not labels. "Wait... this is actually working?" not "Social media automation tool."
- No emoji — canvas rendering strips them.
- Manual `\n` line breaks in the text string for clean wrapping.

**Slide 1 → Slide 6 structural rule:** Slide 1 = hook (open loop). Slides 2–5 = development (keep loop open). Slide 6 = payoff + CTA (close the loop). If Slide 6 closes too early — before the curiosity is satisfied — viewers don't share.

---

## Part 3: The Hook Formula Library

Categorized by psychological trigger. Each formula includes the structure, an app-marketing example, and a note on when to use it.

---

### Category 1: Curiosity Gap Hooks

**Formula 1.1 — The Missing Piece**
> "The [thing everyone does] isn't the problem. It's [thing nobody talks about]."

App example: "Posting on social isn't the problem. It's that you have no idea what to post."
App example: "Building the app isn't the problem. Nobody told you about distribution."

When to use: When the viewer thinks they understand the problem but they don't. Works best as a slideshow or UGC hook.

---

**Formula 1.2 — The Hidden Setting / Unknown Thing**
> "There's a [thing] that [outcome]. Nobody in [community] is talking about it."

App example: "There's a content format getting indie apps 50,000 views with zero ad spend. Nobody in the dev community is talking about it."

When to use: When you have a genuine insight or method the audience hasn't seen. Brainrot script opener.

---

**Formula 1.3 — The Reveal Tease**
> "By the end of this, you'll know [specific outcome]. But first — [conflict]."

App example: "By the end of this, you'll know exactly why your app has no downloads. But first — it's probably not what you think."

When to use: Setting up a longer brainrot video where you need to buy 45 seconds of attention.

---

### Category 2: Pattern Interrupt / Contrarian Hooks

**Formula 2.1 — The Wrong Assumption Flip**
> "Everyone told me to [common advice]. I did the opposite. Here's what happened."

App example: "Everyone told me to run ads for my app. I stopped spending entirely and did this instead."

When to use: When you're positioning against paid ads, conventional wisdom, or obvious advice. High engagement because it triggers disagreement (people watch to argue or to be convinced).

---

**Formula 2.2 — The Unpopular Opinion**
> "Unpopular opinion: [belief the audience holds is wrong]."

App example: "Unpopular opinion: An app with 0 downloads and a viral TikTok is more valuable than an app with 1,000 paid installs."

When to use: When you want comments and shares. Controversial hooks drive the algorithm even when people disagree — disagreement is engagement. Use sparingly; if every post is "unpopular opinion" it loses power.

---

**Formula 2.3 — The Direct Accusation**
> "You're [doing X wrong]. Here's proof."

App example: "You're marketing your app like it's a product launch. It's not. Here's why that's killing you."

When to use: High-confidence hook for identity-targeted content. Risky if the audience doesn't identify with the accusation, powerful if they do.

---

### Category 3: Identity / Tribal Call-Out Hooks

**Formula 3.1 — The Stop Scrolling Callout**
> "Stop scrolling if you're [specific identity] and you've been struggling with [specific problem]."

App example: "Stop scrolling if you built an app this year and it has under 100 downloads."

When to use: Always effective for cold audience acquisition. Filters out non-targets, pulls in the right people. Slideshow Slide 1 or UGC opener.

---

**Formula 3.2 — The POV Frame**
> "POV: You're an indie dev and [relatable situation]."

App example: "POV: You're an indie dev and your app has been live for 3 months and you still tell people 'it's getting traction.'"

When to use: The self-deprecating honesty creates strong relatability. Slideshow or UGC. Drives saves and shares because people send it to people who will relate.

---

**Formula 3.3 — The Shared Secret**
> "This is only for [specific group]. If you're not [identity], keep scrolling."

App example: "This is only for indie developers. If you work at a startup with a marketing budget, keep scrolling."

When to use: Creates exclusivity and in-group feeling. People in the group stay. People outside the group stay to find out why they should be in the group.

---

### Category 4: Fear / Loss Aversion Hooks

**Formula 4.1 — The Mistake You're Probably Making**
> "Don't [action] until you've seen this."

App example: "Don't spend another dollar on app ads until you've seen this."

When to use: Pre-purchase or pre-decision moments. Creates urgency. Works when the audience is *about to do* the thing you're warning against.

---

**Formula 4.2 — The Cost Frame**
> "I [wasted / lost / spent] [amount] before I understood [insight]. You don't have to."

App example: "I spent 6 months building followers on Twitter before I realized Instagram Reels could do it in 6 weeks. You don't have to learn that the hard way."

When to use: Credibility through personal failure. Authentic, positions speaker as having real experience. Strong UGC hook.

---

**Formula 4.3 — The Window Closing**
> "[Opportunity] only works if you start before [event / time / condition]."

App example: "Organic short-form content for apps works right now. In 18 months, every dev will be doing it and the window will close."

When to use: Creates urgency without fake scarcity. Works when the urgency claim is defensible.

---

### Category 5: Transformation / Outcome Hooks

**Formula 5.1 — The Direct Before/After**
> "Here's how I went from [before] to [after] in [time]."

App example: "Here's how I went from 0 installs to 10,000 in 30 days without spending anything."

When to use: When you have real or realistic numbers. Aspirational. Strong for slideshow because the before/after can be visualized in the image.

---

**Formula 5.2 — The Discovery Moment**
> "I found a [thing] that [outcome]. It changed [context]."

App example: "I found a content format that gets app developers 50,000 views per post. It changed how I think about distribution entirely."

When to use: Works as a UGC reaction — positions the speaker as a user who discovered something, not a brand selling something.

---

### Category 6: App-Specific Hooks (Distribution / Indie Dev Pain)

These are purpose-built for AttentionSpam's specific audience. Use as starting templates and remix with formulas above.

**Pain: Zero downloads despite good product**
- "I built something people wanted. Nobody knew it existed. This is that story."
- "My app had 4 downloads for 3 months. All 4 were me testing it."
- "Distribution isn't a marketing problem. It's a content problem. Here's the difference."

**Pain: Don't know what to post / content paralysis**
- "I opened Instagram to post about my app and stared at a blank screen for 20 minutes. Sound familiar?"
- "The hardest part of indie dev isn't building. It's screaming into a void and waiting for someone to hear you."
- "Every developer knows how to write code. Zero of them know what to post."

**Pain: Don't have time / resources of big companies**
- "Big companies spend $50K/month on social media managers. Here's what you can do for $0."
- "You're competing against companies with full marketing teams. You have Figma and a laptop. Here's the only play that works."

**Pain: Tried ads, they didn't work**
- "I ran TikTok ads for my app. $300 spent. 2 installs. Here's what I should have done instead."

---

## Part 4: AI Generation Instructions

When generating hooks for a specific app, the AI must follow this process. Do not skip steps.

### Step 1: Extract the Core Pain

From the app description, identify:
- **Who is the user?** (specific, not "anyone who wants X")
- **What is the moment of pain?** (not the general problem — the specific moment it hurts)
- **What do they currently believe about the problem?** (what wrong assumption are they holding?)
- **What would surprise them?** (the thing they don't know that the app addresses)

Example for a fitness app:
- User: Someone who started working out but stopped after 3 weeks
- Pain moment: Sunday evening, dreading the coming week, knowing they won't follow through
- Wrong belief: "I need more motivation" (they actually need fewer decisions)
- Surprise: The app removes every daily decision about what to do — you just open it and follow

### Step 2: Pick Two Triggers

From the four psychological triggers (curiosity gap, pattern interrupt, identity targeting, open loop), pick the two that fit the pain moment best. At minimum, always include identity targeting — the hook must feel personal.

### Step 3: Select Formula + Template

Match a formula from Part 3 to the trigger pair. Select the content template (brainrot, UGC, slideshow) based on:
- Brainrot: story-driven, longer narrative, dev/tech audience
- UGC: first-person discovery, casual, conversion-optimized
- Slideshow: visual transformation, lifestyle adjacent, lowest production cost

### Step 4: Generate 5–10 Variants

Never settle on one hook. Generate at minimum 5 variants, aiming for 8–10. Vary the:
- Trigger combination (swap one trigger)
- Formula (try accusation vs. POV vs. discovery)
- Length (some hooks are one sentence; some are two)
- Tone (some dry, some urgent, some confessional)

### Step 5: Score and Rank

Score each hook on three axes (1–5 each):
- **Specificity** — does it feel like it was written for exactly one type of person?
- **Tension** — does it create discomfort, curiosity, or urgency that needs to be resolved?
- **Payability** — can the content actually deliver on what the hook promises?

Drop any hook scoring below 3 on payability. A hook that over-promises destroys completion rate and trust.

### Step 6: Select 3 for Testing

Pick the top 3 by total score. These become the A/B/C test set for the week.

---

## Part 5: Anti-Patterns — Why Hooks Fail

These are the patterns that signal to the algorithm (and the viewer) to move on. Avoid them in every hook generated.

**Anti-pattern 1: The Setup**
Starting with context before the hook. "Hey, so I've been working on this app for a while and I wanted to share something I discovered..." — the viewer is gone before you finish. The hook IS the first sentence. Not the second.

**Anti-pattern 2: The Label**
Describing the content instead of selling it. "A tutorial on how to grow your app on TikTok" is a label. "You've been doing app marketing completely wrong" is a hook. Labels answer "what is this"; hooks answer "why should I care."

**Anti-pattern 3: The Lecture Signal**
Anything that sounds like educational content from an authority figure. "Today I'm going to teach you three strategies for..." — the brain pattern-matches this to school, meetings, and things it can safely ignore. Rephrase as a peer-to-peer observation.

**Anti-pattern 4: The Vague Tease**
"You won't believe what I found." "This changed my life." "Wait until you see this." These were exhausted in 2020. The brain now reads vague teasers as low-credibility bait and scrolls. The curiosity gap must be *specific* to work.

**Anti-pattern 5: Brand Voice**
Any language that sounds like a company wrote it. "Discover the power of [App Name]." "Transform your workflow with [Feature]." "Introducing [App Name] — the [adjective] way to [verb]." UGC and brainrot hooks must sound like a person, not a brand. If you'd hear it in a radio ad, rewrite it.

**Anti-pattern 6: The Obvious Hook**
A hook about something the viewer already knows. "Growing an app is hard." "Most apps fail." "You need social media presence." These statements are true but create no curiosity gap because the viewer already holds them. The hook must say something the viewer didn't already know, or frame something familiar in a way they haven't seen before.

---

## Part 6: Testing Framework

Hooks are hypotheses. The testing framework converts hypothesis into knowledge.

### What to Test

Test one variable at a time:
- Hook A vs Hook B (same template, different formula)
- Same hook on brainrot vs UGC template
- Same script, two different Slide 1 text overlays (slideshow)

Never change the hook AND the template AND the CTA simultaneously — you won't know what worked.

### What to Measure

**Primary metric: 3-second hold rate** — % of viewers who watch past 3 seconds. This is the purest hook measurement. If 3-second hold is below 30%, the hook failed regardless of everything else. A 65%+ 3-second hold is strong.

**Secondary metric: Watch-through rate** — if the hook is strong but people drop at second 10–15, the body didn't deliver on the hook's promise.

**Tertiary metric: Comment tone** — comments arguing with the hook ("that's not true") are actually positive — the hook created enough tension to provoke a response. Comments saying "this is so me" or "sent this to [person]" are ideal — identity targeting is working.

### Decision Rules

| 3-sec hold | Watch-through | Action |
|---|---|---|
| >65% | >50% | Scale: 3 variations immediately |
| >65% | <30% | Hook works, body broken — fix the payoff |
| <30% | any | Hook failed — rotate to next candidate |
| 30–65% | >50% | Decent — test one hook variant before scaling |

### Hook Evolution Log

Track in `attentionspam/hook-performance.json`:

```json
{
 "hooks": [
 {
 "id": "h001",
 "text": "I built an app nobody downloaded for 8 months. Here's what I missed.",
 "formula": "cost_frame",
 "template": "brainrot",
 "triggers": ["identity", "curiosity_gap"],
 "app": "YourAppName",
 "posted": "2026-01-15",
 "threeSecHold": 71,
 "watchThrough": 55,
 "views": 42000,
 "comments": 89,
 "result": "scale",
 "notes": "Strong with dev audience. Weaker with general consumer."
 }
 ],
 "rules": {
 "double_down": ["cost_frame + identity"],
 "testing": ["pov_frame", "unpopular_opinion"],
 "dropped": ["vague_tease", "label_hooks"]
 }
}
```

---

## Part 7: Template-Specific Generation Prompts for AI

Use these exact prompt structures when calling an LLM to generate hooks for a user's app.

### Brainrot Hook Generation Prompt

```
You are a short-form video script writer specializing in viral content for indie app developers.

App: [APP_NAME]
What it does: [APP_DESCRIPTION]
Target user: [TARGET_USER — be specific]
Core pain: [THE SPECIFIC MOMENT OF PAIN, not the general problem]

Generate 8 opening hook sentences for a brainrot-format TikTok (split-screen with gameplay footage). These are sentence 1 of the script. Each hook must:
- Start mid-conflict, no setup or context
- Use first-person voice (personal story, observation, or confession)
- Create a curiosity gap OR make a contrarian statement
- Be payable — the video must be able to deliver on what the hook implies
- Sound like a person talking, not a brand

Do NOT use: "hey guys", "so today", "I wanted to share", "amazing", "revolutionary", "introducing", generic statements the audience already knows

Format: numbered list, one sentence each, no explanations.
```

### UGC Hook Generation Prompt

```
You are a UGC content creator who genuinely uses apps and shares honest reactions on TikTok.

App: [APP_NAME]
What it does: [APP_DESCRIPTION]
Target user: [TARGET_USER]
The moment of discovery: [WHAT THE USER REALIZES WHEN THEY FIRST USE IT]

Generate 8 UGC-style video openers (first sentence + optional second sentence). Each hook must:
- Sound like a real person's unscripted reaction, not an ad
- Include a specific emotion (surprise, relief, frustration, confusion)
- Directly address the target user OR describe a relatable situation they recognize themselves in
- NOT sound like it was written by a marketing team

Tone: casual, conversational, slightly imperfect phrasing is fine. Like a text message, not a press release.

Format: numbered list, each entry is 1–2 sentences.
```

### Slideshow Slide 1 Text Overlay Generation Prompt

```
You are writing the text overlay for Slide 1 of a TikTok image slideshow. This is the hook — the only thing that determines if anyone sees Slides 2–6.

App: [APP_NAME]
What it does: [APP_DESCRIPTION]
Target user: [TARGET_USER]
Core pain: [PAIN POINT]

Generate 8 Slide 1 text overlays. Rules:
- Maximum 4 lines of text
- Maximum 5–6 words per line
- Use \n for line breaks
- Sound like a reaction or observation, not a product description
- Create curiosity, relatability, or mild controversy
- Do NOT use: the app name, feature descriptions, marketing language, emoji

Each overlay should work as a standalone sentence fragment or short statement visible on a phone screen at a glance.

Format: numbered list, with \n breaks shown.
```

---

## Part 8: Dialogue Writing Rules (Production Learning)

These rules come from live production testing. They override general script-writing advice.

### Rule 1: No Questions in Rage-Bait Scripts
Questions give the viewer a mental break. They check out to formulate an answer. In rage-bait content, never ask a question after the hook. Every line should be a statement of attack, revelation, or command.

**Bad:**
- "So what do I do?" (viewer disengages)
- "Smarter about what?" (pause, viewer floats away)

**Good:**
- "Stop fighting the filter." (command, no answer needed)
- "Your dating profile score." (reveal, no question)

### Rule 2: No Periods Inside Lines
Periods create distinct chunk boundaries in the TTS pipeline. Each period = one audio segment = one caption frame = one pause. Multiple pauses kill the rage flow.

**Bad:**
- "You're not ugly. You're just short." (two chunks, two pauses)
- "The algorithm isn't broken. It's working as designed." (two chunks, two pauses)

**Good:**
- Separate into two dialogue lines: "You're not ugly" / "You're just short"
- The TTS generates continuous audio between lines with no pause

### Rule 3: Each Emotional Beat = One Line
Every distinct emotional beat should be its own line. Don't combine two emotional thoughts into one line. The pause between lines is a feature — it lets each hit land.

**Bad:**
- "You're not ugly. You're just short." (one line, two beats, pause in middle)
- "They told you to be confident. Then they filtered you out." (one line, two beats, pause in middle)

**Good:**
- "You're not ugly" (beat 1)
- "You're just short" (beat 2)
- "They told you to be confident" (beat 3)
- "Then they filtered you out for being short" (beat 4)

### Rule 4: First 3 Seconds — Pure Attack, No Setup
The first3 lines must hit without any context-building. No "hey", no "so", no "today". Start mid-conflict.

**Bad:**
- "So I was on Hinge the other day and..." (too slow, setup)
- "Let me tell you something." (authority signal, too slow)

**Good:**
- "SHORT KING ENERGY" (hits in 1 second)
- "You're not ugly" (immediate reframe)
- "You're just short" (the accusation lands)

### Rule 5: The Off-Ramp Must Feel Like the START of Something
The CTA at the end should feel like the video is the trailer, not the whole movie. Give a reason to visit the profile. "Check my profile" works when the viewer is left wanting more, not when they've already gotten everything.

**Bad:**
- "So that's how you fix your profile. Follow for more tips." (closed loop, no reason to click)

**Good:**
- "Your dating profile score. Check my profile." (open loop — what score? visit profile to find out)
- "Send this to your boy on Hinge 6 months. 0 matches." (share trigger + identity call)

### Rule 6: Single Voice for Rage-Bait
A/B dialogue structures (one voice asks, another answers) feel like interviews or podcasts. Rage-bait needs one voice — a single person unloading. Use one speaker throughout.

Exception: If the script has a clear "before/after" or "confession/reveal" structure where the voice change reinforces the transformation, then A/B is acceptable.

### Rule 7: No Passive Language
Words like "makes sense", "I think", "maybe", "probably" soften the attack. Rage-bait is direct. Be specific and accusatory.

**Bad:**
- "Make it make sense." (passive, rhetorical, weak)
- "I guess the algorithm isn't broken." (hedged, no impact)

**Good:**
- "You're just short." (direct accusation)
- "It's working as designed." (cold, factual, more devastating than "I think")

---

## Quick Reference: Hook Formula Cheat Sheet

```
CURIOSITY GAP
├── Missing Piece: "X isn't the problem. It's Y."
├── Hidden Thing: "There's a [thing] nobody's talking about."
└── Reveal Tease: "By the end of this you'll know X. But first—"

PATTERN INTERRUPT
├── Wrong Assumption Flip: "Everyone said do X. I did the opposite."
├── Unpopular Opinion: "Unpopular opinion: [belief audience holds is wrong]"
└── Direct Accusation: "You're doing X wrong. Here's proof."

IDENTITY TARGETING
├── Stop Scrolling Callout: "Stop scrolling if you're [identity] and [problem]."
├── POV Frame: "POV: You're a [identity] and [relatable situation]."
└── Shared Secret: "This is only for [specific group]."

FEAR / LOSS AVERSION
├── Mistake Warning: "Don't do X until you've seen this."
├── Cost Frame: "I wasted X before I understood Y. You don't have to."
└── Window Closing: "This works now. It won't once everyone does it."

TRANSFORMATION
├── Direct Before/After: "Here's how I went from X to Y in Z time."
└── Discovery Moment: "I found a [thing] that [outcome]. It changed everything."
```

---

## Notes

- No hook formula works forever. Rotate actively. When a formula dominates a niche, it becomes the new default, and the brain's pattern-matching skips it.
- The 3-second hold rate is the only honest score. Views can be gamed. 3-second hold cannot.
- A hook that generates angry comments is not a failed hook. Disagreement is watch time. The algorithm doesn't distinguish.
- For app install conversion specifically: the hook gets the view, but the CTA gets the install. If views are high and installs are zero, the hook isn't broken — the CTA or the landing page is. Don't change the hook when the funnel breaks downstream.
