import { type LanguageModel } from "ai";
import { google } from "@ai-sdk/google";
import { minimax } from "vercel-minimax-ai-provider";
import { env } from "@/env";
import { TRPCError } from "@trpc/server";

function getModel(): LanguageModel {
  switch (env.AI_PROVIDER) {
    case "google": {
      if (!env.GOOGLE_GENERATIVE_AI_API_KEY) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "GOOGLE_GENERATIVE_AI_API_KEY is not set",
        });
      }
      return google("gemini-2.0-flash-lite");
    }
    case "minimax": {
      if (!env.MINIMAX_API_KEY) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "MINIMAX_API_KEY is not set",
        });
      }
      return minimax("MiniMax-M2");
    }
  }
}

export function getScrapeModel(): LanguageModel {
  return getModel();
}

export function getVideoModel(): LanguageModel {
  return getModel();
}
