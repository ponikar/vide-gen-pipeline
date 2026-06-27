import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/db";
import { apiKeys } from "@/db/schema";
import { sha256 } from "./crypto";
import { createLogger, getRequestId } from "../../../../src/logger.js";

const logger = createLogger("web", { component: "api-key-auth" });

export async function authenticateApiKey(
	request: Request,
	requestId = getRequestId(request.headers),
): Promise<{
	keyId: string;
	clerkUserId: string;
	appId: string;
} | null> {
	const requestLogger = logger.child({ requestId });
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
		.catch((error: unknown) => {
			requestLogger.warn(
				"api_key.last_used_save_failed",
				"API key usage time could not be saved",
				{ error, keyId: key.id, stateSaved: false },
			);
		});

	return { keyId: key.id, clerkUserId: key.clerkUserId, appId: key.appId };
}
