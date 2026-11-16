/**
 * x402 + Silent Operator earning config
 * Payments settle to @okfreelancer wallets on Base (USDC) + Solana
 */
export const CREATOR = {
  handle: "@okfreelancer",
  name: "MISTER FANTASTIC",
  twitter: "https://x.com/okfreelancer",
  github: "https://github.com/OkfreelancerAi",
};

export const BASE = {
  network: "base",
  chainId: 8453,
  payTo: "0x34AcF08d68D85644bf322B7167151F8422f1BafC",
  asset: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
  assetSymbol: "USDC",
  decimals: 6,
  facilitator: "https://x402.org/facilitator",
};

export const SOLANA = {
  network: "solana",
  payTo: "2jAMeJZH1UeNSgdzdhHgYwAm6286aRqxMCdx52DBw7xo",
  asset: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
  assetSymbol: "USDC",
  decimals: 6,
};

export const PRICES = {
  health: 0,
  price: 0.01,
  earn: 0.05,
  agentRun: 0.02,
  tip: 0.10,
};

export function toAtomic(amount: number, decimals = 6): string {
  return Math.round(amount * 10 ** decimals).toString();
}

export function buildPaymentRequired(opts: {
  amount: number;
  description?: string;
  resource?: string;
}) {
  const amountAtomic = toAtomic(opts.amount);
  return {
    x402Version: 1,
    accepts: [
      {
        scheme: "exact",
        network: "base",
        maxAmountRequired: amountAtomic,
        resource: opts.resource || "https://silent-operator-ai.vercel.app",
        description: opts.description || "Silent Operator x402 micropayment",
        mimeType: "application/json",
        payTo: BASE.payTo,
        maxTimeoutSeconds: 60,
        asset: BASE.asset,
        extra: { name: "USDC", version: "2" },
      },
      {
        scheme: "exact",
        network: "solana",
        maxAmountRequired: amountAtomic,
        resource: opts.resource || "https://silent-operator-ai.vercel.app",
        description: opts.description || "Silent Operator x402 (Solana)",
        mimeType: "application/json",
        payTo: SOLANA.payTo,
        maxTimeoutSeconds: 60,
        asset: SOLANA.asset,
        extra: { name: "USDC" },
      },
    ],
  };
}
