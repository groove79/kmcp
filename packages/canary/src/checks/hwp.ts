import { z } from "zod";
import fs from "node:fs";
import path from "node:path";
import { convert } from "@appmonster/mcp-hwp";
import type { Check } from "../types.js";

/** Parses a real 한글 file when one is provided (CANARY_HWP_FILE, e.g. a 솔라테크 공문 on the Mac); the parser's unit tests cover synthetic files. */
export const checks: Check[] = [
  {
    id: "hwp.convertRealFile", platform: "hwp", access: "pure", needs: ["CANARY_HWP_FILE"], signup: "set CANARY_HWP_FILE=/path/to/any.hwp",
    expect: z.object({ markdown: z.string().min(1) }).passthrough(),
    run: async (ctx) => convert(fs.readFileSync(path.resolve(ctx.env.CANARY_HWP_FILE!))),
  },
];
