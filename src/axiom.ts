import { Axiom } from "@axiomhq/js";

const DATASET_ENV: Record<string, string> = {
  "video-server": "AXIOM_VIDEO_SERVER_DATA_SET",
  "agent-worker": "AXIOM_AGENT_WORKER_DATA_SET",
};

let client: Axiom | null = null;

function getClient(): Axiom | null {
  if (client) return client;
  const token = process.env.AXIOM_TOKEN;
  if (!token) return null;
  client = new Axiom({
    token,
    edge: process.env.AXIOM_EDGE,
    onError: (err) => console.error("[axiom]", err),
  });
  return client;
}

function resolveDataset(service: string): string {
  const envKey = DATASET_ENV[service];
  return process.env[envKey] || service;
}

export function ingestAxiom(service: string, entry: Record<string, unknown>): void {
  const c = getClient();
  if (!c) return;
  c.ingest(resolveDataset(service), [entry]);
}

export async function flushAxiom(): Promise<void> {
  if (!client) return;
  await client.flush();
}
