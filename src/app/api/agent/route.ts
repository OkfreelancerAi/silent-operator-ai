import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { message } = await req.json();

    // Placeholder skilled agent logic.
    // In production: wire Vercel AI SDK + tools (email, CRM, Stripe, etc.)
    // or LangGraph / CrewAI multi-agent.

    const lower = (message || "").toLowerCase();

    let reply =
      "Understood. I’m ready to execute. Connect OPENAI_API_KEY or ANTHROPIC_API_KEY in your Vercel project environment variables to enable full LLM reasoning + tool use.";

    if (lower.includes("invoice") || lower.includes("overdue") || lower.includes("payment")) {
      reply = `Invoice Chaser activated.

Draft follow-up:

---
Subject: Friendly reminder – Invoice #INV-2041

Hi [Name],

Hope you’re doing well. Just a quick note that invoice #INV-2041 for $2,400 was due on [date] and is still outstanding.

I’ve attached the invoice again for convenience. If you’ve already processed this, please disregard. Otherwise, would you mind letting me know if there’s any issue on your side?

Happy to jump on a quick call if helpful.

Best,
[Your name]
---

Would you like me to personalize this further or push it to your email tool?`;
    } else if (lower.includes("proposal") || lower.includes("brief")) {
      reply = `Proposal Writer ready.

I can generate a full proposal from a short brief. Share:
1. Client name / company
2. Project goal
3. Scope highlights
4. Timeline & budget range
5. Desired tone (formal / consultative / energetic)

Then I’ll draft the complete document with executive summary, approach, timeline, pricing, and next steps.`;
    } else if (lower.includes("lead") || lower.includes("qualify")) {
      reply = `Lead Qualifier online.

I’ll score the lead on:
- Budget fit
- Authority
- Need urgency
- Timeline

Paste the lead’s message or LinkedIn profile and I’ll return a score (1-10) + recommended next action + suggested reply.`;
    } else if (lower.includes("report") || lower.includes("status")) {
      reply = `Daily Reporter standing by.

I can synthesize:
- CRM pipeline movement
- Support tickets resolved
- Revenue / invoices
- Key blockers

Connect your data sources (or paste yesterday’s raw notes) and I’ll produce a clean morning briefing.`;
    } else {
      reply = `Silent Operator received: “${message}”

I’m an agentic workspace with skilled tools for:
• Proposal writing
• Invoice chasing
• Lead qualification
• Status reporting
• Follow-up sequences
• Knowledge RAG

Tell me which skill to run, or describe the task and I’ll pick the best agent.`;
    }

    return NextResponse.json({ reply });
  } catch (e) {
    return NextResponse.json(
      { reply: "Agent error. Check server logs." },
      { status: 500 }
    );
  }
}
