import { NextRequest, NextResponse } from "next/server";
import {
  openSession,
  chargeUnits,
  closeSession,
  createClientVoucher,
  storeBackend,
  MPP_CONFIG,
} from "@/lib/mpp-session";

export const dynamic = "force-dynamic";

/**
 * Single-request MPP demo: open → voucher → skill → close
 * Works without Redis because everything happens in one invocation.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const skill = (body.skill as string) || "invoice-nudge";
    const depositUsd = Number(body.depositUsd ?? 0.05);
    const payer = (body.payer as string) || "demo-agent";

    const channel = openSession({
      payer,
      depositUsd,
      unitPrice: MPP_CONFIG.defaultUnitPrice,
      unitType: "request",
    });

    const units =
      skill === "daily-brief" ? 5 : skill === "proposal-outline" ? 3 : skill === "lead-score" ? 2 : 1;
    const chargeUsd = units * channel.unitPrice;
    const voucher = createClientVoucher(
      channel.channelId,
      chargeUsd,
      channel.currency,
      units
    );

    const charge = chargeUnits(channel.channelId, units, voucher);
    if (!charge.ok) {
      return NextResponse.json(
        { error: charge.error, needVoucher: charge.needVoucher },
        { status: 402 }
      );
    }

    const results: Record<string, object> = {
      "invoice-nudge": {
        subject: "Quick note on invoice #[ID]",
        body: "Hi [Name], just a friendly reminder that invoice #[ID] for $[AMOUNT] was due on [DATE]. Happy to resend or answer any questions. Thanks!",
      },
      "proposal-outline": {
        sections: [
          "Executive Summary",
          "Problem & Opportunity",
          "Proposed Solution",
          "Timeline & Milestones",
          "Investment & ROI",
          "Next Steps",
        ],
      },
      "daily-brief": {
        blocks: ["Priorities", "Blockers", "Metrics", "Decisions needed", "Tomorrow"],
      },
      "lead-score": {
        scoreAxes: ["Budget", "Authority", "Need", "Timeline"],
        scale: "1–5 each. ≥16 = hot, 12–15 = warm, <12 = nurture.",
      },
    };

    const closed = closeSession(channel.channelId);
    if (!closed.ok) {
      return NextResponse.json({ error: closed.error, partial: charge }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      demo: true,
      store: storeBackend(),
      skill,
      units,
      chargedUsd: charge.chargedUsd,
      settledUsd: closed.settledUsd,
      refundUsd: closed.refundUsd,
      result: results[skill] || results["invoice-nudge"],
      receipt: closed.receipt,
      settlementTx: closed.channel.settlementTx,
      note:
        storeBackend() === "memory"
          ? "Running on in-memory store. Add UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN for multi-request sessions."
          : "Using Upstash Redis — sessions persist across invocations.",
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "internal_error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    service: "silent-operator-mpp-demo",
    store: storeBackend(),
    usage: 'POST { "skill": "invoice-nudge", "depositUsd": 0.05 }',
    skills: ["invoice-nudge", "proposal-outline", "daily-brief", "lead-score"],
  });
}
