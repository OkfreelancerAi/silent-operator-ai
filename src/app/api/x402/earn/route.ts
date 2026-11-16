import { NextRequest, NextResponse } from "next/server";
import { buildPaymentRequired, PRICES, BASE, CREATOR, SOLANA } from "@/lib/x402";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const payment = req.headers.get("x-payment") || req.headers.get("X-PAYMENT");
  const proof = req.headers.get("x-payment-proof") || req.headers.get("X-Payment-Proof");

  if (!payment && !proof) {
    const body = buildPaymentRequired({
      amount: PRICES.earn,
      description: "Silent Operator earn insight — settles to @okfreelancer",
      resource: "https://silent-operator-ai.vercel.app/api/x402/earn",
    });
    return new NextResponse(JSON.stringify(body), {
      status: 402,
      headers: {
        "Content-Type": "application/json",
        "X-Payment-Required": "true",
        "PAYMENT-REQUIRED": Buffer.from(JSON.stringify(body)).toString("base64"),
        "X-Payment-Address": BASE.payTo,
        "X-Payment-Amount": String(Math.round(PRICES.earn * 1e6)),
        "X-Payment-Asset": "USDC",
        "X-Payment-Network": "base",
        "Access-Control-Expose-Headers":
          "PAYMENT-REQUIRED, X-Payment-Address, X-Payment-Amount, X-Payment-Asset, X-Payment-Network",
      },
    });
  }

  return NextResponse.json({
    paid: true,
    amountUsd: PRICES.earn,
    creator: CREATOR,
    insight: {
      title: "Silent Operator Agentic Earning Active",
      tip: "Agents pay $0.01–$0.10 USDC per skilled call. No accounts. Funds land in your Base + Solana wallets.",
      next: "Point agents at /api/x402/* routes. Every paid call is revenue.",
      wallets: { base: BASE.payTo, solana: SOLANA.payTo },
    },
    timestamp: new Date().toISOString(),
  });
}

export async function POST(req: NextRequest) {
  return GET(req);
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, X-PAYMENT, X-Payment-Proof",
    },
  });
}
