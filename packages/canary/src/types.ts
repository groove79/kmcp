import type { z } from "zod";

export type DriftClass = "OK" | "DRIFT" | "BREAK" | "AUTH" | "DOWN" | "SKIP";
export type Access = "read" | "write-sandbox" | "pure";

/** What a check gets: a fetch (real → recording, or replaying) and the resolved secrets. */
export interface Ctx {
  fetchImpl: typeof fetch;
  env: Record<string, string | undefined>;
  /** rotating-token store shared with the servers' TokenStore interfaces */
  tokens: TokenBag;
  mode: "live" | "replay";
  today: string; // yyyy-MM-dd KST
}

export interface TokenBag {
  get(name: string): Promise<string | null>;
  set(name: string, value: string): Promise<void>;
}

export interface Check {
  id: string;
  platform: string;
  access: Access;
  /** env names that must be present, else SKIP (with signup hint) */
  needs: string[];
  signup?: string;
  expect: z.ZodTypeAny;
  timeoutMs?: number;
  run(ctx: Ctx): Promise<unknown>;
  /** for write-sandbox: undo whatever run did (best effort, errors reported as DRIFT note) */
  revert?(ctx: Ctx, out: unknown): Promise<void>;
}

export interface CheckResult {
  id: string;
  platform: string;
  access: Access;
  class: DriftClass;
  ms: number;
  note: string | null;
  shapeDiff?: ShapeDiff | null;
}

export interface ShapeDiff {
  removed: string[];
  added: string[];
  typeChanged: Array<{ path: string; from: string; to: string }>;
}

export interface WatchEntry { title: string; date?: string; url?: string }
export interface WatchResult { platform: string; source: string; ok: boolean; new: WatchEntry[]; note?: string }

export interface StatusReport {
  ranAt: string;
  mode: "live" | "replay";
  summary: Record<DriftClass, number>;
  checks: CheckResult[];
  watch: WatchResult[];
}
