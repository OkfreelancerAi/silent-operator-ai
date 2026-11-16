import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-white">
      {/* Nav */}
      <nav className="border-b border-white/10 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center font-bold text-sm">
              SO
            </div>
            <span className="font-semibold tracking-tight">Silent Operator</span>
          </div>
          <div className="hidden md:flex items-center gap-8 text-sm text-slate-300">
            <Link href="#agents" className="hover:text-white transition">Agents</Link>
            <Link href="/marketplace" className="hover:text-white transition">Marketplace</Link>
            <Link href="#pricing" className="hover:text-white transition">Pricing</Link>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard"
              className="text-sm px-4 py-2 rounded-full border border-white/20 hover:bg-white/10 transition"
            >
              Dashboard
            </Link>
            <Link
              href="/dashboard"
              className="text-sm px-4 py-2 rounded-full bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-medium transition"
            >
              Start Free
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-6 pt-24 pb-20 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-300 text-xs mb-6">
          <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
          Agentic AI • Live on Vercel
        </div>
        <h1 className="text-5xl md:text-7xl font-bold tracking-tight leading-[1.1] mb-6">
          Your business
          <br />
          <span className="bg-gradient-to-r from-cyan-400 via-blue-400 to-violet-400 bg-clip-text text-transparent">
            runs itself
          </span>
        </h1>
        <p className="text-xl text-slate-400 max-w-2xl mx-auto mb-10">
          Deploy skilled AI agents that write proposals, chase invoices, qualify leads,
          and generate reports — while you sleep. Marketplace of ready-to-use agent skills.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/dashboard"
            className="px-8 py-4 rounded-full bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold text-lg transition shadow-lg shadow-cyan-500/25"
          >
            Launch Agents →
          </Link>
          <Link
            href="/marketplace"
            className="px-8 py-4 rounded-full border border-white/20 hover:bg-white/5 font-medium text-lg transition"
          >
            Explore Marketplace
          </Link>
        </div>
      </section>

      {/* Social proof / stats */}
      <section className="max-w-6xl mx-auto px-6 py-12">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
          {[
            { value: "20h+", label: "Saved / week" },
            { value: "40+", label: "Businesses live" },
            { value: "12", label: "Skilled agents" },
            { value: "94%", label: "Retention" },
          ].map((stat) => (
            <div key={stat.label} className="p-6 rounded-2xl bg-white/5 border border-white/10">
              <div className="text-3xl font-bold text-cyan-400">{stat.value}</div>
              <div className="text-sm text-slate-400 mt-1">{stat.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Agents showcase */}
      <section id="agents" className="max-w-6xl mx-auto px-6 py-20">
        <h2 className="text-3xl font-bold text-center mb-4">Trendy skilled agents</h2>
        <p className="text-slate-400 text-center mb-12 max-w-xl mx-auto">
          Pre-built, production-ready agent skills. One-click deploy. Fully agentic.
        </p>
        <div className="grid md:grid-cols-3 gap-6">
          {[
            {
              title: "Proposal Writer",
              desc: "Turns briefs into polished proposals in seconds. Tone-matched to your brand.",
              badge: "Sales",
            },
            {
              title: "Invoice Chaser",
              desc: "Politely follows up on overdue invoices. Logs everything to your CRM.",
              badge: "Finance",
            },
            {
              title: "Lead Qualifier",
              desc: "Scores inbound leads, asks the right questions, books qualified meetings.",
              badge: "Growth",
            },
            {
              title: "Daily Reporter",
              desc: "Pulls data from tools and writes a clean status report every morning.",
              badge: "Ops",
            },
            {
              title: "Follow-up Engine",
              desc: "Never let a conversation die. Smart, human-sounding sequences.",
              badge: "Sales",
            },
            {
              title: "Knowledge RAG",
              desc: "Answers team questions from your docs, Notion, Drive — zero hallucination mode.",
              badge: "Internal",
            },
          ].map((agent) => (
            <div
              key={agent.title}
              className="p-6 rounded-2xl bg-white/5 border border-white/10 hover:border-cyan-500/40 transition group"
            >
              <div className="text-xs font-medium text-cyan-400 mb-3">{agent.badge}</div>
              <h3 className="text-lg font-semibold mb-2 group-hover:text-cyan-300 transition">
                {agent.title}
              </h3>
              <p className="text-sm text-slate-400 leading-relaxed">{agent.desc}</p>
            </div>
          ))}
        </div>
        <div className="text-center mt-10">
          <Link
            href="/marketplace"
            className="text-cyan-400 hover:text-cyan-300 font-medium"
          >
            View full marketplace →
          </Link>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="max-w-6xl mx-auto px-6 py-20">
        <h2 className="text-3xl font-bold text-center mb-12">Simple pricing</h2>
        <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
          {[
            {
              name: "Starter",
              price: "$49",
              features: ["2 active agents", "1,000 runs / mo", "Email support"],
            },
            {
              name: "Growth",
              price: "$199",
              features: ["Unlimited agents", "10,000 runs / mo", "Priority + marketplace"],
              popular: true,
            },
            {
              name: "Scale",
              price: "$499",
              features: ["Custom agents", "Unlimited runs", "Dedicated success"],
            },
          ].map((tier) => (
            <div
              key={tier.name}
              className={`p-8 rounded-2xl border ${
                tier.popular
                  ? "bg-cyan-500/10 border-cyan-500/50 relative"
                  : "bg-white/5 border-white/10"
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
              <Link
                href="/dashboard"
                className={`block text-center py-3 rounded-full font-medium transition ${
                  tier.popular
                    ? "bg-cyan-500 hover:bg-cyan-400 text-slate-950"
                    : "border border-white/20 hover:bg-white/10"
                }`}
              >
                Get started
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/10 mt-20">
        <div className="max-w-6xl mx-auto px-6 py-10 flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-slate-500">
          <div>© 2026 Silent Operator. Built for operators who ship.</div>
          <div className="flex gap-6">
            <Link href="/marketplace">Marketplace</Link>
            <Link href="/dashboard">Dashboard</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
