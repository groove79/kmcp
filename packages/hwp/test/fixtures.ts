/** Build small but structurally faithful HWP5 and HWPX files in memory for tests. */
import CFB from "cfb";
import { deflateRawSync } from "node:zlib";
import { zipSync, strToU8 } from "fflate";

const TAG_BEGIN = 0x10;
const rec = (tag: number, level: number, data: Buffer) => {
  const h = Buffer.alloc(4);
  h.writeUInt32LE((tag & 0x3ff) | ((level & 0x3ff) << 10) | ((data.length & 0xfff) << 20), 0);
  return Buffer.concat([h, data]);
};
const u16 = (n: number) => { const b = Buffer.alloc(2); b.writeUInt16LE(n); return b; };
const u32 = (n: number) => { const b = Buffer.alloc(4); b.writeUInt32LE(n); return b; };
const wstr = (s: string) => Buffer.concat([u16(s.length), Buffer.from(s, "utf16le")]);

function paraHeader(level: number, styleId: number, nChars: number) {
  // nChars u32, controlMask u32, paraShapeId u16, styleId u8, columnType u8, ... (we only need styleId at offset 10)
  return rec(TAG_BEGIN + 50, level, Buffer.concat([u32(nChars), u32(0), u16(0), Buffer.from([styleId, 0]), u16(0), u16(0), u32(0), u32(0)]));
}
const paraText = (level: number, text: string, extra: Buffer = Buffer.alloc(0)) => rec(TAG_BEGIN + 51, level, Buffer.concat([Buffer.from(text, "utf16le"), extra]));
/** inline control char 11 ("tbl ") = 8 WCHARs: code, 4 bytes id (reversed), 2 bytes, code again */
const tblCtrl = () => Buffer.concat([u16(11), Buffer.from(" lbt", "latin1"), Buffer.alloc(8), u16(11)]);

export function buildHwp5(): Buffer {
  const header = Buffer.alloc(256);
  header.write("HWP Document File", 0, "latin1");
  header.writeUInt32LE(0x05000300, 32); // 5.0.3.0
  header.writeUInt32LE(1, 36); // compressed

  // DocInfo: three STYLE records → ids 0 "바탕글", 1 "개요 1", 2 "개요 2"
  const style = (name: string) => rec(TAG_BEGIN + 19, 0, Buffer.concat([wstr(name), wstr(name), Buffer.alloc(10)]));
  const docInfo = Buffer.concat([style("바탕글"), style("개요 1"), style("개요 2")]);

  const cell = (col: number, row: number, text: string) => Buffer.concat([
    rec(TAG_BEGIN + 56, 2, Buffer.concat([u16(1), u32(0), u16(0), u16(col), u16(row), u16(1), u16(1), u32(100), u32(50), Buffer.alloc(10)])),
    paraHeader(2, 0, text.length), paraText(3, text),
  ]);
  const section = Buffer.concat([
    paraHeader(0, 1, 5), paraText(1, "입찰 공고"),
    paraHeader(0, 0, 10), paraText(1, "영마루공원 일원 표지병 설치 사업"),
    paraHeader(0, 2, 4), paraText(1, "물품 내역"),
    // paragraph that hosts the table
    paraHeader(0, 0, 8), paraText(1, "", tblCtrl()),
    rec(TAG_BEGIN + 55, 1, Buffer.from(" lbt", "latin1")),
    rec(TAG_BEGIN + 61, 2, Buffer.concat([u32(0), u16(2), u16(2), Buffer.alloc(20)])),
    cell(0, 0, "품명"), cell(1, 0, "수량"), cell(0, 1, "태양광 표지병"), cell(1, 1, "120"),
    paraHeader(0, 0, 6), paraText(1, "끝."),
  ]);

  let cfb = CFB.utils.cfb_new();
  CFB.utils.cfb_add(cfb, "/FileHeader", header);
  CFB.utils.cfb_add(cfb, "/DocInfo", deflateRawSync(docInfo));
  CFB.utils.cfb_add(cfb, "/BodyText/Section0", deflateRawSync(section));
  return Buffer.from(CFB.write(cfb, { type: "buffer" }) as Buffer);
}

export function buildHwpx(): Buffer {
  const header = `<?xml version="1.0" encoding="UTF-8"?><hh:head xmlns:hh="http://www.hancom.co.kr/hwpml/2011/head"><hh:refList><hh:styles><hh:style id="0" name="바탕글" engName="Normal"/><hh:style id="1" name="개요 1" engName="Outline 1"/></hh:styles></hh:refList></hh:head>`;
  const section = `<?xml version="1.0" encoding="UTF-8"?><hs:sec xmlns:hs="http://www.hancom.co.kr/hwpml/2011/section" xmlns:hp="http://www.hancom.co.kr/hwpml/2011/paragraph">
<hp:p styleIDRef="1"><hp:run><hp:t>관리비 안내</hp:t></hp:run></hp:p>
<hp:p styleIDRef="0"><hp:run><hp:t>2026년 9월분 관리비를 안내드립니다.</hp:t></hp:run></hp:p>
<hp:p styleIDRef="0"><hp:run><hp:tbl rowCnt="2" colCnt="2">
<hp:tr><hp:tc><hp:cellAddr colAddr="0" rowAddr="0"/><hp:cellSpan colSpan="1" rowSpan="1"/><hp:subList><hp:p><hp:run><hp:t>항목</hp:t></hp:run></hp:p></hp:subList></hp:tc><hp:tc><hp:cellAddr colAddr="1" rowAddr="0"/><hp:subList><hp:p><hp:run><hp:t>금액</hp:t></hp:run></hp:p></hp:subList></hp:tc></hp:tr>
<hp:tr><hp:tc><hp:cellAddr colAddr="0" rowAddr="1"/><hp:subList><hp:p><hp:run><hp:t>장기수선충당금</hp:t></hp:run></hp:p></hp:subList></hp:tc><hp:tc><hp:cellAddr colAddr="1" rowAddr="1"/><hp:subList><hp:p><hp:run><hp:t>12,000</hp:t></hp:run></hp:p></hp:subList></hp:tc></hp:tr>
</hp:tbl></hp:run></hp:p>
<hp:p styleIDRef="0"><hp:run><hp:t>문의: 관리사무소</hp:t><hp:tab/><hp:t>032-000-0000</hp:t></hp:run></hp:p>
</hs:sec>`;
  const hpf = `<?xml version="1.0"?><opf:package xmlns:opf="http://www.idpf.org/2007/opf/" xmlns:dc="http://purl.org/dc/elements/1.1/"><opf:metadata><dc:title>관리비 안내문</dc:title><dc:creator>효성메트하임 관리사무소</dc:creator></opf:metadata></opf:package>`;
  return Buffer.from(zipSync({ "mimetype": strToU8("application/hwp+zip"), "Contents/header.xml": strToU8(header), "Contents/section0.xml": strToU8(section), "Contents/content.hpf": strToU8(hpf) }));
}
