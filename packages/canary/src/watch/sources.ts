/**
 * Change-watch sources: official notice / changelog pages per platform. Each extractor turns the page
 * into a list of entries; new entries vs. the last snapshot are reported. Keep extractors tolerant —
 * a changed page layout should produce an `ok:false` note, never a crash.
 */
import type { WatchEntry } from "../types.js";

export interface WatchSource { platform: string; url: string; kind: "html" | "rss" | "json"; extract(text: string, url: string): WatchEntry[]; }

const strip = (s: string) => s.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
const abs = (href: string, base: string) => { try { return new URL(href, base).href; } catch { return undefined; } };

/** Generic: every <a> whose text looks like a notice title near a date. */
function anchorsWithDates(html: string, base: string, pathHint: RegExp, max = 30): WatchEntry[] {
  const out: WatchEntry[] = [];
  const re = /<a[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) && out.length < max) {
    const href = m[1], title = strip(m[2]);
    if (!pathHint.test(href) || title.length < 6 || title.length > 140) continue;
    const after = html.slice(m.index, m.index + 600);
    const date = (after.match(/20\d{2}[-./]\d{1,2}[-./]\d{1,2}/) ?? [])[0];
    out.push({ title, date, url: abs(href, base) });
  }
  return out;
}

function rss(xml: string): WatchEntry[] {
  const items = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)].slice(0, 30);
  return items.map((i) => ({
    title: strip((i[1].match(/<title>([\s\S]*?)<\/title>/) ?? [])[1] ?? "").replace(/^<!\[CDATA\[|\]\]>$/g, ""),
    date: (i[1].match(/<pubDate>([\s\S]*?)<\/pubDate>/) ?? [])[1]?.trim(),
    url: (i[1].match(/<link>([\s\S]*?)<\/link>/) ?? [])[1]?.trim(),
  }));
}

export const sources: WatchSource[] = [
  { platform: "naver-commerce", url: "https://apicenter.commerce.naver.com/ko/basic/notice", kind: "html", extract: (h, u) => anchorsWithDates(h, u, /notice|board/i) },
  { platform: "cafe24", url: "https://developers.cafe24.com/docs/api/admin/", kind: "html", extract: (h) => { const v = [...h.matchAll(/20\d{2}-\d{2}-\d{2}/g)].map((m) => m[0]); const latest = [...new Set(v)].sort().pop(); return latest ? [{ title: `Admin API latest version ${latest}`, date: latest }] : []; } },
  { platform: "coupang", url: "https://developers.coupangcorp.com/hc/ko/sections/360001148053", kind: "html", extract: (h, u) => anchorsWithDates(h, u, /articles/) },
  { platform: "toss-payments", url: "https://docs.tosspayments.com/reference/changelog", kind: "html", extract: (h, u) => anchorsWithDates(h, u, /changelog|reference/) },
  { platform: "kakao", url: "https://devtalk.kakao.com/c/notice/15.rss", kind: "rss", extract: rss },
  { platform: "popbill", url: "https://registry.npmjs.org/popbill/latest", kind: "json", extract: (t) => { const j = JSON.parse(t); return [{ title: `popbill SDK ${j.version}`, date: undefined, url: "https://www.npmjs.com/package/popbill" }]; } },
  { platform: "public-data", url: "https://www.data.go.kr/data/15081808/openapi.do", kind: "html", extract: (h) => { const d = (h.match(/수정일[\s\S]{0,80}?(20\d{2}-\d{2}-\d{2})/) ?? [])[1]; return d ? [{ title: `국세청 사업자등록정보 진위확인 API 수정일 ${d}`, date: d }] : []; } },
  { platform: "japan-bridge", url: "https://webservice.rakuten.co.jp/information/", kind: "html", extract: (h, u) => anchorsWithDates(h, u, /information|news/) },
  { platform: "mcp-sdk", url: "https://registry.npmjs.org/@modelcontextprotocol%2fsdk/latest", kind: "json", extract: (t) => [{ title: `@modelcontextprotocol/sdk ${JSON.parse(t).version}`, url: "https://github.com/modelcontextprotocol/typescript-sdk/releases" }] },
];
