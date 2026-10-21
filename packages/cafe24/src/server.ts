import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { Cafe24Auth, FileTokenStore, MemoryTokenStore, type TokenStore } from "./auth.js";
import { Cafe24Client } from "./client.js";
import { tools, type Access } from "./tools.js";

export interface ServerOptions {
  mallId: string;
  clientId: string;
  clientSecret: string;
  /** Seed a refresh token (e.g. from env) when no stored token exists. */
  refreshToken?: string;
  store?: TokenStore;
  apiVersion?: string;
  shopNo?: number;
  approveWrite?: (toolName: string, args: unknown) => Promise<boolean>;
  fetchImpl?: typeof fetch;
}

export function createServer(opts: ServerOptions): McpServer {
  const store = opts.store ?? new FileTokenStore(FileTokenStore.defaultPath(opts.mallId));
  const seeded: TokenStore = opts.refreshToken
    ? { load: async () => (await store.load()) ?? { access_token: "", refresh_token: opts.refreshToken!, expires_at: 0, refresh_expires_at: Date.now() + 14 * 86400_000 }, save: (t) => store.save(t) }
    : store;
  const auth = new Cafe24Auth({ mallId: opts.mallId, clientId: opts.clientId, clientSecret: opts.clientSecret, store: seeded, fetchImpl: opts.fetchImpl });
  const client = new Cafe24Client(auth, { fetchImpl: opts.fetchImpl, apiVersion: opts.apiVersion, shopNo: opts.shopNo });

  const server = new McpServer({ name: "kmcp-cafe24", version: "0.1.0" });
  for (const t of tools) {
    server.registerTool(
      t.name,
      {
        description: t.description,
        inputSchema: t.schema,
        annotations: { readOnlyHint: t.access === "read", destructiveHint: t.access === "write", idempotentHint: t.access === "read", openWorldHint: true },
      },
      async (args: Record<string, unknown>) => {
        const text = (s: string) => ({ type: "text" as const, text: s });
        try {
          if (t.access === "write" && opts.approveWrite && !(await opts.approveWrite(t.name, args))) {
            return { content: [text(`Refused: ${t.name} was not approved.`)], isError: true };
          }
          const parsed = z.object(t.schema).parse(args);
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const result = await (t.handler as any)(client, parsed);
          return { content: [text(JSON.stringify(result, null, 2))] };
        } catch (err) {
          return { content: [text(err instanceof Error ? err.message : String(err))], isError: true };
        }
      },
    );
  }
  return server;
}

export const toolAccess: Record<string, Access> = Object.fromEntries(tools.map((t) => [t.name, t.access]));
export { MemoryTokenStore };
