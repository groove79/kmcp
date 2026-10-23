/** Revised Romanization of Korean (국어의 로마자 표기법) — syllable-level with basic liaison; good for building names, not for people's names. */
const CHO = ["g", "kk", "n", "d", "tt", "r", "m", "b", "pp", "s", "ss", "", "j", "jj", "ch", "k", "t", "p", "h"];
const JUNG = ["a", "ae", "ya", "yae", "eo", "e", "yeo", "ye", "o", "wa", "wae", "oe", "yo", "u", "wo", "we", "wi", "yu", "eu", "ui", "i"];
// final consonants as pronounced at a word end (7 representative sounds)
const JONG = ["", "k", "k", "k", "n", "n", "n", "t", "l", "k", "m", "l", "l", "l", "p", "l", "m", "p", "p", "t", "t", "ng", "t", "t", "k", "t", "p", "t"];
// final consonant moved to the next syllable when that starts with ㅇ (liaison)
const LIAISON: Record<number, string> = { 1: "g", 2: "kk", 4: "n", 7: "d", 8: "r", 16: "m", 17: "b", 19: "s", 20: "ss", 22: "j", 23: "ch", 24: "k", 25: "t", 26: "p" };

export function romanize(text: string): string {
  const out: string[] = [];
  const chars = [...text];
  for (let i = 0; i < chars.length; i++) {
    const code = chars[i].codePointAt(0)! - 0xac00;
    if (code < 0 || code > 11171) { out.push(chars[i]); continue; }
    const cho = Math.floor(code / 588), jung = Math.floor((code % 588) / 28), jong = code % 28;
    let initial = CHO[cho];
    const prev = i > 0 ? chars[i - 1].codePointAt(0)! - 0xac00 : -1;
    if (prev >= 0 && prev <= 11171) {
      const pj = prev % 28;
      if (cho === 11 && LIAISON[pj]) initial = ""; // already carried over
      else if (cho === 5 && (pj === 8 || pj === 4)) initial = "l"; // ㄹㄹ → ll, ㄴㄹ → ll
    }
    const next = i + 1 < chars.length ? chars[i + 1].codePointAt(0)! - 0xac00 : -1;
    const nextIsVowelStart = next >= 0 && next <= 11171 && Math.floor(next / 588) === 11;
    const final = jong && nextIsVowelStart && LIAISON[jong] ? LIAISON[jong] : JONG[jong];
    out.push(initial + JUNG[jung] + final);
  }
  return out.join("");
}

export const titleCase = (s: string) => s.replace(/(^|[\s-])([a-z])/g, (_m, a: string, b: string) => a + b.toUpperCase());

const NAME_SUFFIX: Array<[RegExp, string]> = [
  [/아파트$/, " Apt"], [/오피스텔$/, " Officetel"], [/빌라$/, " Villa"], [/빌딩$/, " Bldg"], [/타워$/, " Tower"], [/맨션$/, " Mansion"], [/주택$/, " House"], [/상가$/, " Shopping Center"],
];

/** "래미안아파트" → "Raemian Apt" */
export function romanizeName(name: string): string {
  let suffix = "";
  let base = name.trim();
  for (const [re, en] of NAME_SUFFIX) if (re.test(base)) { base = base.replace(re, "").trim(); suffix = en; break; }
  const r = titleCase(romanize(base)).trim();
  return (r + suffix).trim();
}
