import type { InstagramProfile } from './types.js';

const API_VERSION = 'v22.0';
const FB_BASE = `https://graph.facebook.com/${API_VERSION}`;

export function getAuthUrl(params: {
  appId: string;
  redirectUri: string;
  state: string;
}): string {
  const url = new URL(`https://www.facebook.com/${API_VERSION}/dialog/oauth`);
  url.searchParams.set('client_id', params.appId);
  url.searchParams.set('redirect_uri', params.redirectUri);
  url.searchParams.set('state', params.state);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set(
    'scope',
    'instagram_business_basic,instagram_business_content_publish',
  );
  return url.toString();
}

export async function exchangeCode(params: {
  code: string;
  appId: string;
  appSecret: string;
  redirectUri: string;
}): Promise<{ accessToken: string; userId: string }> {
  const url = new URL(`${FB_BASE}/oauth/access_token`);
  url.searchParams.set('client_id', params.appId);
  url.searchParams.set('client_secret', params.appSecret);
  url.searchParams.set('redirect_uri', params.redirectUri);
  url.searchParams.set('code', params.code);

  const res = await fetch(url.toString());
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Token exchange failed: ${text}`);
  }

  const data = (await res.json()) as Record<string, unknown>;
  return {
    accessToken: data.access_token as string,
    userId: String(data.user_id ?? ''),
  };
}

export async function getLongLivedToken(params: {
  accessToken: string;
  appId: string;
  appSecret: string;
}): Promise<{ accessToken: string; expiresIn: number }> {
  const url = new URL(`${FB_BASE}/oauth/access_token`);
  url.searchParams.set('grant_type', 'fb_exchange_token');
  url.searchParams.set('client_id', params.appId);
  url.searchParams.set('client_secret', params.appSecret);
  url.searchParams.set('fb_exchange_token', params.accessToken);

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

export async function refreshToken(
  accessToken: string,
): Promise<{ accessToken: string; expiresIn: number } | null> {
  return null;
}

export async function getInstagramBusinessAccount(params: {
  accessToken: string;
}): Promise<{ id: string; username: string }> {
  const url = new URL(`${FB_BASE}/me/instagram_business_account`);
  url.searchParams.set('access_token', params.accessToken);
  url.searchParams.set('fields', 'id,username');

  const res = await fetch(url.toString());
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Failed to get Instagram business account: ${text}`);
  }

  const data = (await res.json()) as { id: string; username: string };
  return data;
}

export async function getProfile(
  accessToken: string,
): Promise<InstagramProfile> {
  const ia = await getInstagramBusinessAccount({ accessToken });

  const url = new URL(`${FB_BASE}/${ia.id}`);
  url.searchParams.set('access_token', accessToken);
  url.searchParams.set(
    'fields',
    'id,username,name,profile_picture_url,account_type,followers_count,media_count',
  );

  const res = await fetch(url.toString());
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Failed to get profile: ${text}`);
  }

  const data = (await res.json()) as Record<string, unknown>;
  return {
    id: String(data.id ?? ''),
    username: String(data.username ?? ''),
    name: data.name as string | undefined,
    profilePictureUrl: data.profile_picture_url as string | undefined,
    accountType: String(data.account_type ?? ''),
    followersCount: Number(data.followers_count ?? 0),
    mediaCount: Number(data.media_count ?? 0),
  };
}
