/**
 * MPP Session Vouchers — Silent Operator
 *
 * Implements the Machine Payments Protocol *session* intent model:
 *   1. Client opens a channel (deposits a budget)
 *   2. Client signs cumulative vouchers for each unit of work
 *   3. Server verifies signature + monotonic cumulative amount
 *   4. Server settles / closes and refunds unspent
 *
 * This is a self-contained, production-shaped implementation that mirrors
 * the official MPP session semantics (cumulative vouchers, channel state).
 * Swap the crypto primitives for `mppx` + Tempo TIP-1034 when you have
 * a funded Tempo seller account.
 *
 * Spec references:
 *   - https://mpp.dev/intents/session
 *   - https://mpp.dev/payment-methods/tempo/session
 */

import { createHmac, randomBytes, timingSafeEqual } from "crypto";
import { CREATOR, BASE, SOLANA } from "./x402";

// ─── Config ────────────────────────────────────────────────────────────────

export const MPP_CONFIG = {
  protocol: "mpp-session",
  version: "1.0",
  // Demo HMAC secret — replace with process.env.MPP_SESSION_SECRET in production
  secret:
    process.env.MPP_SESSION_SECRET ||
    "silent-operator-mpp-session-dev-secret-change-me",
  // Default unit price (USD) charged per voucher tick
  defaultUnitPrice: 0.001,
  // Max session lifetime
  maxSessionTtlMs: 60 * 60 * 1000, // 1 hour
  // Idle close delay
  idleCloseMs: 5 * 60 * 1000, // 5 min
  // Supported assets (mirrors your existing x402 wallets)
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

// ─── Types ─────────────────────────────────────────────────────────────────

export type SessionStatus =
  | "open"
  | "active"
  | "settling"
  | "closed"
  | "expired";

export interface SessionChannel {
  channelId: string;
  payer: string; // client identifier / wallet
  payee: string;
  currency: keyof typeof MPP_CONFIG.currencies;
  depositAtomic: string; // total deposited (atomic units)
  spentAtomic: string; // highest accepted cumulative spend
  authorizedAtomic: string; // highest voucher cumulative authorized
  unitPrice: number; // USD per unit
  unitType: string; // "request" | "token" | "word" | ...
  status: SessionStatus;
  createdAt: number;
  updatedAt: number;
  expiresAt: number;
  lastVoucherId?: string;
  settlementTx?: string;
}

export interface VoucherPayload {
  channelId: string;
  cumulativeAmount: string; // atomic units, must be monotonic
  unitCount?: number; // optional human units this voucher covers
  nonce: string;
  expiresAt: number;
}

export interface SignedVoucher {
  payload: VoucherPayload;
  signature: string; // HMAC-SHA256 over canonical payload
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

// ─── In-memory store (swap for Redis / DB in production) ───────────────────

const channels = new Map<string, SessionChannel>();

export function getChannel(channelId: string): SessionChannel | undefined {
  return channels.get(channelId);
}

export function listChannels(): SessionChannel[] {
  return Array.from(channels.values());
}

function saveChannel(ch: SessionChannel) {
  channels.set(ch.channelId, ch);
}

// ─── Crypto helpers ────────────────────────────────────────────────────────

function canonicalPayload(p: VoucherPayload): string {
  return [
    p.channelId,
    p.cumulativeAmount,
    String(p.unitCount ?? 0),
    p.nonce,
    String(p.expiresAt),
  ].join("|");
}

export function signVoucher(
  payload: VoucherPayload,
  secret = MPP_CONFIG.secret
): string {
  return createHmac("sha256", secret)
    .update(canonicalPayload(payload))
    .digest("hex");
}

export function verifyVoucher(
  voucher: SignedVoucher,
  secret = MPP_CONFIG.secret
): boolean {
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

// ─── Session lifecycle ─────────────────────────────────────────────────────

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

  const depositAtomic = toAtomic(input.depositUsd, cfg.decimals);
  const now = Date.now();
  const channelId = `mpp_${randomBytes(12).toString("hex")}`;

  const channel: SessionChannel = {
    channelId,
    payer: input.payer,
    payee: cfg.payTo,
    currency,
    depositAtomic,
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

/**
 * Accept a cumulative voucher.
 * Rules (MPP session semantics):
 *  - signature valid
 *  - voucher not expired
 *  - channel open/active
 *  - cumulativeAmount > previously authorized
 *  - cumulativeAmount <= deposit
 */
export function acceptVoucher(
  voucher: SignedVoucher
): { ok: true; channel: SessionChannel; receipt: SessionReceipt } | { ok: false; error: string } {
  if (!verifyVoucher(voucher)) {
    return { ok: false, error: "invalid_signature" };
  }

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

  if (Date.now() > payload.expiresAt) {
    return { ok: false, error: "voucher_expired" };
  }

  const prevAuth = BigInt(channel.authorizedAtomic);
  const nextAuth = BigInt(payload.cumulativeAmount);
  const deposit = BigInt(channel.depositAtomic);

  if (nextAuth <= prevAuth) {
    return { ok: false, error: "cumulative_not_increasing" };
  }
  if (nextAuth > deposit) {
    return { ok: false, error: "exceeds_deposit" };
  }

  // Accept: raise authorized + spent (spent tracks what we actually earned)
  channel.authorizedAtomic = payload.cumulativeAmount;
  channel.spentAtomic = payload.cumulativeAmount;
  channel.status = "active";
  channel.updatedAt = Date.now();
  channel.lastVoucherId = payload.nonce;
  saveChannel(channel);

  return {
    ok: true,
    channel,
    receipt: buildReceipt(channel),
  };
}

/**
 * Charge N units against an open session.
 * Convenience helper for metered endpoints: builds + accepts a voucher
 * when the client already provided a signed one, or returns 402-style need.
 */
export function chargeUnits(
  channelId: string,
  units: number,
  clientVoucher?: SignedVoucher
): {
  ok: true;
  channel: SessionChannel;
  receipt: SessionReceipt;
  chargedUsd: number;
} | {
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
    // Client supplied a voucher — verify it covers the required amount
    if (clientVoucher.payload.channelId !== channelId) {
      return { ok: false, error: "voucher_channel_mismatch" };
    }
    const result = acceptVoucher(clientVoucher);
    if (!result.ok) return { ok: false, error: result.error };

    // Ensure the accepted cumulative covers what we need
    if (BigInt(result.channel.authorizedAtomic) < BigInt(requiredAtomic)) {
      return {
        ok: false,
        error: "insufficient_authorization",
        needVoucher: {
          channelId,
          requiredCumulative: requiredAtomic,
          unitPrice: channel.unitPrice,
        },
      };
    }

    return {
      ok: true,
      channel: result.channel,
      receipt: result.receipt,
      chargedUsd: units * channel.unitPrice,
    };
  }

  // No voucher yet — tell client what cumulative they must authorize
  return {
    ok: false,
    error: "voucher_required",
    needVoucher: {
      channelId,
      requiredCumulative: requiredAtomic,
      unitPrice: channel.unitPrice,
    },
  };
}

export function closeSession(
  channelId: string,
  finalVoucher?: SignedVoucher
): {
  ok: true;
  channel: SessionChannel;
  receipt: SessionReceipt;
  refundUsd: number;
  settledUsd: number;
} | { ok: false; error: string } {
  const channel = getChannel(channelId);
  if (!channel) return { ok: false, error: "channel_not_found" };
  if (channel.status === "closed") {
    return { ok: false, error: "already_closed" };
  }

  if (finalVoucher) {
    const result = acceptVoucher(finalVoucher);
    if (!result.ok && result.error !== "cumulative_not_increasing") {
      // Allow close even if voucher is the same as last accepted
      if (result.error !== "channel_expired") {
        return { ok: false, error: result.error };
      }
    }
  }

  const cfg = MPP_CONFIG.currencies[channel.currency];
  const settled = fromAtomic(channel.spentAtomic, cfg.decimals);
  const deposit = fromAtomic(channel.depositAtomic, cfg.decimals);
  const refund = Math.max(0, deposit - settled);

  channel.status = "closed";
  channel.updatedAt = Date.now();
  channel.settlementTx = `sim_${randomBytes(8).toString("hex")}`; // replace with real tx hash
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

/**
 * Helper for clients: create a signed voucher for a given cumulative amount.
 * In production the client wallet signs; here we use the shared secret so
 * demo agents can exercise the full flow without a Tempo key.
 */
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
    expiresAt: Date.now() + 5 * 60 * 1000, // 5 min voucher TTL
  };
  return {
    payload,
    signature: signVoucher(payload),
  };
}

// ─── MPP HTTP helpers (Challenge / Credential style) ───────────────────────

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
