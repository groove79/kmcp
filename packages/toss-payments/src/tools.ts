/**
 * Toss Payments tools. Naming: toss_<verb>_<object>. Description: EN first, KO second, "Use when…" / "Needs…".
 * Access: read | write — toss_cancel_payment is the only write and moves real money.
 */
import { z } from "zod";
import type { TossClient } from "./client.js";

export type Access = "read" | "write";
export interface ToolDef<S extends z.ZodRawShape> {
  name: string;
  description: string;
  access: Access;
  schema: S;
  handler: (client: TossClient, args: z.infer<z.ZodObject<S>>) => Promise<unknown>;
}
const define = <S extends z.ZodRawShape>(t: ToolDef<S>) => t;

export const PAYMENT_STATUS = ["READY", "IN_PROGRESS", "WAITING_FOR_DEPOSIT", "DONE", "CANCELED", "PARTIAL_CANCELED", "ABORTED", "EXPIRED"] as const;

/** Trim the Payment object to what an agent needs; keeps balanceAmount so a partial cancel can be reasoned about. */
export function paymentView(p: Record<string, unknown>) {
  const card = p.card as Record<string, unknown> | null | undefined;
  const va = p.virtualAccount as Record<string, unknown> | null | undefined;
  const easy = p.easyPay as Record<string, unknown> | null | undefined;
  const receipt = p.receipt as { url?: string } | null | undefined;
  return {
    paymentKey: p.paymentKey,
    orderId: p.orderId,
    orderName: p.orderName,
    status: p.status,
    method: p.method,
    totalAmount: p.totalAmount,
    balanceAmount: p.balanceAmount,
    suppliedAmount: p.suppliedAmount,
    vat: p.vat,
    currency: p.currency,
    requestedAt: p.requestedAt,
    approvedAt: p.approvedAt,
    card: card ? { number: card.number, installmentPlanMonths: card.installmentPlanMonths, issuerCode: card.issuerCode, approveNo: card.approveNo } : undefined,
    virtualAccount: va ? { bankCode: va.bankCode, accountNumber: va.accountNumber, customerName: va.customerName, dueDate: va.dueDate, refundStatus: va.refundStatus } : undefined,
    easyPay: easy ? { provider: easy.provider, amount: easy.amount } : undefined,
    receiptUrl: receipt?.url,
    cancels: ((p.cancels as Array<Record<string, unknown>>) ?? []).map((c) => ({ cancelAmount: c.cancelAmount, cancelReason: c.cancelReason, canceledAt: c.canceledAt, cancelStatus: c.cancelStatus, transactionKey: c.transactionKey })),
  };
}

const dateRe = /^\d{4}-\d{2}-\d{2}(T[\d:+-]+)?$/;

export const getPayment = define({
  name: "toss_get_payment",
  access: "read",
  description:
    "Look up one Toss Payments payment by paymentKey or by the merchant's orderId: status, amounts, method, card/virtual-account details, cancel history, receipt URL. " +
    "결제 1건을 조회합니다. Use before cancelling (check balanceAmount) or to answer 'did order X get paid?'. Needs paymentKey or orderId.",
  schema: {
    paymentKey: z.string().min(1).optional(),
    orderId: z.string().min(1).optional().describe("Merchant order id used at checkout"),
  },
  handler: async (c, { paymentKey, orderId }) => {
    if (!paymentKey && !orderId) throw new Error("Give paymentKey or orderId.");
    const p = paymentKey
      ? await c.get<Record<string, unknown>>(`/v1/payments/${encodeURIComponent(paymentKey)}`)
      : await c.get<Record<string, unknown>>(`/v1/payments/orders/${encodeURIComponent(orderId!)}`);
    return paymentView(p);
  },
});

