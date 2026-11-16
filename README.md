# Silent Operator AI

Agentic business automation platform with **x402** micropayments and **MPP session vouchers**.

- Landing page with skilled agents showcase
- Agent Marketplace
- Live Agent Console (dashboard)
- x402 pay-per-call endpoints
- **MPP session vouchers** (deposit once → cumulative off-chain vouchers → settle)

## Payments

### x402 (per-request USDC)

| Route | Price | Notes |
|-------|-------|-------|
| `/api/x402/health` | free | Status + wallets |
| `/api/x402/price` | $0.01 | Sample paid insight |
| `/api/x402/earn` | $0.05 | Earn insight → creator wallets |

Settles to Base + Solana USDC wallets configured in `src/lib/x402.ts`.

### MPP Sessions (metered vouchers)

| Route | Purpose |
|-------|---------|
| `GET/POST /api/mpp/session` | Open / voucher / close / status |
| `GET/POST /api/mpp/skill` | Metered skills billed via session |

**Flow**

```bash
# 1. Open a session (deposit $1 budget)
curl -X POST https://your-app/api/mpp/session \
  -H 'Content-Type: application/json' \
  -d '{"action":"open","depositUsd":1,"payer":"agent-1","unitType":"request"}'

# 2. Call a skill (returns 402 until voucher covers cost)
curl -X POST https://your-app/api/mpp/skill \
  -H 'Content-Type: application/json' \
  -d '{"channelId":"mpp_...","skill":"invoice-nudge","cumulativeUsd":0.001}'

# 3. Close & settle
curl -X POST https://your-app/api/mpp/session \
  -H 'Content-Type: application/json' \
  -d '{"action":"close","channelId":"mpp_..."}'
```

Vouchers are **cumulative** (MPP session semantics): each new voucher must authorize a higher total than the last. The server verifies HMAC signature, monotonicity, and deposit ceiling, then serves the skill.

Production upgrade: replace the HMAC demo signer with `mppx` + Tempo TIP-1034 channels (`tempo.session`) for real on-chain settlement.

## Deploy

Push to `main` triggers production deploy on Vercel.

### Environment variables

```
OPENAI_API_KEY=          # optional LLM
MPP_SESSION_SECRET=      # HMAC secret for session vouchers (required in prod)
```

## Local

```bash
npm install
npm run dev
```

## Stack

- Next.js 16 (App Router)
- Tailwind CSS 4
- TypeScript
- x402 + MPP session payment rails

Built for revenue: skilled agents that get paid per call *and* per session.
