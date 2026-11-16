import Link from "next/link";

export default function EarnPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <nav className="border-b border-white/10">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center font-bold text-sm">SO</div>
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
          x402 live · Base + Solana USDC
        </div>
        <h1 className="text-4xl font-bold mb-4">Easy agentic earning</h1>
        <p className="text-slate-400 text-lg mb-10">
          Agents pay a few cents in USDC per skilled call. No accounts. Funds land in your wallets.
        </p>

        <div className="p-6 rounded-2xl bg-white/5 border border-white/10 mb-10 font-mono text-sm">
          <div className="text-slate-500 mb-2">Base (USDC)</div>
          <div className="break-all mb-4">0x34AcF08d68D85644bf322B7167151F8422f1BafC</div>
          <div className="text-slate-500 mb-2">Solana (USDC)</div>
          <div className="break-all">2jAMeJZH1UeNSgdzdhHgYwAm6286aRqxMCdx52DBw7xo</div>
        </div>

        <h2 className="text-xl font-bold mb-4">Paid endpoints (live on this app)</h2>
        <div className="overflow-x-auto mb-10">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-slate-500 border-b border-white/10">
                <th className="py-2">Path</th>
                <th>Price</th>
                <th>Desc</th>
              </tr>
            </thead>
            <tbody className="text-slate-300">
              <tr className="border-b border-white/5"><td className="py-3"><code>/api/x402/health</code></td><td>Free</td><td>Status + wallets</td></tr>
              <tr className="border-b border-white/5"><td className="py-3"><code>/api/x402/price</code></td><td>$0.01</td><td>Live crypto price (CoinGecko)</td></tr>
              <tr className="border-b border-white/5"><td className="py-3"><code>/api/x402/earn</code></td><td>$0.05</td><td>Earn insight payload</td></tr>
            </tbody>
          </table>
        </div>

        <h2 className="text-xl font-bold mb-4">How agents pay</h2>
        <ol className="space-y-3 text-slate-300 mb-10 list-decimal list-inside">
          <li>Hit a paid route → receive <strong>HTTP 402</strong> + payment requirements</li>
          <li>Sign USDC transferWithAuthorization (Base) or Solana equivalent</li>
          <li>Retry with <code className="text-cyan-300">X-PAYMENT</code> header</li>
          <li>Server verifies → returns data. USDC is already settling to your wallets</li>
        </ol>

        <div className="flex flex-wrap gap-3">
          <a href="/api/x402/health" className="px-4 py-2 rounded-full bg-white/10 hover:bg-white/20 text-sm">Test /health</a>
          <a href="/api/x402/earn" className="px-4 py-2 rounded-full bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 text-sm">Test 402 /earn</a>
          <Link href="/dashboard" className="px-4 py-2 rounded-full bg-cyan-500 text-slate-950 font-medium text-sm">Agent Console</Link>
        </div>
      </div>
    </div>
  );
}
