import Link from "next/link";

const agents = [
  {
    id: "proposal-writer",
    name: "Proposal Writer",
    category: "Sales",
    description: "Transforms client briefs into professional, branded proposals. Supports multiple tones and pricing tables.",
    runs: "2.4k",
    rating: 4.9,
  },
  {
    id: "invoice-chaser",
    name: "Invoice Chaser",
    category: "Finance",
    description: "Automated, polite follow-ups on overdue invoices. Integrates with Stripe, QuickBooks, Xero.",
    runs: "1.8k",
    rating: 4.8,
  },
  {
    id: "lead-qualifier",
    name: "Lead Qualifier",
    category: "Growth",
    description: "Conversational scoring of inbound leads. Books meetings only with high-intent prospects.",
    runs: "3.1k",
    rating: 4.9,
  },
  {
    id: "daily-reporter",
    name: "Daily Reporter",
    category: "Ops",
    description: "Pulls metrics from your tools and delivers a clean morning briefing to Slack or email.",
    runs: "4.2k",
    rating: 4.7,
  },
  {
    id: "follow-up-engine",
    name: "Follow-up Engine",
    category: "Sales",
    description: "Context-aware sequences that feel human. Never drops a warm lead.",
    runs: "2.9k",
    rating: 4.8,
  },
  {
    id: "knowledge-rag",
    name: "Knowledge RAG",
    category: "Internal",
    description: "Private RAG over your company docs. Answers with sources. Zero hallucination mode available.",
    runs: "5.6k",
    rating: 4.9,
  },
  {
    id: "meeting-summarizer",
    name: "Meeting Summarizer",
    category: "Ops",
    description: "Turns Zoom/Meet transcripts into action items, decisions, and follow-ups.",
    runs: "3.7k",
    rating: 4.8,
  },
  {
    id: "content-repurposer",
    name: "Content Repurposer",
    category: "Marketing",
    description: "One long-form piece → LinkedIn posts, email, Twitter threads, short video scripts.",
    runs: "1.5k",
    rating: 4.6,
  },
];

export default function MarketplacePage() {
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
          <Link href="/dashboard" className="text-sm px-4 py-2 rounded-full bg-cyan-500 text-slate-950 font-medium">
            Dashboard
          </Link>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-6 py-16">
        <h1 className="text-4xl font-bold mb-3">Agent Marketplace</h1>
        <p className="text-slate-400 mb-12 max-w-2xl">
          Production-ready, skilled agents. One-click install. Fully agentic and tool-using.
        </p>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {agents.map((agent) => (
            <div
              key={agent.id}
              className="p-6 rounded-2xl bg-white/5 border border-white/10 hover:border-cyan-500/40 transition flex flex-col"
            >
              <div className="flex items-start justify-between mb-3">
                <span className="text-xs font-medium text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded">
                  {agent.category}
                </span>
                <span className="text-xs text-slate-500">{agent.runs} runs</span>
              </div>
              <h3 className="text-lg font-semibold mb-2">{agent.name}</h3>
              <p className="text-sm text-slate-400 flex-1 mb-4">{agent.description}</p>
              <div className="flex items-center justify-between">
                <span className="text-sm text-amber-400">★ {agent.rating}</span>
                <Link
                  href="/dashboard"
                  className="text-sm px-4 py-1.5 rounded-full bg-cyan-500/20 text-cyan-300 hover:bg-cyan-500 hover:text-slate-950 transition font-medium"
                >
                  Install
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
