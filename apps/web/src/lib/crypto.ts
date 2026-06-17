function base64url(bytes: Uint8Array): string {
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export async function sha256(data: string): Promise<string> {
  const hash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(data));
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function generateApiKey(): Promise<{
  value: string;
  prefix: string;
  hash: string;
}> {
  const bytes = crypto.getRandomValues(new Uint8Array(36));
  const value = "gf_" + base64url(bytes);
  const prefix = value.slice(0, 12);
  const hash = await sha256(value);
  return { value, prefix, hash };
}
