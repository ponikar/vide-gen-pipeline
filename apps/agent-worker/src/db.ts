import { neon } from "@neondatabase/serverless";

export function createDb() {
	const url = process.env.POSTGRES_URL;
	if (!url) throw new Error("POSTGRES_URL is required");
	return neon(url);
}

export type Db = ReturnType<typeof createDb>;
