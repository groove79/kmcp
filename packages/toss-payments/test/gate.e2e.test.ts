import { test } from "node:test";
import assert from "node:assert/strict";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { createWriteGate } from "@appmonster/approval";
import { createServer } from "../src/server.js";

async function connect(mode: "confirm" | "direct") {
  let cancels = 0;
  const fetchImpl = (async (u: string | URL) => {
    if (String(u).endsWith("/cancel")) cancels++;
    return Response.json({ paymentKey: "pk1", orderId: "o1", status: "CANCELED", totalAmount: 15000, balanceAmount: 0, cancels: [] });
  }) as unknown as typeof fetch;
  const server = createServer({ secretKey: "test_sk_x", fetchImpl, writeGate: createWriteGate({ mode }) });
  const [a, b] = InMemoryTransport.createLinkedPair();
  const client = new Client({ name: "t", version: "0" });
  await Promise.all([server.connect(a), client.connect(b)]);
  return { client, cancels: () => cancels };
}

const textOf = (r: unknown) => ((r as { content: Array<{ text: string }> }).content[0].text);

test("confirm mode over MCP: preview first, runs only with the token, read tools untouched", async () => {
  const { client, cancels } = await connect("confirm");
  const list = await client.listTools();
  const cancel = list.tools.find((t) => t.name === "toss_cancel_payment")!;
  assert.ok((cancel.inputSchema.properties as Record<string, unknown>).confirm_token, "write tool advertises confirm_token");
  assert.ok(!(list.tools.find((t) => t.name === "toss_get_payment")!.inputSchema.properties as Record<string, unknown>).confirm_token);

  const args = { paymentKey: "pk1", cancelReason: "고객 요청" };
  const first = await client.callTool({ name: "toss_cancel_payment", arguments: args });
  assert.equal(first.isError, false);
  assert.match(textOf(first), /아직 실행하지 않았습니다/);
  assert.equal(cancels(), 0, "nothing executed on the first call");
  const token = textOf(first).match(/confirm_token: "([a-z0-9]+)"/)![1];

  const second = await client.callTool({ name: "toss_cancel_payment", arguments: { ...args, confirm_token: token } });
  assert.ok(!second.isError, textOf(second));
  assert.equal(cancels(), 1);
});

test("direct mode: no confirm_token in schema, runs at once", async () => {
  const { client, cancels } = await connect("direct");
  const cancel = (await client.listTools()).tools.find((t) => t.name === "toss_cancel_payment")!;
  assert.ok(!(cancel.inputSchema.properties as Record<string, unknown>).confirm_token);
  await client.callTool({ name: "toss_cancel_payment", arguments: { paymentKey: "pk1", cancelReason: "x" } });
  assert.equal(cancels(), 1);
});
