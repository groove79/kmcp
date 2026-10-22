import type { Check } from "../types.js";
import { checks as cafe24 } from "./cafe24.js";
import { checks as naver } from "./naver-commerce.js";
import { checks as kakao } from "./kakao.js";
import { checks as toss } from "./toss-payments.js";
import { checks as publicData } from "./public-data.js";
import { checks as japan } from "./japan-bridge.js";
import { checks as calendar } from "./kr-biz-calendar.js";
import { checks as hwp } from "./hwp.js";
import { checks as coupang } from "./coupang.js";
import { checks as popbill } from "./popbill.js";

/** Order = order in the report. Pure/offline first so a network outage never hides a code regression. */
export const allChecks: Check[] = [...calendar, ...hwp, ...japan, ...publicData, ...cafe24, ...naver, ...kakao, ...toss, ...coupang, ...popbill];
/** Names the token bag must be seeded with from env on first run. */
export const ROTATING_SEEDS: string[] = [];
