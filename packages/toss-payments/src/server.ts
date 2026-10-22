import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { CONFIRM_ARG, CONFIRM_ARG_DESCRIPTION, createWriteGate, gateFromApprover, takeConfirmToken, type WriteGate } from "@appmonster/approval";
import { TossClient } from "./client.js";
import { tools, type Access } from "./tools.js";

export interface ServerOptions {
  secretKey: string;
  /** If set, write tools are refused unless this returns true (OK Agent hook). */
  approveWrite?: (toolName: string, args: unknown) => Promise<boolean>;
  /** What runs before every write tool (see @appmonster/approval). The CLI passes writeGateFromEnv(); library default: approveWrite if given, else direct. */
  writeGate?: WriteGate;
  fetchImpl?: typeof fetch;
}

export function createServer(opts: ServerOptions): McpServer {
  const client = new TossClient(opts.secretKey, { fetchImpl: opts.fetchImpl });
  const server = new McpServer({ name: "kmcp-toss-payments", version: "0.2.0" });
  const gate: WriteGate = opts.writeGate ?? (opts.approveWrite ? gateFromApprover(opts.approveWrite) : createWriteGate({ mode: "direct" }));
  for (const t of tools) {
    server.registerTool(
      t.name,
      {
        description: t.description + (client.isTest ? " [TEST KEY — sandbox data]" : ""),
        inputSchema: t.access === "write" && gate.mode === "confirm" ? { ...t.schema, [CONFIRM_ARG]: z.string().optional().describe(CONFIRM_ARG_DESCRIPTION) } : t.schema,
        annotations: { readOnlyHint: t.access === "read", destructiveHint: t.access === "write", idempotentHint: t.access === "read", openWorldHint: true },
      },
      async (args: Record<string, unknown>) => {
        const text = (s: string) => ({ type: "text" as const, text: s });
        try {
          let input = args;
          if (t.access === "write") {
            const { args: rest, token } = takeConfirmToken(args);
            input = rest;
            const g = await gate.check(t.name, rest, token);
            if (!g.ok) return { content: [text(g.message)], isError: gate.mode !== "confirm" };
          }
          const parsed = z.object(t.schema).parse(input);
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
