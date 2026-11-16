import { NextRequest, NextResponse } from "next/server";
import {
  openSession,
  acceptVoucher,
  closeSession,
  getChannel,
  listChannels,
  createClientVoucher,
  buildSessionChallenge,
  buildReceipt,
  MPP_CONFIG,
  type SignedVoucher,
} from "@/lib/mpp-session";

export const dynamic = "force-dynamic";

/**
 * MPP Session lifecycle endpoint
 *
 * POST /api/mpp/session
 *   action: "open" | "voucher" | "charge" | "close" | "status" | "list"
 *
 * This implements the session intent:
 *   open  → deposit once, get channelId
 *   voucher / charge → submit cumulative signed voucher
 *   close → settle + refund unspent
 */

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const action = body.action as string;

    // ── OPEN ──────────────────────────────────────────────────────────────
    if (action === "open") {
      const payer = body.payer || body.wallet || "anonymous-agent";
      const depositUsd = Number(body.depositUsd ?? body.deposit ?? 1);
      const unitPrice = Number(body.unitPrice ?? MPP_CONFIG.defaultUnitPrice);
      const unitType = body.unitType || "request";
      const currency = body.currency || "usdc-base";

      if (depositUsd <= 0 || depositUsd > 1000) {
        return NextResponse.json(
          { error: "depositUsd must be between 0 and 1000" },
          { status: 400 }
        );
      }

      const channel = openSession({
        payer,
        depositUsd,
        currency,
        unitPrice,
        unitType,
      });

      return NextResponse.json({
        ok: true,
        action: "open",
        channel: {
          channelId: channel.channelId,
          payer: channel.payer,
          payee: channel.payee,
          currency: channel.currency,
          depositAtomic: channel.depositAtomic,
          unitPrice: channel.unitPrice,
          unitType: channel.unitType,
          status: channel.status,
          expiresAt: channel.expiresAt,
        },
        receipt: buildReceipt(channel),
        challenge: buildSessionChallenge({
          channelId: channel.channelId,
          intent: "voucher",
          unitType,
          unitPrice,
          currency,
        }),
        hint: "Send cumulative vouchers via action=voucher or hit a metered skill with X-MPP-Channel + X-MPP-Voucher headers",
      });
    }

    // ── VOUCHER (accept cumulative authorization) ─────────────────────────
    if (action === "voucher" || action === "charge") {
      const voucher = body.voucher as SignedVoucher | undefined;
      const channelId = body.channelId || voucher?.payload?.channelId;

      if (!channelId) {
        return NextResponse.json(
          { error: "channelId or voucher required" },
          { status: 400 }
        );
      }

      // Convenience: if client only sends channelId + cumulativeUsd, mint a demo voucher
      let signed = voucher;
      if (!signed && body.cumulativeUsd != null) {
        const ch = getChannel(channelId);
        if (!ch) {
          return NextResponse.json({ error: "channel_not_found" }, { status: 404 });
        }
        signed = createClientVoucher(
          channelId,
          Number(body.cumulativeUsd),
          ch.currency,
          body.unitCount ?? 1
        );
      }

      if (!signed) {
        const ch = getChannel(channelId);
        return new NextResponse(
          JSON.stringify({
            error: "voucher_required",
            challenge: buildSessionChallenge({
              channelId,
              intent: "voucher",
              unitType: ch?.unitType,
              unitPrice: ch?.unitPrice,
              currency: ch?.currency,
            }),
          }),
          {
            status: 402,
            headers: {
              "Content-Type": "application/json",
              "WWW-Authenticate": `Payment realm="silent-operator", method="session", intent="voucher", channel="${channelId}"`,
            },
          }
        );
      }

      const result = acceptVoucher(signed);
      if (!result.ok) {
        return NextResponse.json({ ok: false, error: result.error }, { status: 402 });
      }

      return NextResponse.json({
        ok: true,
        action: "voucher",
        receipt: result.receipt,
        channel: {
          channelId: result.channel.channelId,
          spentAtomic: result.channel.spentAtomic,
          authorizedAtomic: result.channel.authorizedAtomic,
          status: result.channel.status,
        },
      });
    }

    // ── CLOSE ─────────────────────────────────────────────────────────────
    if (action === "close") {
      const channelId = body.channelId as string;
      if (!channelId) {
        return NextResponse.json({ error: "channelId required" }, { status: 400 });
      }

      let finalVoucher = body.voucher as SignedVoucher | undefined;
      if (!finalVoucher && body.cumulativeUsd != null) {
        const ch = getChannel(channelId);
        if (ch) {
          finalVoucher = createClientVoucher(
            channelId,
            Number(body.cumulativeUsd),
            ch.currency
          );
        }
      }

      const result = closeSession(channelId, finalVoucher);
      if (!result.ok) {
        return NextResponse.json({ ok: false, error: result.error }, { status: 400 });
      }

      return NextResponse.json({
        ok: true,
        action: "close",
        settledUsd: result.settledUsd,
        refundUsd: result.refundUsd,
        receipt: result.receipt,
        settlementTx: result.channel.settlementTx,
        message: `Settled $${result.settledUsd.toFixed(4)} to ${result.channel.payee}. Refunded $${result.refundUsd.toFixed(4)}.`,
      });
    }

    // ── STATUS ────────────────────────────────────────────────────────────
    if (action === "status") {
      const channelId = body.channelId as string;
      if (!channelId) {
        return NextResponse.json({ error: "channelId required" }, { status: 400 });
      }
      const channel = getChannel(channelId);
      if (!channel) {
        return NextResponse.json({ error: "channel_not_found" }, { status: 404 });
      }
      return NextResponse.json({
        ok: true,
        channel,
        receipt: buildReceipt(channel),
      });
    }

    // ── LIST (debug) ──────────────────────────────────────────────────────
    if (action === "list") {
      return NextResponse.json({
        ok: true,
        count: listChannels().length,
        channels: listChannels().map((c) => ({
          channelId: c.channelId,
          payer: c.payer,
          status: c.status,
          spentAtomic: c.spentAtomic,
          depositAtomic: c.depositAtomic,
          unitType: c.unitType,
        })),
      });
    }

    return NextResponse.json(
      {
        error: "unknown_action",
        supported: ["open", "voucher", "charge", "close", "status", "list"],
      },
      { status: 400 }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "internal_error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const channelId = req.nextUrl.searchParams.get("channelId");
  if (channelId) {
    const channel = getChannel(channelId);
    if (!channel) {
      return NextResponse.json({ error: "channel_not_found" }, { status: 404 });
    }
    return NextResponse.json({ ok: true, channel, receipt: buildReceipt(channel) });
  }

  // Discovery / health for MPP sessions
  return NextResponse.json({
    protocol: MPP_CONFIG.protocol,
    version: MPP_CONFIG.version,
    service: "silent-operator-mpp-session",
    intents: ["session"],
    actions: ["open", "voucher", "charge", "close", "status"],
    unitPriceDefault: MPP_CONFIG.defaultUnitPrice,
    currencies: Object.keys(MPP_CONFIG.currencies),
    creator: MPP_CONFIG.creator,
    docs: "POST with { action, ... } — see source or /api/mpp/skill for metered example",
  });
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers":
        "Content-Type, Authorization, X-MPP-Channel, X-MPP-Voucher, X-PAYMENT",
    },
  });
}
