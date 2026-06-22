import type { InstagramProfile } from "./types";
import { env } from "@/env";

const AUTH_BASE = "https://www.instagram.com";
const API_BASE = "https://api.instagram.com";
const GRAPH_BASE = "https://graph.instagram.com";

export function getAuthUrl(params: {
  redirectUri: string;
  state: string;
}): string {
  const url = new URL(`${AUTH_BASE}/oauth/authorize`);
  url.searchParams.set("client_id", env.INSTAGRAM_APP_ID!);
  url.searchParams.set("redirect_uri", params.redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set(
    "scope",
    "instagram_business_basic,instagram_business_content_publish,instagram_business_manage_insights",
  );
  url.searchParams.set("state", params.state);
  url.searchParams.set("force_reauth", "true");
  return url.toString();
}

export async function exchangeCode(params: {
  code: string;
  redirectUri: string;
}): Promise<{ accessToken: string; userId: string }> {
  const body = new URLSearchParams();
  body.set("client_id", env.INSTAGRAM_APP_ID!);
  body.set("client_secret", env.INSTAGRAM_APP_SECRET!);
  body.set("grant_type", "authorization_code");
  body.set("redirect_uri", params.redirectUri);
  body.set("code", params.code);

  const res = await fetch(`${API_BASE}/oauth/access_token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Token exchange failed: ${text}`);
  }

  const data = (await res.json()) as Record<string, unknown>;
  return {
    accessToken: data.access_token as string,
    userId: String(data.user_id ?? ""),
  };
}

export async function getLongLivedToken(params: {
  accessToken: string;
}): Promise<{ accessToken: string; expiresIn: number }> {
  const url = new URL(`${GRAPH_BASE}/access_token`);
  url.searchParams.set("grant_type", "ig_exchange_token");
  url.searchParams.set("client_secret", env.INSTAGRAM_APP_SECRET!);
  url.searchParams.set("access_token", params.accessToken);

  const res = await fetch(url.toString());
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Long-lived token exchange failed: ${text}`);
  }

  const data = (await res.json()) as Record<string, unknown>;
  return {
    accessToken: data.access_token as string,
    expiresIn: Number(data.expires_in ?? 0),
  };
}

export async function getProfile(
  accessToken: string,
): Promise<InstagramProfile> {
  const url = new URL(`${GRAPH_BASE}/me`);
  url.searchParams.set(
    "fields",
    "id,username,name,profile_picture_url,account_type,followers_count,media_count",
  );
  url.searchParams.set("access_token", accessToken);

  const res = await fetch(url.toString());
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Failed to get profile: ${text}`);
  }

  const data = (await res.json()) as Record<string, unknown>;
  return {
    id: String(data.id ?? ""),
    username: String(data.username ?? ""),
    name: data.name as string | undefined,
    profilePictureUrl: data.profile_picture_url as string | undefined,
    accountType: String(data.account_type ?? ""),
    followersCount: Number(data.followers_count ?? 0),
    mediaCount: Number(data.media_count ?? 0),
  };
}
