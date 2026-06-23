import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import type { EnvVars } from "./types.js";

const ENV_PATH = resolve(process.cwd(), ".env");

export function loadEnv(): EnvVars {
	if (!existsSync(ENV_PATH)) return {};

	const content = readFileSync(ENV_PATH, "utf-8");
	const env: Record<string, string> = {};

	for (const line of content.split("\n")) {
		const trimmed = line.trim();
		if (!trimmed || trimmed.startsWith("#")) continue;

		const eqIndex = trimmed.indexOf("=");
		if (eqIndex === -1) continue;

		const key = trimmed.slice(0, eqIndex).trim();
		let value = trimmed.slice(eqIndex + 1).trim();

		if (value.startsWith('"') && value.endsWith('"')) {
			value = value.slice(1, -1);
		} else if (value.startsWith("'") && value.endsWith("'")) {
			value = value.slice(1, -1);
		}

		env[key] = value;
	}

	return env;
}

export function saveEnv(vars: Record<string, string>): void {
	let existingLines: string[] = [];
	if (existsSync(ENV_PATH)) {
		existingLines = readFileSync(ENV_PATH, "utf-8").split("\n");
	}

	const existingKeys = new Set<string>();
	const newLines: string[] = [];

	for (const line of existingLines) {
		const trimmed = line.trim();
		if (!trimmed || trimmed.startsWith("#")) {
			newLines.push(line);
			continue;
		}

		const eqIndex = trimmed.indexOf("=");
		if (eqIndex === -1) {
			newLines.push(line);
			continue;
		}

		const key = trimmed.slice(0, eqIndex).trim();
		existingKeys.add(key);

		if (key in vars) {
			newLines.push(`${key}=${vars[key]}`);
		} else {
			newLines.push(line);
		}
	}

	for (const [key, value] of Object.entries(vars)) {
		if (!existingKeys.has(key)) {
			newLines.push(`${key}=${value}`);
		}
	}

	writeFileSync(
		ENV_PATH,
		newLines.join("\n").replace(/\n+$/, "") + "\n",
		"utf-8",
	);
}
