"use client";

import { useState } from "react";
import Link from "next/link";

export default function DashboardPage() {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<
    { role: "user" | "assistant"; content: string }[]
  >([
    {
      role: "assistant",
      content:
        "Silent Operator online. I can help with proposals, follow-ups, reports, lead qualification, and more. What should we run today?",
    },
  ]);
  const [loading, setLoading] = useState(false);

  async function send() {
    if (!input.trim() || loading) return;
    const userMsg = input.trim();
    setInput("");
    setMessages((m) => [...m, { role: "user", content: userMsg }]);
    setLoading(true);

    try {
      const res = await fetch("/api/agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userMsg }),
      });
      const data = await res.json();
      setMessages((m) => [
        ...m,
        { role: "assistant", content: data.reply || "Agent responded." },
      ]);
    } catch {
      setMessages((m) => [
        ...m,
        {
          role: "assistant",
          content:
            "Demo mode: connect an LLM key (OPENAI_API_KEY or ANTHROPIC_API_KEY) in Vercel env vars for live agent replies. Meanwhile I can still show the full product shell.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col">
      <nav className="border-b border-white/10">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center font-bold text-sm">
              SO
            </div>
            <span className="font-semibold">Silent Operator</span>
          </Link>
          <div className="flex gap-4 text-sm items-center">
            <Link href="/marketplace" className="text-slate-400 hover:text-white">Marketplace</Link>
            <Link href="/earn" className="text-slate-400 hover:text-white">Earn</Link>
            <Link href="/pricing" className="text-slate-400 hover:text-white">Pricing</Link>
            <span className="text-cyan-400">Dashboard</span>
          </div>
        </div>
      </nav>

      <div className="flex-1 max-w-5xl mx-auto w-full px-6 py-8 flex flex-col">
        <div className="mb-6">
          <h1 className="text-2xl font-bold">Agent Console</h1>
          <p className="text-slate-400 text-sm">
            Live agentic workspace. Try: “Write a follow-up email for an overdue invoice of $2,400” or “How can I earn with x402?”
          </p>
        </div>

        <div className="flex-1 overflow-y-auto space-y-4 mb-6 p-4 rounded-2xl bg-white/5 border border-white/10 min-h-[400px]">
          {messages.map((m, i) => (
            <div
              key={i}
              className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[80%] px-4 py-3 rounded-2xl text-sm leading-relaxed ${
                  m.role === "user"
                    ? "bg-cyan-500 text-slate-950"
                    : "bg-white/10 text-slate-200"
                }`}
              >
                {m.content}
              </div>
            </div>
          ))}
          {loading && (
            <div className="text-slate-500 text-sm">Agent thinking…</div>
          )}
        </div>

        <div className="flex gap-3">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && send()}
            placeholder="Ask your Silent Operator…"
            className="flex-1 px-4 py-3 rounded-full bg-white/5 border border-white/10 focus:outline-none focus:border-cyan-500/50 text-sm"
          />
          <button
            onClick={send}
            disabled={loading}
            className="px-6 py-3 rounded-full bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-medium text-sm disabled:opacity-50"
          >
            Run
          </button>
        </div>
      </div>
    </div>
  );
}
