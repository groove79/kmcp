import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { tools, type Access, type Ctx } from "./tools.js";

export function createServer(opts: { fetchImpl?: typeof fetch } = {}): McpServer {
  const server = new McpServer({ name: "kmcp-landed-cost", version: "0.1.0" });
  const ctx: Ctx = { fetchImpl: opts.fetchImpl ?? fetch };
  for (const t of tools) {
    server.registerTool(t.name, { description: t.description, inputSchema: t.schema, annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true } },
      async (args: Record<string, unknown>) => {
        try {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const r = await (t.handler as any)(ctx, z.object(t.schema).parse(args));
          return { content: [{ type: "text" as const, text: JSON.stringify(r, null, 2) }] };
        } catch (e) {
          return { content: [{ type: "text" as const, text: e instanceof Error ? e.message : String(e) }], isError: true };
        }
      });
  }
  return server;
}
export const toolAccess: Record<string, Access> = Object.fromEntries(tools.map((t) => [t.name, t.access]));
