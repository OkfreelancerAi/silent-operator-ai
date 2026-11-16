import { NextRequest, NextResponse } from "next/server";
import {
  chargeUnits,
  getChannel,
  createClientVoucher,
  buildSessionChallenge,
  MPP_CONFIG,
  type SignedVoucher,
} from "@/lib/mpp-session";

export const dynamic = "force-dynamic";

/**
 * Metered skill endpoint — MPP session vouchers
 *
 * Example agent skill that charges per unit of work using an open session.
 *
 * Headers:
 *   X-MPP-Channel: <channelId>
 *   X-MPP-Voucher: <base64url JSON SignedVoucher>   (optional on first try)
 *
 * Or body:
 *   { channelId, voucher?, units?, skill? }
 *
 * Flow:
 *   1. Agent opens session via POST /api/mpp/session { action: "open", depositUsd: 1 }
 *   2. Agent calls this skill with channelId
 *   3. If no/insufficient voucher → 402 + required cumulative
 *   4. Agent signs cumulative voucher and retries
 *   5. Skill runs and returns result + receipt
 */

const SKILLS: Record<
  string,
  { name: string; units: number; description: string; run: () => object }
> = {
  "proposal-outline": {
    name: "Proposal Outline",
    units: 3,
    description: "Structured proposal outline for a B2B offer",
    run: () => ({
      sections: [
        "Executive Summary",
        "Problem & Opportunity",
        "Proposed Solution",
        "Timeline & Milestones",
        "Investment & ROI",
        "Next Steps",
      ],
      tip: "Fill each section with client-specific data from your CRM.",
    }),
  },
  "invoice-nudge": {
    name: "Invoice Nudge",
    units: 1,
    description: "Short polite follow-up for overdue invoice",
    run: () => ({
      subject: "Quick note on invoice #[ID]",
      body: "Hi [Name], just a friendly reminder that invoice #[ID] for $[AMOUNT] was due on [DATE]. Happy to resend or answer any questions. Thanks!",
    }),
  },
  "daily-brief": {
    name: "Daily Brief",
    units: 5,
    description: "One-page operator brief template",
    run: () => ({
      blocks: ["Priorities", "Blockers", "Metrics", "Decisions needed", "Tomorrow"],
      format: "Keep each block under 3 bullets. Ship by 08:00.",
    }),
  },
  "lead-score": {
    name: "Lead Score",
    units: 2,
    description: "Simple lead qualification checklist",
    run: () => ({
      scoreAxes: ["Budget", "Authority", "Need", "Timeline"],
      scale: "1–5 each. ≥16 = hot, 12–15 = warm, <12 = nurture.",
    }),
  },
};

export async function POST(req: NextRequest) {
  try {
    const headerChannel = req.headers.get("x-mpp-channel") || req.headers.get("X-MPP-Channel");
    const headerVoucher = req.headers.get("x-mpp-voucher") || req.headers.get("X-MPP-Voucher");

    let body: Record<string, unknown> = {};
    try {
      body = await req.json();
    } catch {
      /* empty body ok */
    }

    const channelId = (body.channelId as string) || headerChannel;
    const skillKey = (body.skill as string) || "proposal-outline";
    const skill = SKILLS[skillKey] || SKILLS["proposal-outline"];
    const units = Number(body.units ?? skill.units);

    if (!channelId) {
      return new NextResponse(
        JSON.stringify({
          error: "channel_required",
          message: "Open a session first: POST /api/mpp/session { action: 'open', depositUsd: 1 }",
          challenge: buildSessionChallenge({ intent: "open", unitType: "request" }),
          skills: Object.keys(SKILLS),
        }),
        {
          status: 402,
          headers: {
            "Content-Type": "application/json",
            "WWW-Authenticate": `Payment realm="silent-operator", method="session", intent="open"`,
          },
        }
      );
    }

    const channel = getChannel(channelId);
    if (!channel) {
      return NextResponse.json({ error: "channel_not_found" }, { status: 404 });
    }

    // Parse optional voucher from header or body
    let voucher: SignedVoucher | undefined;
    if (headerVoucher) {
      try {
        voucher = JSON.parse(Buffer.from(headerVoucher, "base64url").toString("utf8"));
      } catch {
        try {
          voucher = JSON.parse(headerVoucher);
        } catch {
          return NextResponse.json({ error: "malformed_voucher_header" }, { status: 400 });
        }
      }
    } else if (body.voucher) {
      voucher = body.voucher as SignedVoucher;
    } else if (body.cumulativeUsd != null) {
      // Demo convenience: auto-sign for testing
      voucher = createClientVoucher(
        channelId,
        Number(body.cumulativeUsd),
        channel.currency,
        units
      );
    }

    const charge = chargeUnits(channelId, units, voucher);

    if (!charge.ok) {
      return new NextResponse(
        JSON.stringify({
          error: charge.error,
          needVoucher: charge.needVoucher,
          challenge: buildSessionChallenge({
            channelId,
            intent: "voucher",
            amount: charge.needVoucher?.requiredCumulative,
            unitType: channel.unitType,
            unitPrice: channel.unitPrice,
            currency: channel.currency,
          }),
          hint:
            charge.error === "voucher_required"
              ? "Sign a cumulative voucher covering requiredCumulative and retry with X-MPP-Voucher or body.voucher"
              : undefined,
        }),
        {
          status: 402,
          headers: {
            "Content-Type": "application/json",
            "WWW-Authenticate": `Payment realm="silent-operator", method="session", intent="voucher", channel="${channelId}"`,
            "Access-Control-Expose-Headers": "WWW-Authenticate",
          },
        }
      );
    }

    // ── Paid work ─────────────────────────────────────────────────────────
    const result = skill.run();

    return NextResponse.json({
      paid: true,
      skill: skill.name,
      units,
      chargedUsd: charge.chargedUsd,
      receipt: charge.receipt,
      result,
      remainingAtomic: charge.receipt.remaining,
      meta: {
        protocol: MPP_CONFIG.protocol,
        channelId,
        unitType: channel.unitType,
        unitPrice: channel.unitPrice,
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "internal_error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    service: "silent-operator-mpp-skill",
    protocol: MPP_CONFIG.protocol,
    description: "Metered agent skills billed via MPP session vouchers",
    skills: Object.entries(SKILLS).map(([key, s]) => ({
      key,
      name: s.name,
      units: s.units,
      description: s.description,
      estimatedUsd: s.units * MPP_CONFIG.defaultUnitPrice,
    })),
    flow: [
      "1. POST /api/mpp/session { action: 'open', depositUsd: 1, payer: 'agent-1' }",
      "2. POST /api/mpp/skill { channelId, skill: 'invoice-nudge' } → 402 need voucher",
      "3. Sign cumulative voucher (or pass cumulativeUsd for demo)",
      "4. Retry with voucher → skill result + receipt",
      "5. POST /api/mpp/session { action: 'close', channelId } when done",
    ],
  });
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers":
        "Content-Type, Authorization, X-MPP-Channel, X-MPP-Voucher",
    },
  });
}
