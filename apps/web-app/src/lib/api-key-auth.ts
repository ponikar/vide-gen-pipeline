import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/db";
import { apiKeys } from "@/db/schema";
import { sha256 } from "./crypto";

export async function authenticateApiKey(request: Request): Promise<{
	keyId: string;
	clerkUserId: string;
	appId: string;
} | null> {
	const auth = request.headers.get("authorization");
	if (!auth?.startsWith("Bearer gf_")) return null;

	const keyValue = auth.slice(7);
	const prefix = keyValue.slice(0, 12);

	const [key] = await db
		.select()
		.from(apiKeys)
		.where(and(eq(apiKeys.keyPrefix, prefix), isNull(apiKeys.revokedAt)));
	if (!key) return null;

	const hash = await sha256(keyValue);
	if (hash !== key.keyHash) return null;

	db.update(apiKeys)
		.set({ lastUsedAt: new Date() })
		.where(eq(apiKeys.id, key.id))
		.then(() => {})
		.catch(() => {});

	return { keyId: key.id, clerkUserId: key.clerkUserId, appId: key.appId };
}
