import type { SocialProvider } from './types.js';
import {
  getAuthUrl,
  exchangeCode,
  getLongLivedToken,
  refreshToken,
  getProfile,
} from '../instagram/auth.js';
import { InstagramClient } from '../instagram/client.js';
import { postReel } from '../instagram/post.js';

export class InstagramProvider implements SocialProvider {
  readonly name = 'instagram' as const;

  getAuthUrl(params: {
    appId: string;
    redirectUri: string;
    state: string;
  }): string {
    return getAuthUrl(params);
  }

  async exchangeCode(params: {
    code: string;
    appId: string;
    appSecret: string;
    redirectUri: string;
  }): Promise<{
    accessToken: string;
    providerUserId: string;
    username: string;
    expiresIn: number;
  }> {
    const { accessToken, userId: providerUserId } = await exchangeCode(params);
    const longToken = await getLongLivedToken({
      accessToken,
      appSecret: params.appSecret,
    });
    const profile = await getProfile(longToken.accessToken);
    return {
      accessToken: longToken.accessToken,
      providerUserId,
      username: profile.username,
      expiresIn: longToken.expiresIn,
    };
  }

  async refreshToken(
    accessToken: string,
  ): Promise<{ accessToken: string; expiresIn: number } | null> {
    return refreshToken(accessToken);
  }

  async createMedia(
    accessToken: string,
    accountId: string,
    videoUrl: string,
    caption: string,
  ): Promise<{ containerId: string }> {
    const client = new InstagramClient(accessToken);
    const container = await client.post<{ id: string }>(
      `/${accountId}/media`,
      {
        media_type: 'REELS',
        video_url: videoUrl,
        caption,
      },
    );
    return { containerId: container.id };
  }

  async getMediaStatus(
    accessToken: string,
    containerId: string,
  ): Promise<{ status: string; errorMessage?: string }> {
    const client = new InstagramClient(accessToken);
    const status = await client.get<{
      status_code?: string;
      error_message?: string;
    }>(`/${containerId}`, { fields: 'status_code,error_message' });
    return {
      status: status.status_code ?? 'IN_PROGRESS',
      errorMessage: status.error_message,
    };
  }

  async publishMedia(
    accessToken: string,
    accountId: string,
    containerId: string,
  ): Promise<{ id: string; permalink: string }> {
    const client = new InstagramClient(accessToken);
    const published = await client.post<{ id: string }>(
      `/${accountId}/media_publish`,
      { creation_id: containerId },
    );
    const details = await client.get<{ id: string; permalink: string }>(
      `/${published.id}`,
      { fields: 'id,permalink' },
    );
    return {
      id: details.id,
      permalink: details.permalink,
    };
  }

  async getProfile(accessToken: string): Promise<{
    id: string;
    username: string;
    name?: string;
    avatarUrl?: string;
    accountType?: string;
    followersCount?: number;
  }> {
    return getProfile(accessToken);
  }
}
