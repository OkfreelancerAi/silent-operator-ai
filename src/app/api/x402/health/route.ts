import { NextResponse } from "next/server";
import { CREATOR, BASE, SOLANA, PRICES } from "@/lib/x402";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({
    status: "healthy",
    service: "silent-operator-x402",
    version: "1.2.0",
    x402Version: 1,
    mppSessions: true,
    creator: CREATOR,
    payment: {
      base: { network: BASE.network, payTo: BASE.payTo, asset: "USDC" },
      solana: { network: SOLANA.network, payTo: SOLANA.payTo, asset: "USDC" },
    },
    prices: PRICES,
    mpp: {
      session: "/api/mpp/session",
      skill: "/api/mpp/skill",
      note: "Open a session, submit cumulative vouchers, close to settle",
    },
  });
}
