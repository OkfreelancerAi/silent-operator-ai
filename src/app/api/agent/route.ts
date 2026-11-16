import { NextRequest, NextResponse } from "next/server";

const SYSTEM = `You are Silent Operator, a skilled business automation agent.
You help with proposals, invoice chasing, lead qualification, daily reports, follow-ups, knowledge answers, and agentic workflows.
Be concise, professional, and action-oriented. When drafting emails or proposals, use clear structure and placeholders like [Name].
If the user asks about earning or x402, explain how agents can list skills on the marketplace and accept payments (Stripe or x402/USDC).`;

async function callLLM(message: string): Promise<string | null> {
  const key = process.env.OPENAI_API_KEY || process.env.ANTHROPIC_API_KEY;
  if (!key) return null;

  const base = process.env.OPENAI_BASE_URL || "https://api.openai.com/v1";
  const model = process.env.OPENAI_MODEL || "gpt-4o-mini";

  try {
    const res = await fetch(`${base}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: SYSTEM },
          { role: "user", content: message },
        ],
        temperature: 0.4,
        max_tokens: 800,
      }),
    });

    if (!res.ok) {
      console.error("LLM error", await res.text());
      return null;
    }

    const data = await res.json();
    return data.choices?.[0]?.message?.content?.trim() || null;
  } catch (e) {
    console.error("LLM call failed", e);
    return null;
  }
}

function ruleBased(message: string): string {
  const lower = (message || "").toLowerCase();

  if (lower.includes("invoice") || lower.includes("overdue") || lower.includes("payment") || lower.includes("chase")) {
    return `Invoice Chaser activated.

Draft follow-up:

---
Subject: Friendly reminder – Invoice #INV-2041

Hi [Name],

Hope you are doing well. Just a quick note that invoice #INV-2041 for $2,400 was due on [date] and is still outstanding.

I have attached the invoice again for convenience. If you have already processed this, please disregard. Otherwise, would you mind letting me know if there is any issue on your side?

Happy to jump on a quick call if helpful.

Best,
[Your name]
---

Would you like me to personalize this further or push it to your email tool?`;
  }

  if (lower.includes("proposal") || lower.includes("brief")) {
    return `Proposal Writer ready.

I can generate a full proposal from a short brief. Share:
1. Client name / company
2. Project goal
3. Scope highlights
4. Timeline & budget range
5. Desired tone (formal / consultative / energetic)

Then I will draft the complete document with executive summary, approach, timeline, pricing, and next steps.`;
  }

  if (lower.includes("lead") || lower.includes("qualify")) {
    return `Lead Qualifier online.

I will score the lead on:
- Budget fit
- Authority
- Need urgency
- Timeline

Paste the lead message or LinkedIn profile and I will return a score (1-10) + recommended next action + suggested reply.`;
  }

  if (lower.includes("report") || lower.includes("status")) {
    return `Daily Reporter standing by.

I can synthesize:
- CRM pipeline movement
- Support tickets resolved
- Revenue / invoices
- Key blockers

Connect your data sources (or paste yesterday raw notes) and I will produce a clean morning briefing.`;
  }

  if (lower.includes("x402") || lower.includes("earn") || lower.includes("wurk") || lower.includes("marketplace")) {
    return `Agentic earning is live.

• List your skilled agents on the Marketplace for others to hire.
• Accept Stripe (fiat) or x402 (USDC / crypto) payments for runs.
• x402 uses HTTP 402 Payment Required style flows — perfect for agent-to-agent and micropayments.
• You can also complete jobs on WURK (wurk.fun) and get paid.

Go to /marketplace to install skills or list your own. Want me to draft a service listing for one of your agents?`;
  }

  return `Silent Operator received: "${message}"

I am an agentic workspace with skilled tools for:
• Proposal writing
• Invoice chasing
• Lead qualification
• Status reporting
• Follow-up sequences
• Knowledge RAG
• Agentic earning (Stripe + x402)

Tell me which skill to run, or describe the task and I will pick the best agent.
(Add OPENAI_API_KEY in Vercel for full LLM reasoning + tool use.)`;
}

export async function POST(req: NextRequest) {
  try {
    const { message } = await req.json();
    if (!message || typeof message !== "string") {
      return NextResponse.json({ reply: "Please send a message." }, { status: 400 });
    }

    const llmReply = await callLLM(message);
    if (llmReply) {
      return NextResponse.json({ reply: llmReply, mode: "llm" });
    }

    return NextResponse.json({ reply: ruleBased(message), mode: "rules" });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ reply: "Agent error. Check server logs." }, { status: 500 });
  }
}
