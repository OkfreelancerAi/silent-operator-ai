import { NextRequest, NextResponse } from "next/server";

const PRICES: Record<string, string | undefined> = {
  starter: process.env.STRIPE_PRICE_STARTER,
  growth: process.env.STRIPE_PRICE_GROWTH,
  scale: process.env.STRIPE_PRICE_SCALE,
};

export async function POST(req: NextRequest) {
  try {
    const { plan } = await req.json();
    const secret = process.env.STRIPE_SECRET_KEY;

    if (!secret) {
      return NextResponse.json({
        demo: true,
        message:
          "Stripe not configured. Add STRIPE_SECRET_KEY + price IDs in Vercel env vars. Then this endpoint creates a real Checkout Session.",
        plan: plan || "growth",
      });
    }

    const priceId = PRICES[plan] || PRICES.growth;
    if (!priceId) {
      return NextResponse.json(
        { error: "Price ID not set for plan: " + plan },
        { status: 400 }
      );
    }

    const params = new URLSearchParams();
    params.append("mode", "subscription");
    params.append("success_url", (process.env.NEXT_PUBLIC_APP_URL || "https://silent-operator-ai.vercel.app") + "/dashboard?success=1");
    params.append("cancel_url", (process.env.NEXT_PUBLIC_APP_URL || "https://silent-operator-ai.vercel.app") + "/pricing?canceled=1");
    params.append("line_items[0][price]", priceId);
    params.append("line_items[0][quantity]", "1");

    const res = await fetch("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      headers: {
        Authorization: "Bearer " + secret,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
    });

    const data = await res.json();
    if (!res.ok) {
      console.error(data);
      return NextResponse.json({ error: data.error?.message || "Stripe error" }, { status: 500 });
    }

    return NextResponse.json({ url: data.url, id: data.id });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Checkout failed" }, { status: 500 });
  }
}
