import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { CoupangClient, type Credentials } from "./client.js";
import { tools, type Access } from "./tools.js";

export interface ServerOptions extends Credentials {
  /** If set, write tools are refused unless this returns true (OK Agent hook). */
  approveWrite?: (toolName: string, args: unknown) => Promise<boolean>;
  fetchImpl?: typeof fetch;
}

export function createServer(opts: ServerOptions): McpServer {
  const client = new CoupangClient({ accessKey: opts.accessKey, secretKey: opts.secretKey, vendorId: opts.vendorId }, { fetchImpl: opts.fetchImpl });
  const server = new McpServer({ name: "kmcp-coupang", version: "0.1.0" });
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
          if (t.access === "write" && opts.approveWrite) {
            const ok = await opts.approveWrite(t.name, args);
            if (!ok) return { content: [text(`Refused: ${t.name} was not approved.`)], isError: true };
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
