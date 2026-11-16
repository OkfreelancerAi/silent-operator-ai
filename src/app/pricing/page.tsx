"use client";

import { useState } from "react";
import Link from "next/link";

const tiers = [
  {
    id: "starter",
    name: "Starter",
    price: "$49",
    features: ["2 active agents", "1,000 runs / mo", "Email support", "Marketplace access"],
  },
  {
    id: "growth",
    name: "Growth",
    price: "$199",
    features: ["Unlimited agents", "10,000 runs / mo", "Priority support", "x402 + Stripe payments", "Full marketplace"],
    popular: true,
  },
  {
    id: "scale",
    name: "Scale",
    price: "$499",
    features: ["Custom agents", "Unlimited runs", "Dedicated success", "White-label options", "Agent earning tools"],
  },
];

export default function PricingPage() {
  const [loading, setLoading] = useState<string | null>(null);
  const [msg, setMsg] = useState("");

  async function checkout(plan: string) {
    setLoading(plan);
    setMsg("");
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
        return;
      }
      if (data.demo) {
        setMsg(data.message + " Plan selected: " + data.plan);
      } else {
        setMsg(data.error || "Checkout unavailable");
      }
    } catch {
      setMsg("Network error");
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <nav className="border-b border-white/10">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center font-bold text-sm">
              SO
            </div>
            <span className="font-semibold">Silent Operator</span>
          </Link>
          <div className="flex gap-4 text-sm">
            <Link href="/marketplace" className="text-slate-400 hover:text-white">Marketplace</Link>
            <Link href="/earn" className="text-slate-400 hover:text-white">Earn</Link>
            <Link href="/dashboard" className="px-4 py-2 rounded-full bg-cyan-500 text-slate-950 font-medium">Dashboard</Link>
          </div>
        </div>
      </nav>

      <div className="max-w-5xl mx-auto px-6 py-16">
        <h1 className="text-4xl font-bold text-center mb-3">Simple, revenue-ready pricing</h1>
        <p className="text-slate-400 text-center mb-12">Stripe Checkout ready. Add your keys and go live.</p>

        {msg && (
          <div className="mb-8 p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-sm text-center">
            {msg}
          </div>
        )}

        <div className="grid md:grid-cols-3 gap-6">
          {tiers.map((tier) => (
            <div
              key={tier.id}
              className={`p-8 rounded-2xl border ${
                tier.popular ? "bg-cyan-500/10 border-cyan-500/50 relative" : "bg-white/5 border-white/10"
              }`}
            >
              {tier.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-cyan-500 text-slate-950 text-xs font-semibold">
                  Most popular
                </div>
              )}
              <div className="text-sm text-slate-400 mb-1">{tier.name}</div>
              <div className="text-4xl font-bold mb-6">
                {tier.price}
                <span className="text-base font-normal text-slate-400">/mo</span>
              </div>
              <ul className="space-y-3 mb-8">
                {tier.features.map((f) => (
                  <li key={f} className="flex items-center gap-2 text-sm text-slate-300">
                    <span className="text-cyan-400">✓</span> {f}
                  </li>
                ))}
              </ul>
              <button
                onClick={() => checkout(tier.id)}
                disabled={!!loading}
                className={`w-full py-3 rounded-full font-medium transition ${
                  tier.popular
                    ? "bg-cyan-500 hover:bg-cyan-400 text-slate-950"
                    : "border border-white/20 hover:bg-white/10"
                } disabled:opacity-50`}
              >
                {loading === tier.id ? "Redirecting…" : "Start with Stripe"}
              </button>
            </div>
          ))}
        </div>

        <p className="text-center text-slate-500 text-sm mt-10">
          Also supports x402 (USDC) micropayments for agent runs — see the Earn page.
        </p>
      </div>
    </div>
  );
}
