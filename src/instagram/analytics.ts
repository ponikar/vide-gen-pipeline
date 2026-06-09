import { InstagramClient } from './client.js';
import type { Insight, RecentMedia } from './types.js';

export async function getMediaInsights(
  client: InstagramClient,
  mediaId: string,
  metrics: string[] = ['reach', 'views', 'saved', 'shares', 'comments', 'likes'],
): Promise<Insight[]> {
  const data = await client.get<{
    data: Array<{ name: string; values: Array<{ value: number }> }>;
  }>(`/${mediaId}/insights`, { metric: metrics.join(',') });

  return data.data.map((item) => ({
    metric: item.name,
    value: item.values[0]?.value ?? 0,
  }));
}

export async function getAccountInsights(
  client: InstagramClient,
  accountId: string,
  since?: string,
  until?: string,
): Promise<Insight[]> {
  const params: Record<string, string> = {
    metric: 'reach,views,profile_visits,follows',
    period: 'day',
  };
  if (since) params.since = since;
  if (until) params.until = until;

  const data = await client.get<{
    data: Array<{ name: string; values: Array<{ value: number }> }>;
  }>(`/${accountId}/insights`, params);

  return data.data.map((item) => ({
    metric: item.name,
    value: item.values.reduce((sum, v) => sum + v.value, 0),
  }));
}

export async function getRecentMedia(
  client: InstagramClient,
  accountId: string,
  limit: number = 5,
): Promise<RecentMedia[]> {
  const data = await client.get<{ data: Array<Record<string, unknown>> }>(
    `/${accountId}/media`,
    {
      fields: 'id,permalink,media_type,timestamp,caption',
      limit: String(limit),
    },
  );

  return data.data.map((item) => ({
    id: String(item.id ?? ''),
    permalink: String(item.permalink ?? ''),
    mediaType: String(item.media_type ?? ''),
    timestamp: String(item.timestamp ?? ''),
    caption: item.caption as string | undefined,
  }));
}