export const cancelPayment = define({
  name: "toss_cancel_payment",
  access: "write",
  description:
    "Cancel (refund) a Toss payment — full by default, or partial with cancelAmount. Money moves back to the customer; irreversible. Virtual-account payments need refundReceiveAccount. Idempotent per call. " +
    "결제를 취소/환불합니다. Use only after confirming with toss_get_payment; the human approval hook should gate this. Needs paymentKey and cancelReason; cancelAmount for partial.",
  schema: {
    paymentKey: z.string().min(1),
    cancelReason: z.string().min(1).max(200).describe("Shown to the customer, e.g. 고객 변심"),
    cancelAmount: z.number().int().positive().optional().describe("Omit for a full cancel"),
    taxFreeAmount: z.number().int().min(0).optional(),
    refundReceiveAccount: z.object({ bank: z.string().describe("Bank code, e.g. 20 for 우리"), accountNumber: z.string(), holderName: z.string() }).optional().describe("Required for 가상계좌 payments"),
    idempotencyKey: z.string().max(300).optional().describe("Reuse the same key when retrying the same cancel"),
  },
  handler: async (c, a) => {
    const body: Record<string, unknown> = { cancelReason: a.cancelReason };
    if (a.cancelAmount !== undefined) body.cancelAmount = a.cancelAmount;
    if (a.taxFreeAmount !== undefined) body.taxFreeAmount = a.taxFreeAmount;
    if (a.refundReceiveAccount) body.refundReceiveAccount = a.refundReceiveAccount;
    const p = await c.post<Record<string, unknown>>(`/v1/payments/${encodeURIComponent(a.paymentKey)}/cancel`, body, a.idempotencyKey);
    return paymentView(p);
  },
});

export const listTransactions = define({
  name: "toss_list_transactions",
  access: "read",
  description:
    "List Toss transactions (approvals and cancels) in a date range, newest first, paged with startingAfter. Max 5000 per call. " +
    "기간별 거래 내역을 조회합니다. Use for daily reconciliation or 'what was paid today'. Needs startDate/endDate (yyyy-MM-dd or ISO datetime).",
  schema: {
    startDate: z.string().regex(dateRe),
    endDate: z.string().regex(dateRe),
    limit: z.number().int().min(1).max(5000).default(100),
    startingAfter: z.string().optional().describe("transactionKey of the last item from the previous page"),
  },
  handler: async (c, a) => {
    const rows = await c.get<Array<Record<string, unknown>>>("/v1/transactions", { startDate: a.startDate, endDate: a.endDate, limit: a.limit, startingAfter: a.startingAfter });
    const transactions = (rows ?? []).map((t) => ({
      transactionKey: t.transactionKey, paymentKey: t.paymentKey, orderId: t.orderId, method: t.method, status: t.status,
      amount: t.amount, currency: t.currency, transactionAt: t.transactionAt, receiptUrl: t.receiptUrl, customerKey: t.customerKey,
    }));
    return { transactions, nextStartingAfter: transactions.length === a.limit ? transactions[transactions.length - 1]?.transactionKey ?? null : null };
  },
});

export const listSettlements = define({
  name: "toss_list_settlements",
  access: "read",
  description:
    "List Toss settlement (정산) records: per-payment fees, VAT, and payOutAmount actually paid to the merchant, by sold date or payout date. " +
    "정산 내역을 조회합니다. Use for bookkeeping, fee checks, or 'how much lands in the account on day X'. Needs startDate/endDate; dateType soldDate (default) or paidOutDate.",
  schema: {
    startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    dateType: z.enum(["soldDate", "paidOutDate"]).default("soldDate"),
    page: z.number().int().min(1).default(1),
    size: z.number().int().min(1).max(10000).default(100),
  },
  handler: async (c, a) => {
    const rows = await c.get<Array<Record<string, unknown>>>("/v1/settlements", { startDate: a.startDate, endDate: a.endDate, dateType: a.dateType, page: a.page, size: a.size });
    const settlements = (rows ?? []).map((s) => ({
      paymentKey: s.paymentKey, transactionKey: s.transactionKey, orderId: s.orderId, method: s.method, amount: s.amount,
      fees: s.fees, interestFee: s.interestFee, supplyAmount: s.supplyAmount, vat: s.vat, payOutAmount: s.payOutAmount,
      approvedAt: s.approvedAt, soldDate: s.soldDate, paidOutDate: s.paidOutDate,
    }));
    const totalPayOut = settlements.reduce((sum, s) => sum + (Number(s.payOutAmount) || 0), 0);
    return { settlements, totalPayOut, page: a.page, hasMore: settlements.length === a.size };
  },
});

export const tools = [getPayment, cancelPayment, listTransactions, listSettlements] as const;
