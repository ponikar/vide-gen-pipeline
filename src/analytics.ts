const BASE_URL = process.env.VERCEL_API_URL ?? 'http://localhost:3000';

async function main(): Promise<void> {
  const provider = process.argv[2] ?? 'instagram';

  const data = await fetch(
    `${BASE_URL}/api/content/analytics?provider=${provider}`,
  ).then((r) => {
    if (!r.ok) throw new Error(`Failed: ${r.status}`);
    return r.json() as Promise<{
      username: string;
      insights: Array<{ metric: string; value: number }>;
      recentMedia: Array<{
        id: string;
        permalink: string;
        mediaType: string;
        timestamp: string;
        caption?: string;
      }>;
    }>;
  });

  if (data.insights.length > 0) {
    console.log(`@${data.username} — Last 7 days:\n`);
    for (const insight of data.insights) {
      console.log(`  ${insight.metric}: ${insight.value}`);
    }
  }

  if (data.recentMedia.length === 0) {
    console.log('\nNo recent posts.');
    return;
  }

  console.log('\n---\nRecent posts:\n');
  for (const media of data.recentMedia) {
    console.log(`  ${media.mediaType} | ${media.permalink}`);
    console.log(`  ${media.timestamp}`);
    if (media.caption) {
      const preview =
        media.caption.length > 60
          ? media.caption.slice(0, 60) + '...'
          : media.caption;
      console.log(`  "${preview}"`);
    }
    console.log('');
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
