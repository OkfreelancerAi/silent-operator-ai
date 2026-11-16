import { NextRequest, NextResponse } from "next/server";
import { buildPaymentRequired, PRICES, BASE } from "@/lib/x402";

export const dynamic = "force-dynamic";

async function fetchLivePrice(symbol: string) {
  const cgKey = process.env.COINGECKO_PRO_API_KEY;
  const base = process.env.COINGECKO_BASE_URL || "https://pro-api.coingecko.com/api/v3";
  const idMap: Record<string, string> = { eth: "ethereum", btc: "bitcoin", sol: "solana", matic: "matic-network" };
  const id = idMap[symbol.toLowerCase()] || "ethereum";
  try {
    const url = cgKey
      ? `${base}/simple/price?ids=${id}&vs_currencies=usd&include_24hr_change=true&x_cg_pro_api_key=${cgKey}`
      : `https://api.coingecko.com/api/v3/simple/price?ids=${id}&vs_currencies=usd&include_24hr_change=true`;
    const res = await fetch(url, { next: { revalidate: 30 } });
    if (!res.ok) return null;
    const data = await res.json();
    const row = data[id];
    if (!row) return null;
    return { symbol: symbol.toUpperCase(), usd: row.usd, change24h: row.usd_24h_change, source: cgKey ? "coingecko-pro" : "coingecko" };
  } catch {
    return null;
  }
}

export async function GET(req: NextRequest) {
  const payment = req.headers.get("x-payment") || req.headers.get("X-PAYMENT");
  const proof = req.headers.get("x-payment-proof") || req.headers.get("X-Payment-Proof");
  const symbol = req.nextUrl.searchParams.get("symbol") || "eth";

  if (!payment && !proof) {
    const body = buildPaymentRequired({
      amount: PRICES.price,
      description: `Live ${symbol.toUpperCase()} price via Silent Operator x402`,
      resource: "https://silent-operator-ai.vercel.app/api/x402/price",
    });
    return new NextResponse(JSON.stringify(body), {
      status: 402,
      headers: {
        "Content-Type": "application/json",
        "X-Payment-Required": "true",
        "PAYMENT-REQUIRED": Buffer.from(JSON.stringify(body)).toString("base64"),
        "X-Payment-Address": BASE.payTo,
        "X-Payment-Amount": String(Math.round(PRICES.price * 1e6)),
        "X-Payment-Asset": "USDC",
        "X-Payment-Network": "base",
        "Access-Control-Expose-Headers":
          "PAYMENT-REQUIRED, X-Payment-Address, X-Payment-Amount, X-Payment-Asset, X-Payment-Network",
      },
    });
  }

  const live = await fetchLivePrice(symbol);
  return NextResponse.json({
    paid: true,
    price: live || { symbol: symbol.toUpperCase(), usd: null, change24h: null, source: "unavailable" },
    note: "Payment accepted. Settles via x402 to creator wallets.",
    creator: "@okfreelancer",
    timestamp: new Date().toISOString(),
  });
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, X-PAYMENT, X-Payment-Proof",
    },
  });
}
