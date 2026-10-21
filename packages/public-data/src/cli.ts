#!/usr/bin/env node
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createServer } from "./server.js";

const dataGoKr = process.env.DATA_GO_KR_KEY?.trim();
const juso = process.env.JUSO_KEY?.trim();
if (!dataGoKr && !juso) {
  console.error(
    "No keys set. Set DATA_GO_KR_KEY (https://www.data.go.kr — 사업자 상태조회·특일정보·아파트 실거래가 활용신청) and/or JUSO_KEY (https://business.juso.go.kr).\n" +
      "Tools whose key is missing will explain what to request when called.",
  );
}
const server = createServer({ dataGoKr, juso });
await server.connect(new StdioServerTransport());
