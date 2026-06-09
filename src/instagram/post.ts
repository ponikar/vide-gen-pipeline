import { InstagramClient } from './client.js';
import type { PostResult, MediaContainer, MediaStatus } from './types.js';

const POLL_RETRIES = 30;
const POLL_INTERVAL_MS = 5000;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function postReel(
  client: InstagramClient,
  accountId: string,
  videoUrl: string,
  caption: string,
): Promise<PostResult> {
  const container = await client.post<{ id: string }>(`/${accountId}/media`, {
    media_type: 'REELS',
    video_url: videoUrl,
    caption,
  });

  const containerId = container.id;

  for (let attempt = 0; attempt < POLL_RETRIES; attempt++) {
    const status = await client.get<MediaContainer>(`/${containerId}`, {
      fields: 'status_code,error_message',
    });

    const code: MediaStatus = status.status_code ?? 'IN_PROGRESS';

    if (code === 'FINISHED') break;
    if (code === 'ERROR') {
      throw new Error(`Container processing failed: ${status.error_message ?? 'Unknown error'}`);
    }
    if (code === 'EXPIRED') {
      throw new Error('Container expired before publishing');
    }

    await sleep(POLL_INTERVAL_MS);
  }

  const published = await client.post<{ id: string }>(`/${accountId}/media_publish`, {
    creation_id: containerId,
  });

  const details = await client.get<{ id: string; permalink: string }>(`/${published.id}`, {
    fields: 'id,permalink',
  });

  return {
    igMediaId: details.id,
    permalink: details.permalink,
  };
}
