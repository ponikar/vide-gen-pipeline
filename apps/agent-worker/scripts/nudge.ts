#!/usr/bin/env tsx
const [scheduleId, secret] = process.argv.slice(2);

if (!scheduleId || !secret) {
	console.error("Usage: nudge.ts <schedule_id> <secret>");
	process.exit(1);
}

const url = process.env.AGENT_WORKER_URL ?? "http://localhost:3002";

const res = await fetch(`${url}/nudge`, {
	method: "POST",
	headers: { "Content-Type": "application/json" },
	body: JSON.stringify({ schedule_id: scheduleId, secret }),
});

if (!res.ok) {
	const err = await res.text();
	console.error(`Nudge failed (${res.status}): ${err}`);
	process.exit(1);
}

console.log("Nudge sent ok");
