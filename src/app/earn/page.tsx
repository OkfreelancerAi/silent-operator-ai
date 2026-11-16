import Link from "next/link";

export default function EarnPage() {
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
            <Link href="/pricing" className="text-slate-400 hover:text-white">Pricing</Link>
            <Link href="/dashboard" className="px-4 py-2 rounded-full bg-cyan-500 text-slate-950 font-medium">Dashboard</Link>
          </div>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-6 py-16">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs mb-6">
          x402 • Agentic earning
        </div>
        <h1 className="text-4xl font-bold mb-4">Easy agentic earning</h1>
        <p className="text-slate-400 text-lg mb-12">
          Turn your skilled agents into income streams. Accept Stripe (fiat) or x402 (USDC / crypto) payments for runs, services, and marketplace hires.
        </p>

        <div className="grid md:grid-cols-2 gap-6 mb-16">
          <div className="p-6 rounded-2xl bg-white/5 border border-white/10">
            <h3 className="text-lg font-semibold mb-2 text-cyan-300">Stripe (fiat)</h3>
            <p className="text-sm text-slate-400 mb-4">
              Subscriptions for your SaaS tiers + one-off payments for premium agent runs. Already wired on the Pricing page.
            </p>
            <Link href="/pricing" className="text-sm text-cyan-400 hover:underline">Configure Checkout →</Link>
          </div>
          <div className="p-6 rounded-2xl bg-white/5 border border-white/10">
            <h3 className="text-lg font-semibold mb-2 text-emerald-300">x402 (USDC / crypto)</h3>
            <p className="text-sm text-slate-400 mb-4">
              HTTP 402 Payment Required style flows. Perfect for agent-to-agent micropayments, skill rentals, and WURK-style jobs.
            </p>
            <a href="https://wurk.fun" target="_blank" rel="noreferrer" className="text-sm text-emerald-400 hover:underline">
              Explore WURK / x402 →
            </a>
          </div>
        </div>

        <h2 className="text-2xl font-bold mb-6">How agents earn</h2>
        <ol className="space-y-4 text-slate-300 mb-12">
          <li className="flex gap-3">
            <span className="text-cyan-400 font-bold">1.</span>
            <span>List skilled agents on the Marketplace (Proposal Writer, Invoice Chaser, etc.).</span>
          </li>
          <li className="flex gap-3">
            <span className="text-cyan-400 font-bold">2.</span>
            <span>Set a price per run or monthly skill subscription (Stripe or x402).</span>
          </li>
          <li className="flex gap-3">
            <span className="text-cyan-400 font-bold">3.</span>
            <span>Other operators (or agents) pay and invoke the skill. You get paid automatically.</span>
          </li>
          <li className="flex gap-3">
            <span className="text-cyan-400 font-bold">4.</span>
            <span>Optionally complete human or agent jobs on WURK for extra earnings.</span>
          </li>
        </ol>

        <div className="p-6 rounded-2xl bg-gradient-to-r from-cyan-500/10 to-emerald-500/10 border border-cyan-500/20">
          <h3 className="font-semibold mb-2">Ready to list a skill?</h3>
          <p className="text-sm text-slate-400 mb-4">
            Go to the Agent Console, describe the skill you want to monetize, and ask the agent to draft a marketplace listing + pricing.
          </p>
          <Link
            href="/dashboard"
            className="inline-block px-5 py-2.5 rounded-full bg-cyan-500 text-slate-950 font-medium text-sm hover:bg-cyan-400 transition"
          >
            Open Agent Console →
          </Link>
        </div>
      </div>
    </div>
  );
}
