/**
 * MPP Session Vouchers — Silent Operator
 * Cumulative vouchers + optional Upstash-backed durability.
 */

import { createHmac, randomBytes, timingSafeEqual } from "crypto";
import { CREATOR, BASE, SOLANA } from "./x402";

export const MPP_CONFIG = {
  protocol: "mpp-session",
  version: "1.1",
  secret:
    process.env.MPP_SESSION_SECRET ||
    "silent-operator-mpp-session-dev-secret-change-me",
  defaultUnitPrice: 0.001,
  maxSessionTtlMs: 60 * 60 * 1000,
  idleCloseMs: 5 * 60 * 1000,
  currencies: {
    "usdc-base": {
      network: "base",
      chainId: 8453,
      asset: BASE.asset,
      payTo: BASE.payTo,
      decimals: 6,
      symbol: "USDC",
    },
    "usdc-solana": {
      network: "solana",
      asset: SOLANA.asset,
      payTo: SOLANA.payTo,
      decimals: 6,
      symbol: "USDC",
    },
  },
  creator: CREATOR,
};

export type SessionStatus = "open" | "active" | "settling" | "closed" | "expired";

export interface SessionChannel {
  channelId: string;
  payer: string;
  payee: string;
  currency: keyof typeof MPP_CONFIG.currencies;
  depositAtomic: string;
  spentAtomic: string;
  authorizedAtomic: string;
  unitPrice: number;
  unitType: string;
  status: SessionStatus;
  createdAt: number;
  updatedAt: number;
  expiresAt: number;
  lastVoucherId?: string;
  settlementTx?: string;
}

export interface VoucherPayload {
  channelId: string;
  cumulativeAmount: string;
  unitCount?: number;
  nonce: string;
  expiresAt: number;
}

export interface SignedVoucher {
  payload: VoucherPayload;
  signature: string;
}

export interface SessionReceipt {
  channelId: string;
  acceptedCumulative: string;
  spent: string;
  remaining: string;
  status: SessionStatus;
  unitType: string;
  unitPrice: number;
  timestamp: string;
}

const mem = new Map<string, SessionChannel>();

function redisCreds() {
  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL || "";
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN || "";
  return url && token ? { url, token } : null;
}

export function storeBackend(): "upstash" | "memory" {
  return redisCreds() ? "upstash" : "memory";
}

