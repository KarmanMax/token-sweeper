import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import {
  Wallet, Sparkles, ArrowRight, CheckCircle2, Zap, Shield, TrendingUp, Globe,
} from "lucide-react"
import WalletConnection from "@/components/wallet-connection"
import TokenPortfolio from "@/components/token-portfolio"
import SwapConfiguration from "@/components/swap-configuration"
import SocialCard from "@/components/social-card"
import EIP7702Info from "@/components/eip-7702-info"
import SweepHistory from "@/components/sweep-history"
import Footer from "@/components/footer"
import { useAccount, useChainId, useCapabilities, useAccountEffect } from "wagmi"
import { Address, Hash } from "viem"
import { useTokenBalances } from "@/hooks/use-token-balances"
import { useOutcomeTokens } from "@/hooks/use-outcome-tokens"
import { useSweepHistory } from "@/hooks/use-sweep-history"
import { ConnectButton } from "@rainbow-me/rainbowkit"
import { getChainName } from "@/lib/config"
import { getTokenSymbolFromAddress } from "@/lib/token-config"
import type { SupportedChainId, SwapResult } from "@/types"
import { APP_CONFIG } from "@/types"

export default function TokenSweeperApp() {
  const { address, status } = useAccount()
  const chainId = useChainId()
  const { data: capabilities } = useCapabilities({ account: address })

  const { tokens, loading, refetch, apiStatus } = useTokenBalances(address, chainId as SupportedChainId)
  const { tokens: outcomeTokens, loading: outcomeTokensLoading } = useOutcomeTokens(chainId as SupportedChainId)
  const { history, addRecord, clearHistory } = useSweepHistory()
  const [selectedTokens, setSelectedTokens] = useState<string[]>([])
  const [outcomeToken, setOutcomeToken] = useState("")
  const [swapStep, setSwapStep] = useState<"select" | "configure" | "execute" | "success">("select")
  const [swapResult, setSwapResult] = useState<SwapResult | null>(null)

  const atomicSupported =
    capabilities?.[chainId]?.atomic?.status === "supported" ||
    capabilities?.[chainId]?.atomic?.status === "ready"

  useEffect(() => {
    if (status === "connected" && address) {
      refetch()
    }
  }, [status, address, chainId])

  useAccountEffect({
    onConnect() {},
    onDisconnect() {
      setSelectedTokens([])
      setOutcomeToken("")
      setSwapResult(null)
      setSwapStep("select")
    },
  })

  useEffect(() => {
    setSelectedTokens([])
    setOutcomeToken("")
    setSwapResult(null)
    setSwapStep("select")
  }, [address])

  const handleTokenSelection = (tokenAddress: string, selected: boolean) => {
    if (selected) {
      setSelectedTokens((prev) => [...prev, tokenAddress])
    } else {
      setSelectedTokens((prev) => prev.filter((addr) => addr !== tokenAddress))
    }
  }

  const handleSelectAll = () => {
    const selectableTokens = tokens.filter((token) => !token.is_spam && token.quote > 0)
    setSelectedTokens(selectableTokens.map((token) => token.contract_address))
  }

  const handleDeselectAll = () => {
    setSelectedTokens([])
  }

  const handlePrepareSwap = () => {
    if (selectedTokens.length > 0 && outcomeToken) {
      setSwapStep("configure")
    }
  }

  const handleExecuteSwap = async (txHash?: string, isAtomic?: boolean) => {
    if (txHash) {
      const totalValue = selectedTokens.reduce((sum, tokenAddr) => {
        const token = tokens.find((t) => t.contract_address === tokenAddr)
        return sum + (token?.quote || 0)
      }, 0)

      const result: SwapResult = {
        tokensSwapped: selectedTokens.length,
        totalValue,
        outcomeToken: outcomeToken as Address,
        chain: getChainName(chainId as SupportedChainId),
        txHash: txHash as Hash,
        chainId: chainId as SupportedChainId,
        isAtomic: isAtomic ?? atomicSupported,
      }

      setSwapResult(result)
      setSwapStep("success")

      addRecord({
        chainId: chainId as SupportedChainId,
        txHash,
        tokensSwept: selectedTokens.length,
        inputValueUsd: totalValue,
        outputTokenSymbol: getTokenSymbolFromAddress(outcomeToken, chainId),
        outputAmount: totalValue * 0.997,
        isAtomic: isAtomic ?? atomicSupported,
      })
    }
  }

  const handleNewSweep = () => {
    setSelectedTokens([])
    setOutcomeToken("")
    setSwapResult(null)
    setSwapStep("select")
    refetch()
  }

  // ── Landing (not connected) ─────────────────────────────────────────────────
  if (status !== "connected") {
    return (
      <div className="min-h-screen bg-background">
        <div className="fixed inset-0 grid-dots pointer-events-none" />

        {/* Header */}
        <header className="relative z-50 border-b border-border/60 bg-background/80 backdrop-blur-sm sticky top-0">
          <div className="container mx-auto px-4 py-3.5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded border border-primary/40 flex items-center justify-center bg-primary/10">
                <Zap className="w-3.5 h-3.5 text-primary" />
              </div>
              <span className="font-display font-bold text-lg tracking-tight">Token Sweeper</span>
            </div>
            <ConnectButton label="Connect" />
          </div>
        </header>

        {/* Hero */}
        <section className="relative container mx-auto px-4 pt-24 pb-20 text-center max-w-4xl">
          <div className="inline-flex items-center gap-2 border border-primary/25 bg-primary/5 rounded px-3 py-1.5 text-xs text-primary font-mono tracking-widest uppercase mb-8">
            <Zap className="w-3 h-3" />
            EIP-7702 Batch Transactions
          </div>

          <h1
            className="font-display text-5xl md:text-7xl font-bold text-foreground mb-6 leading-[1.05] tracking-tight"
            style={{ fontFamily: "'Syne', sans-serif" }}
          >
            Convert Wallet Dust
            <br />
            <span className="text-primary">to USDC</span> in One Click
          </h1>

          <p className="text-muted-foreground text-lg mb-12 max-w-xl mx-auto leading-relaxed">
            Select worthless token fragments, pick your output token, and sweep them all
            in a single atomic transaction. Non-custodial. No deposits.
          </p>

          <WalletConnection />

          <div className="grid grid-cols-3 max-w-xs mx-auto mt-16 border border-border/50 divide-x divide-border/50 rounded overflow-hidden">
            {[
              { value: "7", label: "Chains" },
              { value: "0.3%", label: "Service Fee" },
              { value: "1-click", label: "Batch Sweep" },
            ].map(({ value, label }) => (
              <div key={label} className="py-4 px-2 text-center">
                <div
                  className="font-bold text-xl text-primary"
                  style={{ fontFamily: "'JetBrains Mono', monospace" }}
                >
                  {value}
                </div>
                <div className="text-[10px] text-muted-foreground mt-0.5 tracking-widest uppercase">
                  {label}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* How it works */}
        <section className="relative border-y border-border/50 bg-card/40 py-20">
          <div className="container mx-auto px-4 max-w-4xl">
            <p className="text-center text-xs text-primary font-mono tracking-[0.2em] uppercase mb-3">
              How It Works
            </p>
            <h2 className="font-display text-3xl font-bold text-center mb-14">
              Three steps, one transaction
            </h2>
            <div className="grid md:grid-cols-3 gap-6">
              {[
                {
                  num: "01",
                  icon: Wallet,
                  title: "Connect Wallet",
                  desc: "Connect MetaMask, Coinbase Wallet, or any WalletConnect-compatible wallet. Dust tokens are detected automatically.",
                },
                {
                  num: "02",
                  icon: CheckCircle2,
                  title: "Select & Review",
                  desc: "Pick dust tokens to consolidate. Choose your output token (USDC, WETH, USDT) and review real-time quotes.",
                },
                {
                  num: "03",
                  icon: Sparkles,
                  title: "Sweep",
                  desc: "All approvals and swaps execute in one atomic batch via EIP-7702. Sign once, done.",
                },
              ].map(({ num, icon: Icon, title, desc }) => (
                <div key={num}>
                  <div
                    className="text-5xl font-bold text-primary/10 mb-3 leading-none"
                    style={{ fontFamily: "'Syne', sans-serif" }}
                  >
                    {num}
                  </div>
                  <div className="border border-border/60 rounded p-5 bg-card/60 hover:border-primary/25 transition-colors h-full">
                    <Icon className="w-4 h-4 text-primary mb-3" />
                    <h3 className="font-display font-semibold text-sm mb-2">{title}</h3>
                    <p className="text-muted-foreground text-sm leading-relaxed">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Supported Chains */}
        <section className="relative py-20">
          <div className="container mx-auto px-4 max-w-4xl">
            <p className="text-center text-xs text-primary font-mono tracking-[0.2em] uppercase mb-3">
              Networks
            </p>
            <h2 className="font-display text-3xl font-bold text-center mb-3">Supported Chains</h2>
            <p className="text-muted-foreground text-center text-sm mb-10">
              Best price aggregated across all major DEXs on each chain
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-3">
              {(["Ethereum", "Base", "Arbitrum", "Optimism", "Polygon", "BNB Chain", "Avalanche"] as const).map(
                (name) => (
                  <div
                    key={name}
                    className="flex flex-col items-center gap-2 p-3 border border-border/60 rounded hover:border-primary/35 hover:bg-primary/5 transition-all group"
                  >
                    <div
                      className="w-9 h-9 border border-border/60 rounded flex items-center justify-center text-xs font-bold text-muted-foreground group-hover:text-primary group-hover:border-primary/40 transition-colors"
                      style={{ fontFamily: "'JetBrains Mono', monospace" }}
                    >
                      {name.slice(0, 2).toUpperCase()}
                    </div>
                    <span className="text-[10px] font-medium text-muted-foreground group-hover:text-foreground transition-colors text-center leading-tight">
                      {name}
                    </span>
                  </div>
                )
              )}
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="relative border-y border-border/50 bg-card/30 py-20">
          <div className="container mx-auto px-4 max-w-4xl">
            <p className="text-center text-xs text-primary font-mono tracking-[0.2em] uppercase mb-3">
              Benefits
            </p>
            <h2 className="font-display text-3xl font-bold text-center mb-12">Why Token Sweeper?</h2>
            <div className="grid md:grid-cols-2 gap-4">
              {[
                {
                  icon: Shield,
                  accent: "text-emerald-400",
                  bg: "bg-emerald-500/10 border-emerald-500/20",
                  title: "Self-Custody",
                  desc: "No deposits. No accounts. Your tokens never leave your wallet until the swap executes on-chain.",
                },
                {
                  icon: Zap,
                  accent: "text-amber-400",
                  bg: "bg-amber-500/10 border-amber-500/20",
                  title: "Gas Efficient",
                  desc: "EIP-7702 batches all swaps into one transaction, saving 50%+ on gas vs individual swaps.",
                },
                {
                  icon: TrendingUp,
                  accent: "text-sky-400",
                  bg: "bg-sky-500/10 border-sky-500/20",
                  title: "Best Prices",
                  desc: "DEX aggregation across Uniswap, Aerodrome, Curve, and more for optimal swap rates.",
                },
                {
                  icon: Globe,
                  accent: "text-indigo-400",
                  bg: "bg-indigo-500/10 border-indigo-500/20",
                  title: "Multi-Chain",
                  desc: "Clean up dust across 7 chains from one interface. Switch chains instantly in your wallet.",
                },
              ].map(({ icon: Icon, accent, bg, title, desc }) => (
                <div
                  key={title}
                  className="border border-border/60 rounded p-5 bg-card/60 hover:border-border transition-colors"
                >
                  <div className="flex items-start gap-4">
                    <div className={`border rounded p-2 flex-shrink-0 ${bg}`}>
                      <Icon className={`w-4 h-4 ${accent}`} />
                    </div>
                    <div>
                      <h3 className="font-display font-semibold text-sm mb-1">{title}</h3>
                      <p className="text-muted-foreground text-sm leading-relaxed">{desc}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="relative py-20">
          <div className="container mx-auto px-4 max-w-2xl">
            <p className="text-center text-xs text-primary font-mono tracking-[0.2em] uppercase mb-3">FAQ</p>
            <h2 className="font-display text-3xl font-bold text-center mb-12">Common Questions</h2>
            <div className="border border-border/60 rounded divide-y divide-border/60 overflow-hidden">
              {[
                {
                  q: "What are dust tokens?",
                  a: "Small token balances left over from airdrops, failed transactions, or partial swaps. Too small to swap individually due to gas costs, but they clutter your wallet.",
                },
                {
                  q: "How does batch execution work?",
                  a: "EIP-7702 lets your regular wallet act as a smart account temporarily. All approvals and swaps bundle into one transaction. If any swap fails, the entire batch reverts.",
                },
                {
                  q: "What's the fee?",
                  a: "A flat 0.3% service fee on the output amount. No hidden charges. Gas is paid separately by you.",
                },
                {
                  q: "What if my wallet doesn't support EIP-7702?",
                  a: "You can still use Token Sweeper. You'll sign each swap individually instead of in a batch. MetaMask, Coinbase Wallet, and Trust Wallet already support EIP-7702.",
                },
                {
                  q: "Is my wallet safe?",
                  a: "Token Sweeper is fully non-custodial. We never hold your tokens. All swaps execute on-chain through audited DEX routers.",
                },
              ].map(({ q, a }) => (
                <div key={q} className="px-5 py-4 hover:bg-card/60 transition-colors">
                  <h3 className="font-display font-semibold text-sm mb-1.5">{q}</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">{a}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="relative border-t border-border/50 bg-card/30 py-20">
          <div className="container mx-auto px-4 text-center max-w-md">
            <h2 className="font-display text-3xl font-bold mb-3">Ready to clean up?</h2>
            <p className="text-muted-foreground text-sm mb-8">Connect your wallet to get started. No account needed.</p>
            <WalletConnection />
          </div>
        </section>

        <EIP7702Info />
        <Footer />
      </div>
    )
  }

  // ── Success screen ──────────────────────────────────────────────────────────
  if (swapStep === "success" && swapResult) {
    return (
      <div className="min-h-screen bg-background relative">
        <div className="fixed inset-0 grid-dots pointer-events-none" />
        <div className="relative container mx-auto px-4 py-20">
          <div className="max-w-xl mx-auto text-center">
            <div className="w-16 h-16 rounded-full border border-emerald-500/40 bg-emerald-500/10 flex items-center justify-center mx-auto mb-8">
              <CheckCircle2 className="w-8 h-8 text-emerald-400" />
            </div>
            <p className="text-xs text-primary font-mono tracking-[0.2em] uppercase mb-3">
              Transaction Complete
            </p>
            <h1 className="font-display text-4xl font-bold mb-3">Wallet Dust Cleared</h1>
            <p className="text-muted-foreground mb-10">Your tokens have been successfully consolidated.</p>
            <SocialCard result={swapResult} />
            <div className="mt-8">
              <Button
                onClick={handleNewSweep}
                size="lg"
                className="gap-2 font-semibold bg-primary text-primary-foreground hover:bg-primary/90 glow-primary-sm"
              >
                <Sparkles className="w-4 h-4" />
                New Sweep
              </Button>
            </div>
          </div>
        </div>
        <Footer />
      </div>
    )
  }

  // ── Main app (connected) ────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-background">
      <div className="fixed inset-0 grid-dots-sm pointer-events-none opacity-60" />

      {/* Header */}
      <header className="relative z-50 border-b border-border/60 bg-background/90 backdrop-blur-sm sticky top-0">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded border border-primary/40 flex items-center justify-center bg-primary/10">
              <Zap className="w-3 h-3 text-primary" />
            </div>
            <span className="font-display font-bold text-base tracking-tight">Token Sweeper</span>
          </div>
          <ConnectButton showBalance={false} />
        </div>
        <div className="border-t border-border/40 bg-card/40">
          <div className="container mx-auto px-4 py-1.5 flex items-center justify-between">
            <div className="flex items-center gap-3 text-xs">
              <Globe className="w-3 h-3 text-muted-foreground" />
              <span className="text-muted-foreground">
                Network:{" "}
                <span
                  className="text-foreground font-medium"
                  style={{ fontFamily: "'JetBrains Mono', monospace" }}
                >
                  {getChainName(chainId as SupportedChainId)}
                </span>
              </span>
              {tokens.length > 0 && (
                <>
                  <span className="text-border">·</span>
                  <span
                    className="text-primary"
                    style={{ fontFamily: "'JetBrains Mono', monospace" }}
                  >
                    {tokens.filter((t) => !t.is_spam && t.quote > 0).length} sweepable tokens
                  </span>
                </>
              )}
            </div>
            <span className="text-xs text-muted-foreground hidden sm:block">
              Switch chain in wallet to sweep other networks
            </span>
          </div>
        </div>
      </header>

      <main className="relative container mx-auto px-4 py-8">
        {/* Non-atomic warning */}
        {!atomicSupported && (
          <div className="mb-6 border border-amber-500/25 bg-amber-500/5 rounded p-4 flex items-start gap-3">
            <Sparkles className="w-4 h-4 text-amber-400 mt-0.5 flex-shrink-0" />
            <div>
              <h3 className="font-display font-semibold text-amber-300 text-sm mb-1">
                Individual Transactions Mode
              </h3>
              <p className="text-amber-400/70 text-xs leading-relaxed mb-3">
                Your wallet doesn&apos;t support batch transactions yet. You can still sweep tokens
                by signing each swap individually, or upgrade to a smart account for one-click batch
                transactions.
              </p>
              <Button
                size="sm"
                variant="outline"
                className="border-amber-500/30 text-amber-400 hover:bg-amber-500/10 text-xs h-7 bg-transparent"
              >
                Learn More About EIP-7702
              </Button>
            </div>
          </div>
        )}

        {swapStep === "select" && (
          <div className="grid lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <TokenPortfolio
                tokens={tokens}
                loading={loading}
                selectedTokens={selectedTokens}
                onTokenSelect={handleTokenSelection}
                onSelectAll={handleSelectAll}
                onDeselectAll={handleDeselectAll}
                apiStatus={apiStatus}
                chainId={chainId as SupportedChainId}
              />
            </div>

            <div className="space-y-5">
              {/* Sweep Summary */}
              <div className="border border-border/70 rounded bg-card overflow-hidden">
                <div className="px-4 py-3 border-b border-border/60 flex items-center justify-between">
                  <span className="font-display font-semibold text-sm">Sweep Summary</span>
                  <span
                    className="text-xs text-muted-foreground"
                    style={{ fontFamily: "'JetBrains Mono', monospace" }}
                  >
                    {selectedTokens.length} selected
                  </span>
                </div>
                <div className="p-4 space-y-4">
                  <div>
                    <label className="text-[10px] text-muted-foreground font-mono uppercase tracking-widest mb-2 block">
                      Receive Token
                    </label>
                    <select
                      value={outcomeToken}
                      onChange={(e) => setOutcomeToken(e.target.value)}
                      className="w-full px-3 py-2 bg-background border border-border/70 rounded text-sm focus:outline-none focus:border-primary/50 text-foreground"
                      style={{ fontFamily: "'JetBrains Mono', monospace" }}
                      disabled={outcomeTokensLoading}
                    >
                      <option value="" className="bg-[#0a0e18]">
                        {outcomeTokensLoading ? "Loading tokens..." : "Select token..."}
                      </option>
                      {outcomeTokens.map((token) => (
                        <option key={token.address} value={token.address} className="bg-[#0a0e18]">
                          {token.symbol} — {token.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="text-xs space-y-2 border border-border/40 rounded p-3 bg-background/60">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Slippage</span>
                      <span
                        className="text-foreground"
                        style={{ fontFamily: "'JetBrains Mono', monospace" }}
                      >
                        {(APP_CONFIG.SLIPPAGE_TOLERANCE * 100).toFixed(1)}%
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Batch Support</span>
                      <span
                        className={atomicSupported ? "text-emerald-400" : "text-amber-400"}
                        style={{ fontFamily: "'JetBrains Mono', monospace" }}
                      >
                        {atomicSupported ? "Available" : "Upgrade Req."}
                      </span>
                    </div>
                  </div>

                  <Separator className="bg-border/40" />

                  <Button
                    onClick={handlePrepareSwap}
                    disabled={selectedTokens.length === 0 || !outcomeToken}
                    className="w-full font-semibold gap-2 bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-30"
                    size="lg"
                  >
                    Prepare Swap
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              <SweepHistory history={history} onClear={clearHistory} />
            </div>
          </div>
        )}

        {(swapStep === "configure" || swapStep === "execute") && (
          <SwapConfiguration
            selectedTokens={selectedTokens}
            tokens={tokens}
            outcomeToken={outcomeToken}
            onExecute={handleExecuteSwap}
            onBack={() => setSwapStep("select")}
            executing={swapStep === "execute"}
            atomicSupported={atomicSupported}
            chainId={chainId as SupportedChainId}
          />
        )}
      </main>

      <Footer />
    </div>
  )
}
