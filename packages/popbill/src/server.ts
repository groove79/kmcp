import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { sdkServices, type Credentials, type Services } from "./client.js";
import { tools, type Access } from "./tools.js";

export interface ServerOptions extends Partial<Credentials> {
  /** Inject a Services implementation (tests). When absent, the popbill SDK is loaded lazily on first call. */
  services?: Services;
  approveWrite?: (toolName: string, args: unknown) => Promise<boolean>;
}

export function createServer(opts: ServerOptions): McpServer {
  let servicesPromise: Promise<Services> | null = opts.services ? Promise.resolve(opts.services) : null;
  const services = () => {
    if (!servicesPromise) {
      const { linkId, secretKey, corpNum } = opts;
      if (!linkId || !secretKey || !corpNum) throw new Error("Popbill credentials missing (linkId, secretKey, corpNum).");
      servicesPromise = sdkServices({ linkId, secretKey, corpNum, userId: opts.userId, isTest: opts.isTest ?? true, ipRestrict: opts.ipRestrict });
    }
    return servicesPromise;
  };
  const server = new McpServer({ name: "kmcp-popbill", version: "0.1.0" });
  const testTag = opts.isTest === false ? "" : " [TEST SERVER — nothing reaches the NTS or real phones]";
  for (const t of tools) {
    server.registerTool(
      t.name,
      {
        description: t.description + testTag,
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
          const result = await (t.handler as any)(await services(), parsed);
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