async function redisCmd(command: unknown[]): Promise<unknown> {
  const c = redisCreds();
  if (!c) return null;
  const res = await fetch(c.url.replace(/\/$/, ""), {
    method: "POST",
    headers: {
      Authorization: `Bearer ${c.token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(command),
  });
  if (!res.ok) throw new Error(`Redis ${res.status}`);
  const data = (await res.json()) as { result: unknown };
  return data.result;
}

async function persist(ch: SessionChannel) {
  mem.set(ch.channelId, ch);
  if (!redisCreds()) return;
  const ttl = Math.max(60, Math.ceil((ch.expiresAt - Date.now()) / 1000));
  await redisCmd(["SET", `mpp:channel:${ch.channelId}`, JSON.stringify(ch), "EX", String(ttl)]);
  await redisCmd(["SADD", "mpp:channels", ch.channelId]);
}

export function getChannel(channelId: string): SessionChannel | undefined {
  return mem.get(channelId);
}

export function listChannels(): SessionChannel[] {
  return Array.from(mem.values());
}

function saveChannel(ch: SessionChannel) {
  mem.set(ch.channelId, ch);
  void persist(ch).catch(() => {});
}

function canonicalPayload(p: VoucherPayload): string {
  return [p.channelId, p.cumulativeAmount, String(p.unitCount ?? 0), p.nonce, String(p.expiresAt)].join("|");
}

export function signVoucher(payload: VoucherPayload, secret = MPP_CONFIG.secret): string {
  return createHmac("sha256", secret).update(canonicalPayload(payload)).digest("hex");
}

export function verifyVoucher(voucher: SignedVoucher, secret = MPP_CONFIG.secret): boolean {
  const expected = signVoucher(voucher.payload, secret);
  try {
    const a = Buffer.from(expected, "hex");
    const b = Buffer.from(voucher.signature, "hex");
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

function toAtomic(usd: number, decimals = 6): string {
  return Math.round(usd * 10 ** decimals).toString();
}

function fromAtomic(atomic: string, decimals = 6): number {
  return Number(atomic) / 10 ** decimals;
}

export interface OpenSessionInput {
  payer: string;
  depositUsd: number;
  currency?: keyof typeof MPP_CONFIG.currencies;
  unitPrice?: number;
  unitType?: string;
  ttlMs?: number;
}

export function openSession(input: OpenSessionInput): SessionChannel {
  const currency = input.currency || "usdc-base";
  const cfg = MPP_CONFIG.currencies[currency];
  if (!cfg) throw new Error(`Unsupported currency: ${currency}`);
  const now = Date.now();
  const channel: SessionChannel = {
    channelId: `mpp_${randomBytes(12).toString("hex")}`,
    payer: input.payer,
    payee: cfg.payTo,
    currency,
    depositAtomic: toAtomic(input.depositUsd, cfg.decimals),
    spentAtomic: "0",
    authorizedAtomic: "0",
    unitPrice: input.unitPrice ?? MPP_CONFIG.defaultUnitPrice,
    unitType: input.unitType || "request",
    status: "open",
    createdAt: now,
    updatedAt: now,
    expiresAt: now + (input.ttlMs ?? MPP_CONFIG.maxSessionTtlMs),
  };
  saveChannel(channel);
  return channel;
}

export function acceptVoucher(
  voucher: SignedVoucher
): { ok: true; channel: SessionChannel; receipt: SessionReceipt } | { ok: false; error: string } {
  if (!verifyVoucher(voucher)) return { ok: false, error: "invalid_signature" };
  const { payload } = voucher;
  const channel = getChannel(payload.channelId);
  if (!channel) return { ok: false, error: "channel_not_found" };
  if (channel.status === "closed" || channel.status === "expired") {
    return { ok: false, error: `channel_${channel.status}` };
  }
  if (Date.now() > channel.expiresAt) {
    channel.status = "expired";
    saveChannel(channel);
    return { ok: false, error: "channel_expired" };
  }
  if (Date.now() > payload.expiresAt) return { ok: false, error: "voucher_expired" };
  const prevAuth = BigInt(channel.authorizedAtomic);
  const nextAuth = BigInt(payload.cumulativeAmount);
  const deposit = BigInt(channel.depositAtomic);
  if (nextAuth <= prevAuth) return { ok: false, error: "cumulative_not_increasing" };
  if (nextAuth > deposit) return { ok: false, error: "exceeds_deposit" };
  channel.authorizedAtomic = payload.cumulativeAmount;
  channel.spentAtomic = payload.cumulativeAmount;
  channel.status = "active";
  channel.updatedAt = Date.now();
  channel.lastVoucherId = payload.nonce;
  saveChannel(channel);
  return { ok: true, channel, receipt: buildReceipt(channel) };
}

export function chargeUnits(
  channelId: string,
  units: number,
  clientVoucher?: SignedVoucher
):
  | { ok: true; channel: SessionChannel; receipt: SessionReceipt; chargedUsd: number }
  | {
      ok: false;
      error: string;
      needVoucher?: { channelId: string; requiredCumulative: string; unitPrice: number };
    } {
  const channel = getChannel(channelId);
  if (!channel) return { ok: false, error: "channel_not_found" };
  if (channel.status !== "open" && channel.status !== "active") {
    return { ok: false, error: `channel_${channel.status}` };
  }
  const cfg = MPP_CONFIG.currencies[channel.currency];
  const currentSpent = fromAtomic(channel.spentAtomic, cfg.decimals);
  const requiredUsd = currentSpent + units * channel.unitPrice;
  const requiredAtomic = toAtomic(requiredUsd, cfg.decimals);
  if (clientVoucher) {
    if (clientVoucher.payload.channelId !== channelId) {
      return { ok: false, error: "voucher_channel_mismatch" };
    }
    const result = acceptVoucher(clientVoucher);
    if (!result.ok) return { ok: false, error: result.error };
    if (BigInt(result.channel.authorizedAtomic) < BigInt(requiredAtomic)) {
      return {
        ok: false,
        error: "insufficient_authorization",
        needVoucher: { channelId, requiredCumulative: requiredAtomic, unitPrice: channel.unitPrice },
      };
    }
    return {
      ok: true,
      channel: result.channel,
      receipt: result.receipt,
      chargedUsd: units * channel.unitPrice,
    };
  }
  return {
    ok: false,
    error: "voucher_required",
    needVoucher: { channelId, requiredCumulative: requiredAtomic, unitPrice: channel.unitPrice },
  };
}

export function closeSession(
  channelId: string,
  finalVoucher?: SignedVoucher
):
  | {
      ok: true;
      channel: SessionChannel;
      receipt: SessionReceipt;
      refundUsd: number;
      settledUsd: number;
    }
  | { ok: false; error: string } {
  const channel = getChannel(channelId);
  if (!channel) return { ok: false, error: "channel_not_found" };
  if (channel.status === "closed") return { ok: false, error: "already_closed" };
  if (finalVoucher) {
    const result = acceptVoucher(finalVoucher);
    if (!result.ok && result.error !== "cumulative_not_increasing" && result.error !== "channel_expired") {
      return { ok: false, error: result.error };
    }
  }
  const cfg = MPP_CONFIG.currencies[channel.currency];
  const settled = fromAtomic(channel.spentAtomic, cfg.decimals);
  const deposit = fromAtomic(channel.depositAtomic, cfg.decimals);
  const refund = Math.max(0, deposit - settled);
  channel.status = "closed";
  channel.updatedAt = Date.now();
  channel.settlementTx = `sim_${randomBytes(8).toString("hex")}`;
  saveChannel(channel);
  return {
    ok: true,
    channel,
    receipt: buildReceipt(channel),
    refundUsd: refund,
    settledUsd: settled,
  };
}

export function buildReceipt(channel: SessionChannel): SessionReceipt {
  const cfg = MPP_CONFIG.currencies[channel.currency];
  const spent = fromAtomic(channel.spentAtomic, cfg.decimals);
  const deposit = fromAtomic(channel.depositAtomic, cfg.decimals);
  return {
    channelId: channel.channelId,
    acceptedCumulative: channel.authorizedAtomic,
    spent: channel.spentAtomic,
    remaining: toAtomic(Math.max(0, deposit - spent), cfg.decimals),
    status: channel.status,
    unitType: channel.unitType,
    unitPrice: channel.unitPrice,
    timestamp: new Date().toISOString(),
  };
}

export function createClientVoucher(
  channelId: string,
  cumulativeUsd: number,
  currency: keyof typeof MPP_CONFIG.currencies = "usdc-base",
  unitCount = 1
): SignedVoucher {
  const cfg = MPP_CONFIG.currencies[currency];
  const payload: VoucherPayload = {
    channelId,
    cumulativeAmount: toAtomic(cumulativeUsd, cfg.decimals),
    unitCount,
    nonce: randomBytes(8).toString("hex"),
    expiresAt: Date.now() + 5 * 60 * 1000,
  };
  return { payload, signature: signVoucher(payload) };
}

export function buildSessionChallenge(opts: {
  channelId?: string;
  amount?: string;
  unitType?: string;
  unitPrice?: number;
  currency?: string;
  intent?: "open" | "voucher" | "topUp" | "close";
}) {
  return {
    protocol: MPP_CONFIG.protocol,
    version: MPP_CONFIG.version,
    intent: opts.intent || (opts.channelId ? "voucher" : "open"),
    method: "silent-operator-session",
    channelId: opts.channelId,
    currency: opts.currency || "usdc-base",
    unitType: opts.unitType || "request",
    unitPrice: opts.unitPrice ?? MPP_CONFIG.defaultUnitPrice,
    amount: opts.amount,
    payTo: BASE.payTo,
    networks: ["base", "solana"],
    creator: CREATOR,
  };
}
