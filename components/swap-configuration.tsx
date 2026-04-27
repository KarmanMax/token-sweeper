import { useEffect, useMemo, useRef, useState } from "react";
import type { SwapCall } from "@/types";
import type { Token, SupportedChainId, SwapQuote } from "@/types";
import { APP_CONFIG, FEE_CONFIG } from "@/types";

const MAX_BATCH_CALLS = 10
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  ArrowLeft,
  ArrowRight,
  Loader2,
  TrendingUp,
  Shield,
  Zap,
  Info,
} from "lucide-react";
import { useSendCalls, useAccount, useWaitForCallsStatus } from "wagmi";
import { useSwapQuotes } from "@/hooks/use-swap-quotes";
import { useSwapBuilder } from "@/hooks/use-swap-builder";
import {
  getTokenSymbolFromAddress,
  getTokenLogoFromAddress,
} from "@/lib/token-config";
import { formatTokenAmount, formatUsdValue, getTokenLogoUrl } from "@/lib/utils";

interface SwapConfigurationProps {
  selectedTokens: string[];
  tokens: Token[];
  outcomeToken: string;
  onExecute: (txHash?: string, isAtomic?: boolean) => void;
  onBack: () => void;
  executing: boolean;
  atomicSupported: boolean;
  chainId: SupportedChainId;
}

