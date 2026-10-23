import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { tools, type Access, type Ctx } from "./tools.js";

export interface ServerOptions {
  rakutenAppId?: string;
  rakutenAccessKey?: string;
  rakutenReferer?: string;
  yahooAppId?: string;
  shippingBaseJpy?: number;
  shippingPerKgJpy?: number;
  platformFeeRate?: number;
  fetchImpl?: typeof fetch;
}

export function createServer(opts: ServerOptions = {}): McpServer {
  const ctx: Ctx = {
    fetchImpl: opts.fetchImpl ?? fetch,
    rakutenAppId: opts.rakutenAppId, rakutenAccessKey: opts.rakutenAccessKey, rakutenReferer: opts.rakutenReferer, yahooAppId: opts.yahooAppId,
    defaults: { shippingBaseJpy: opts.shippingBaseJpy ?? 700, shippingPerKgJpy: opts.shippingPerKgJpy ?? 1500, platformFeeRate: opts.platformFeeRate ?? 0.06 },
  };
  const server = new McpServer({ name: "kmcp-japan-bridge", version: "0.1.1" });
  for (const t of tools) {
    server.registerTool(
      t.name,
      { description: t.description, inputSchema: t.schema, annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: t.name !== "jp_landed_cost" && t.name !== "jp_listing_draft" } },
      async (args: Record<string, unknown>) => {
        const text = (s: string) => ({ type: "text" as const, text: s });
        try {
          const parsed = z.object(t.schema).parse(args);
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const result = await (t.handler as any)(ctx, parsed);
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
