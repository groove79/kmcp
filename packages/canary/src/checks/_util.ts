import { z } from "zod";

/** Call a K-MCP tool exactly like the server does: parse args with the tool's zod schema, then run the handler. */
export async function callTool<C>(tool: { name: string; schema: z.ZodRawShape; handler: (c: C, a: never) => Promise<unknown> }, client: C, args: Record<string, unknown>): Promise<unknown> {
  const parsed = z.object(tool.schema).parse(args);
  return tool.handler(client, parsed as never);
}
export function byName<T extends { name: string }>(tools: readonly T[], name: string): T {
  const t = tools.find((x) => x.name === name);
  if (!t) throw new Error(`tool ${name} not found`);
  return t;
}
export const kstToday = () => new Date(Date.now() + 9 * 3600_000).toISOString().slice(0, 10);
export const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
