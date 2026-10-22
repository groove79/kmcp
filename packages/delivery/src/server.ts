import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { DeliveryClient } from "./client.js";
import { tools, type Access } from "./tools.js";

export interface ServerOptions {
  clientId: string;
  clientSecret: string;
  fetchImpl?: typeof fetch;
}

export function createServer(opts: ServerOptions): McpServer {
  const client = new DeliveryClient(opts.clientId, opts.clientSecret, { fetchImpl: opts.fetchImpl });
  const server = new McpServer({ name: "kmcp-delivery", version: "0.1.0" });
  for (const t of tools) {
    server.registerTool(
      t.name,
      { description: t.description, inputSchema: t.schema, annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true } },
      async (args: Record<string, unknown>) => {
        const text = (s: string) => ({ type: "text" as const, text: s });
        try {
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