export default function SwapConfiguration({
  selectedTokens,
  tokens,
  outcomeToken,
  onExecute,
  onBack,
  executing,
  atomicSupported,
  chainId,
}: SwapConfigurationProps) {
  const { address } = useAccount();
  const { quotes, loading: quotesLoading, fetchQuotes } = useSwapQuotes();
  const {
    sendCalls,
    data: callsId,
    isPending: sendingCalls,
    error: sendCallsError,
  } = useSendCalls();
  const {
    buildSwapCalls,
    loading: buildingCalls,
    error: buildError,
  } = useSwapBuilder();

  const pendingBatchesRef = useRef<SwapCall[][]>([])
  const currentBatchIdxRef = useRef(0)
  const completedTxHashesRef = useRef<string[]>([])
  const [batchProgress, setBatchProgress] = useState<{ current: number; total: number } | null>(null)

  const callsIdString = typeof callsId === "string" ? callsId : callsId?.id;
  const {
    data: callsStatus,
    isLoading: isWaitingForCalls,
    isError: callsError,
  } = useWaitForCallsStatus({ id: callsIdString });

  const selectedTokensData = useMemo(
    () => tokens.filter((token) => selectedTokens.includes(token.contract_address)),
    [tokens, selectedTokens]
  );

  const stableTokensKey = useMemo(
    () => selectedTokens.sort().join(","),
    [selectedTokens]
  );

  const stableBalancesKey = useMemo(
    () =>
      selectedTokensData
        .map((t) => `${t.contract_address}:${t.balance}`)
        .sort()
        .join(","),
    [selectedTokensData]
  );

  useEffect(() => {
    if (outcomeToken && selectedTokens.length > 0) {
      fetchQuotes(selectedTokens, tokens, outcomeToken, chainId);
    }
  }, [stableTokensKey, stableBalancesKey, outcomeToken, chainId, fetchQuotes, selectedTokens, tokens]);

  const totalInputValue = useMemo(
    () => selectedTokensData.reduce((sum, token) => sum + token.quote, 0),
    [selectedTokensData]
  );

  const totalOutputValue = useMemo(
    () =>
      Object.values(quotes).reduce(
        (sum: number, quote: SwapQuote) => sum + (quote.output?.amount || 0),
        0
      ),
    [quotes]
  );

  const totalOutputValueUsd = useMemo(
    () =>
      Object.values(quotes).reduce(
        (sum: number, quote: SwapQuote) => sum + (quote.output?.value_usd || 0),
        0
      ),
    [quotes]
  );

  const estimatedFeeUsd = totalInputValue * FEE_CONFIG.PERCENTAGE;

  const handleExecuteSwap = async () => {
    if (!address) {
      alert("Wallet not connected");
      return;
    }
    if (buildingCalls || sendingCalls) return;
    try {
      const calls = await buildSwapCalls(
        selectedTokens,
        tokens,
        outcomeToken,
        chainId,
        address,
        quotes
      );
      if (calls.length === 0) {
        throw new Error("No valid swap calls could be built");
      }

      const batches: SwapCall[][] = []
      for (let i = 0; i < calls.length; i += MAX_BATCH_CALLS) {
        batches.push(calls.slice(i, i + MAX_BATCH_CALLS))
      }
      pendingBatchesRef.current = batches
      currentBatchIdxRef.current = 0
      completedTxHashesRef.current = []
      setBatchProgress({ current: 1, total: batches.length })
      sendCalls({ calls: batches[0], experimental_fallback: true });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
      console.error("Error executing swap:", error);
      alert(`Failed to execute swap: ${errorMessage}`);
    }
  };

  useEffect(() => {
    if (sendCallsError) {
      setBatchProgress(null)
    }
  }, [sendCallsError])

  useEffect(() => {
    if (callsStatus) {
      if (callsStatus?.status === "success") {
        const txHash = callsStatus.receipts?.[0]?.transactionHash ?? callsIdString ?? ""
        completedTxHashesRef.current.push(txHash)

        const nextIdx = currentBatchIdxRef.current + 1
        if (nextIdx < pendingBatchesRef.current.length) {
          currentBatchIdxRef.current = nextIdx
          setBatchProgress({ current: nextIdx + 1, total: pendingBatchesRef.current.length })
          sendCalls({ calls: pendingBatchesRef.current[nextIdx], experimental_fallback: true })
        } else {
          setBatchProgress(null)
          onExecute(completedTxHashesRef.current[0], atomicSupported)
        }
      } else if (callsStatus?.status !== "pending") {
        console.error("Batch transaction failed:", callsStatus);
        setBatchProgress(null)
        alert("Batch transaction failed. Please try again.");
      }
    }
    if (callsError) {
      console.error("Error waiting for batch transaction:", callsError);
      setBatchProgress(null)
      alert("Error monitoring transaction. Please check your wallet.");
    }
  }, [callsStatus, callsError, callsIdString, onExecute, atomicSupported, sendCalls]);

  // ── Executing / waiting state ───────────────────────────────────────────────
  if (executing || sendingCalls || isWaitingForCalls || batchProgress !== null) {
    return (
      <div className="max-w-md mx-auto">
        <div className="border border-border/70 rounded bg-card p-10 text-center">
          <div className="w-14 h-14 rounded-full border border-primary/30 bg-primary/5 flex items-center justify-center mx-auto mb-6">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
          <p className="text-xs text-primary font-mono tracking-[0.2em] uppercase mb-2">Processing</p>
          <h2 className="font-display text-xl font-bold mb-3">Executing Swap</h2>
          <p className="text-muted-foreground text-sm">
            {sendingCalls
              ? `Please confirm batch${batchProgress && batchProgress.total > 1 ? ` ${batchProgress.current}/${batchProgress.total}` : ""} in your wallet...`
              : isWaitingForCalls
              ? `Waiting for on-chain confirmation${batchProgress && batchProgress.total > 1 ? ` (${batchProgress.current}/${batchProgress.total})` : ""}...`
              : "Processing batch transaction..."}
          </p>
          {(sendCallsError || buildError || callsError) && (
            <div className="mt-5 p-3 border border-destructive/30 bg-destructive/5 rounded text-left">
              <p className="text-destructive text-xs font-mono">
                {sendCallsError?.message ||
                  buildError ||
                  (callsError ? "Transaction monitoring error" : "")}
              </p>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── Review screen ───────────────────────────────────────────────────────────
  return (
    <div className="max-w-4xl mx-auto space-y-5">
      {/* Nav */}
      <div className="flex items-center gap-4">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>
        <h1 className="font-display text-2xl font-bold">Review Swap</h1>
      </div>

      <div className="grid lg:grid-cols-5 gap-5">
        {/* Swap details */}
        <div className="lg:col-span-3 space-y-4">
          <div className="border border-border/70 rounded bg-card overflow-hidden">
            <div className="px-4 py-3 border-b border-border/60">
              <span className="font-display font-semibold text-sm">Swap Details</span>
            </div>
            <div className="divide-y divide-border/30">
              {quotesLoading
                ? selectedTokensData.map((token) => (
                    <div
                      key={token.contract_address}
                      className="flex items-center justify-between px-4 py-3"
                    >
                      <div className="flex items-center gap-3">
                        <img
                          src={getTokenLogoUrl(token, chainId)}
                          alt={token.contract_name}
                          className="w-7 h-7 rounded-full border border-border/40"
                        />
                        <div>
                          <div
                            className="text-sm font-semibold"
                            style={{ fontFamily: "'JetBrains Mono', monospace" }}
                          >
                            {token.contract_ticker_symbol}
                          </div>
                          <div className="text-xs text-muted-foreground font-mono">
                            {formatTokenAmount(Number(token.balance), token.contract_decimals)}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <ArrowRight className="w-3.5 h-3.5 text-muted-foreground" />
                        <div className="h-3 bg-border/50 rounded w-20 animate-pulse" />
                      </div>
                    </div>
                  ))
                : selectedTokensData.map((token) => {
                    const quote = quotes[token.contract_address];
                    return (
                      <div
                        key={token.contract_address}
                        className="flex items-center justify-between px-4 py-3 min-w-0"
                      >
                        {/* Input token */}
                        <div className="flex items-center gap-2.5 flex-1 min-w-0">
                          <img
                            src={getTokenLogoUrl(token, chainId)}
                            alt={token.contract_name}
                            className="w-7 h-7 rounded-full flex-shrink-0 border border-border/40"
                          />
                          <div className="min-w-0">
                            <div
                              className="text-sm font-semibold truncate"
                              style={{ fontFamily: "'JetBrains Mono', monospace" }}
                            >
                              {formatTokenAmount(Number(token.balance), token.contract_decimals)}{" "}
                              {token.contract_ticker_symbol}
                            </div>
                            <div className="text-xs text-muted-foreground font-mono">
                              {formatUsdValue(token.quote)}
                            </div>
                          </div>
                        </div>

                        {/* Arrow */}
                        <div className="px-3 flex-shrink-0">
                          <ArrowRight className="w-3.5 h-3.5 text-primary/60" />
                        </div>

                        {/* Output token */}
                        <div className="flex items-center gap-2.5 flex-1 min-w-0">
                          <img
                            src={getTokenLogoFromAddress(outcomeToken, chainId)}
                            alt={getTokenSymbolFromAddress(outcomeToken, chainId)}
                            className="w-7 h-7 rounded-full flex-shrink-0 border border-border/40"
                          />
                          <div className="min-w-0">
                            <div
                              className="text-sm font-semibold whitespace-nowrap"
                              style={{ fontFamily: "'JetBrains Mono', monospace" }}
                            >
                              {quote?.output?.amount
                                ? `${quote.output.amount.toFixed(6)} ${getTokenSymbolFromAddress(outcomeToken, chainId)}`
                                : `— ${getTokenSymbolFromAddress(outcomeToken, chainId)}`}
                            </div>
                            <div className="text-xs text-muted-foreground font-mono whitespace-nowrap">
                              {quote?.output?.value_usd
                                ? formatUsdValue(quote.output.value_usd)
                                : "No route"}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
            </div>
          </div>

          <Separator className="bg-border/40" />

          {/* Execute button */}
          <Button
            onClick={handleExecuteSwap}
            disabled={
              quotesLoading || buildingCalls || Object.keys(quotes).length === 0
            }
            className="w-full font-semibold gap-2 bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-30 h-11 text-base glow-primary-sm"
            size="lg"
          >
            {quotesLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Calculating...
              </>
            ) : buildingCalls ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Building Transaction...
              </>
            ) : (
              <>
                <Zap className="w-4 h-4" />
                {atomicSupported ? "Execute Sweep" : "Sign Transactions"}
              </>
            )}
          </Button>
        </div>

        {/* Sidebar */}
        <div className="lg:col-span-2 space-y-4">
          {/* Summary */}
          <div className="border border-border/70 rounded bg-card overflow-hidden">
            <div className="px-4 py-3 border-b border-border/60">
              <span className="font-display font-semibold text-sm">Summary</span>
            </div>
            <div className="p-4 space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Tokens to swap</span>
                <span
                  className="font-semibold"
                  style={{ fontFamily: "'JetBrains Mono', monospace" }}
                >
                  {selectedTokens.length}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Total input value</span>
                <span
                  className="font-semibold"
                  style={{ fontFamily: "'JetBrains Mono', monospace" }}
                >
                  ${totalInputValue.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between items-start text-sm">
                <span className="text-muted-foreground flex-shrink-0">Expected output</span>
                <div className="text-right flex-shrink-0">
                  <div
                    className="font-semibold whitespace-nowrap text-primary"
                    style={{ fontFamily: "'JetBrains Mono', monospace" }}
                  >
                    ~{totalOutputValue.toFixed(6)} {getTokenSymbolFromAddress(outcomeToken, chainId)}
                  </div>
                  <div
                    className="text-xs text-muted-foreground whitespace-nowrap"
                    style={{ fontFamily: "'JetBrains Mono', monospace" }}
                  >
                    {formatUsdValue(totalOutputValueUsd)}
                  </div>
                </div>
              </div>

              <Separator className="bg-border/40" />

              {/* Fee breakdown */}
              <div className="border border-border/40 rounded p-3 bg-background/50 space-y-2">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
                  <Info className="w-3 h-3" />
                  <span className="font-mono uppercase tracking-wider">Fee Breakdown</span>
                </div>
                {[
                  {
                    label: `Service fee (${FEE_CONFIG.DISPLAY_PERCENTAGE})`,
                    value: formatUsdValue(estimatedFeeUsd),
                  },
                  { label: "DEX swap fee", value: "Included in price" },
                  { label: "Network gas", value: "Paid by you" },
                ].map(({ label, value }) => (
                  <div key={label} className="flex justify-between text-xs">
                    <span className="text-muted-foreground">{label}</span>
                    <span
                      className="text-foreground/80"
                      style={{ fontFamily: "'JetBrains Mono', monospace" }}
                    >
                      {value}
                    </span>
                  </div>
                ))}
              </div>

              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Slippage tolerance</span>
                <span
                  className="font-mono"
                  style={{ fontFamily: "'JetBrains Mono', monospace" }}
                >
                  {(APP_CONFIG.SLIPPAGE_TOLERANCE * 100).toFixed(1)}%
                </span>
              </div>

              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Transaction mode</span>
                <span
                  className={`font-mono ${atomicSupported ? "text-emerald-400" : "text-amber-400"}`}
                  style={{ fontFamily: "'JetBrains Mono', monospace" }}
                >
                  {atomicSupported ? "Atomic batch" : "Individual txs"}
                </span>
              </div>

              {Object.values(quotes).length > 0 && (
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Routed via</span>
                  <span
                    className="text-right font-mono text-foreground/70"
                    style={{ fontFamily: "'JetBrains Mono', monospace" }}
                  >
                    {[...new Set(Object.values(quotes).flatMap((q) => q.sources || []))]
                      .slice(0, 3)
                      .join(", ") || "—"}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* EIP-7702 card */}
          <div className="border border-border/70 rounded bg-card overflow-hidden">
            <div className="px-4 py-3 border-b border-border/60 flex items-center gap-2">
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              <span className="font-display font-semibold text-sm">
                {atomicSupported ? "EIP-7702 Benefits" : "Transaction Info"}
              </span>
            </div>
            <div className="p-4 space-y-3">
              {atomicSupported ? (
                <>
                  <div className="flex items-start gap-3">
                    <div className="bg-emerald-500/10 border border-emerald-500/20 rounded p-1.5 flex-shrink-0">
                      <Shield className="w-3.5 h-3.5 text-emerald-400" />
                    </div>
                    <div>
                      <div className="text-sm font-semibold mb-0.5">Single Transaction</div>
                      <div className="text-xs text-muted-foreground">
                        All swaps in one atomic transaction
                      </div>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="bg-sky-500/10 border border-sky-500/20 rounded p-1.5 flex-shrink-0">
                      <TrendingUp className="w-3.5 h-3.5 text-sky-400" />
                    </div>
                    <div>
                      <div className="text-sm font-semibold mb-0.5">Gas Efficient</div>
                      <div className="text-xs text-muted-foreground">
                        Batch approvals and swaps together
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-start gap-3">
                    <div className="bg-amber-500/10 border border-amber-500/20 rounded p-1.5 flex-shrink-0">
                      <Shield className="w-3.5 h-3.5 text-amber-400" />
                    </div>
                    <div>
                      <div className="text-sm font-semibold mb-0.5">Multiple Transactions</div>
                      <div className="text-xs text-muted-foreground">
                        You&apos;ll sign each swap individually
                      </div>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="bg-sky-500/10 border border-sky-500/20 rounded p-1.5 flex-shrink-0">
                      <TrendingUp className="w-3.5 h-3.5 text-sky-400" />
                    </div>
                    <div>
                      <div className="text-sm font-semibold mb-0.5">Still Secure</div>
                      <div className="text-xs text-muted-foreground">
                        Each transaction is independent and safe
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
