import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
	server: {
		POSTGRES_URL: z.string().url(),
		CLERK_SECRET_KEY: z.string().min(1),
		CLERK_WEBHOOK_SECRET: z.string().optional(),
		INSTAGRAM_APP_ID: z.string().optional(),
		INSTAGRAM_APP_SECRET: z.string().optional(),
		AI_PROVIDER: z.enum(["google", "minimax"]).default("google"),
		GOOGLE_GENERATIVE_AI_API_KEY: z.string().optional(),
		MINIMAX_API_KEY: z.string().optional(),
		TIKTOK_APP_ID: z.string().optional(),
		TIKTOK_APP_SECRET: z.string().optional(),
		VIDEO_SERVER_URL: z.string().default("http://localhost:3001"),
	},
	client: {
		NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: z.string().min(1),
		NEXT_PUBLIC_APP_URL: z.string().url().optional(),
		NEXT_PUBLIC_VIDEO_SERVER_URL: z.string().default("http://localhost:3001"),
		NEXT_PUBLIC_CLERK_SIGN_IN_URL: z.string().default("/sign-in"),
		NEXT_PUBLIC_CLERK_SIGN_UP_URL: z.string().default("/sign-up"),
		NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL: z.string().default("/dashboard"),
		NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL: z.string().default("/dashboard"),
	},
	runtimeEnv: {
		POSTGRES_URL: process.env.POSTGRES_URL,
		CLERK_SECRET_KEY: process.env.CLERK_SECRET_KEY,
		CLERK_WEBHOOK_SECRET: process.env.CLERK_WEBHOOK_SECRET,
		INSTAGRAM_APP_ID: process.env.INSTAGRAM_APP_ID,
		INSTAGRAM_APP_SECRET: process.env.INSTAGRAM_APP_SECRET,
		AI_PROVIDER: process.env.AI_PROVIDER,
		GOOGLE_GENERATIVE_AI_API_KEY: process.env.GOOGLE_GENERATIVE_AI_API_KEY,
		MINIMAX_API_KEY: process.env.MINIMAX_API_KEY,
		TIKTOK_APP_ID: process.env.TIKTOK_APP_ID,
		TIKTOK_APP_SECRET: process.env.TIKTOK_APP_SECRET,
		VIDEO_SERVER_URL: process.env.VIDEO_SERVER_URL,
		NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY:
			process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
		NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
		NEXT_PUBLIC_VIDEO_SERVER_URL: process.env.NEXT_PUBLIC_VIDEO_SERVER_URL,
		NEXT_PUBLIC_CLERK_SIGN_IN_URL: process.env.NEXT_PUBLIC_CLERK_SIGN_IN_URL,
		NEXT_PUBLIC_CLERK_SIGN_UP_URL: process.env.NEXT_PUBLIC_CLERK_SIGN_UP_URL,
		NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL:
			process.env.NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL,
		NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL:
			process.env.NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL,
	},
	skipValidation: !!process.env.SKIP_ENV_VALIDATION,
});
