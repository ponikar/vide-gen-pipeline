import { env } from "@/env";

const AUTH_BASE = "https://www.tiktok.com";
const API_BASE = "https://open.tiktokapis.com/v2";

export type TikTokProfile = {
  openId: string;
  unionId?: string;
  displayName: string;
  avatarUrl?: string;
};

type TokenResponse = {
  access_token: string;
  expires_in: number;
  refresh_token: string;
  refresh_expires_in: number;
  open_id: string;
  token_type: string;
};

export function getAuthUrl(params: {
  redirectUri: string;
  state: string;
}): string {
  const url = new URL(`${AUTH_BASE}/v2/auth/authorize/`);
  url.searchParams.set("client_key", env.TIKTOK_APP_ID!);
  url.searchParams.set("redirect_uri", params.redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set(
    "scope",
    "user.info.basic,video.upload,video.publish",
  );
  url.searchParams.set("state", params.state);
  return url.toString();
}

export async function exchangeCode(params: {
  code: string;
  redirectUri: string;
}): Promise<TokenResponse> {
  const body = new URLSearchParams();
  body.set("client_key", env.TIKTOK_APP_ID!);
  body.set("client_secret", env.TIKTOK_APP_SECRET!);
  body.set("grant_type", "authorization_code");
  body.set("redirect_uri", params.redirectUri);
  body.set("code", params.code);

  const res = await fetch(`${API_BASE}/oauth/token/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "Cache-Control": "no-cache",
    },
    body,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`TikTok token exchange failed: ${text}`);
  }

  const data = (await res.json()) as {
    data?: TokenResponse;
    error?: { code: string; message: string };
  };

  if (data.error) {
    throw new Error(
      `TikTok token exchange error: ${data.error.code} - ${data.error.message}`,
    );
  }

  return data.data!;
}

export async function refreshToken(params: {
  refreshToken: string;
}): Promise<TokenResponse> {
  const body = new URLSearchParams();
  body.set("client_key", env.TIKTOK_APP_ID!);
  body.set("client_secret", env.TIKTOK_APP_SECRET!);
  body.set("grant_type", "refresh_token");
  body.set("refresh_token", params.refreshToken);

  const res = await fetch(`${API_BASE}/oauth/token/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "Cache-Control": "no-cache",
    },
    body,
  });

  if (!res.ok) return null as unknown as TokenResponse;

  const data = (await res.json()) as {
    data?: TokenResponse;
    error?: { code: string; message: string };
  };

  if (data.error || !data.data) return null as unknown as TokenResponse;

  return data.data;
}

export async function getProfile(
  accessToken: string,
): Promise<TikTokProfile> {
  const res = await fetch(`${API_BASE}/user/info/`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Failed to get TikTok profile: ${text}`);
  }

  const data = (await res.json()) as {
    data?: {
      user?: {
        open_id: string;
        union_id?: string;
        display_name: string;
        avatar_url?: string;
      };
    };
    error?: { code: string; message: string };
  };

  if (data.error) {
    throw new Error(
      `TikTok profile error: ${data.error.code} - ${data.error.message}`,
    );
  }

  const user = data.data?.user;
  if (!user) {
    throw new Error("TikTok profile returned no user data");
  }

  return {
    openId: user.open_id,
    unionId: user.union_id,
    displayName: user.display_name,
    avatarUrl: user.avatar_url,
  };
}
