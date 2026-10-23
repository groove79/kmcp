import fs from "node:fs";
import path from "node:path";

export interface Source { path?: string; url?: string; base64?: string }
const MAX_DOWNLOAD = 50 * 1024 * 1024;

export async function loadSource(src: Source, fetchImpl: typeof fetch = fetch): Promise<{ buf: Buffer; name: string }> {
  const n = [src.path, src.url, src.base64].filter(Boolean).length;
  if (n !== 1) throw new Error("Provide exactly one of path, url, base64.");
  if (src.path) {
    const p = path.resolve(src.path.replace(/^~(?=$|\/)/, process.env.HOME ?? "~"));
    if (!fs.existsSync(p)) throw new Error(`File not found: ${p}`);
    return { buf: fs.readFileSync(p), name: path.basename(p) };
  }
  if (src.url) {
    const u = new URL(src.url);
    if (!/^https?:$/.test(u.protocol)) throw new Error("Only http(s) URLs are supported.");
    const res = await fetchImpl(u, { signal: AbortSignal.timeout(30_000), headers: { "User-Agent": "mcp-ofd/0.1 (+https://github.com/groove79/kmcp)" } });
    if (!res.ok) throw new Error(`Download failed: HTTP ${res.status}`);
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length > MAX_DOWNLOAD) throw new Error("File too large (max 50MB).");
    return { buf, name: path.basename(u.pathname) || "document.ofd" };
  }
  return { buf: Buffer.from(src.base64!, "base64"), name: "document.ofd" };
}
