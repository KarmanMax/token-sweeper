import { useState } from "react"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Search, DollarSign } from "lucide-react"
import { formatUnits } from "viem"
import { getTokenLogoUrl } from "@/lib/utils"
import type { Token, ApiStatus, SupportedChainId } from "@/types"

interface TokenPortfolioProps {
  tokens: Token[]
  loading: boolean
  selectedTokens: string[]
  onTokenSelect: (tokenAddress: string, selected: boolean) => void
  onSelectAll: () => void
  onDeselectAll: () => void
  apiStatus?: ApiStatus
  chainId: SupportedChainId
}

export default function TokenPortfolio({
  tokens,
  loading,
  selectedTokens,
  onTokenSelect,
  onSelectAll,
  onDeselectAll,
  apiStatus = "untested",
  chainId,
}: TokenPortfolioProps) {
  const [searchTerm, setSearchTerm] = useState("")
  const [showSpam] = useState(false)

  const filteredTokens = tokens.filter((token) => {
    const matchesSearch =
      token.contract_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      token.contract_ticker_symbol.toLowerCase().includes(searchTerm.toLowerCase())
    const spamFilter = showSpam || !token.is_spam
    const hasValue = token.quote > 0
    return matchesSearch && spamFilter && hasValue
  })

  const totalValue = selectedTokens.reduce((sum, tokenAddr) => {
    const token = tokens.find((t) => t.contract_address === tokenAddr)
    return sum + (token?.quote || 0)
  }, 0)

  if (loading) {
    return (
      <div className="border border-border/70 rounded bg-card overflow-hidden">
        <div className="px-4 py-3 border-b border-border/60 flex items-center justify-between">
          <span className="font-display font-semibold text-sm">Token Portfolio</span>
          <div className="h-3 w-12 bg-border/50 rounded animate-pulse" />
        </div>
        <div className="px-4 py-3 border-b border-border/40">
          <div className="h-8 bg-border/30 rounded animate-pulse" />
        </div>
        <div className="divide-y divide-border/40">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex items-center gap-3 px-4 py-3 animate-pulse">
              <div className="w-4 h-4 bg-border/50 rounded flex-shrink-0" />
              <div className="w-8 h-8 bg-border/50 rounded-full flex-shrink-0" />
              <div className="flex-1 space-y-1.5">
                <div className="h-3 bg-border/50 rounded w-1/3" />
                <div className="h-2.5 bg-border/30 rounded w-1/5" />
              </div>
              <div className="h-3 bg-border/50 rounded w-14" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="border border-border/70 rounded bg-card overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border/60 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="font-display font-semibold text-sm">Token Portfolio</span>
            {apiStatus === "working" && (
              <span
                className="text-[10px] font-mono px-1.5 py-0.5 border border-emerald-500/30 text-emerald-400 bg-emerald-500/5 rounded tracking-widest"
              >
                LIVE
              </span>
            )}
            {apiStatus === "failed" && (
              <span
                className="text-[10px] font-mono px-1.5 py-0.5 border border-amber-500/30 text-amber-400 bg-amber-500/5 rounded tracking-widest"
              >
                MOCK
              </span>
            )}
          </div>
          <div className="flex gap-2">
            <button
              onClick={onSelectAll}
              className="text-xs text-muted-foreground hover:text-primary transition-colors px-2 py-1 border border-border/60 rounded hover:border-primary/40 font-mono"
            >
              All
            </button>
            <button
              onClick={onDeselectAll}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors px-2 py-1 border border-border/60 rounded hover:border-border font-mono"
            >
              None
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search tokens..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 h-8 text-sm bg-background border-border/60 placeholder:text-muted-foreground/50 focus:border-primary/50 focus-visible:ring-0 focus-visible:ring-offset-0"
            style={{ fontFamily: "'JetBrains Mono', monospace" }}
          />
        </div>

        {/* Selection bar */}
        {selectedTokens.length > 0 && (
          <div className="px-3 py-2 border border-primary/20 bg-primary/5 rounded flex items-center justify-between">
            <span className="text-xs text-primary font-mono">
              {selectedTokens.length} token{selectedTokens.length !== 1 ? "s" : ""} selected
            </span>
            <span className="text-xs font-mono font-semibold text-primary flex items-center gap-0.5">
              <DollarSign className="w-3 h-3" />
              {totalValue.toFixed(2)}
            </span>
          </div>
        )}
      </div>

      {/* Token rows */}
      <div className="divide-y divide-border/30 max-h-[420px] overflow-y-auto">
        {filteredTokens.map((token) => {
          const isSelected = selectedTokens.includes(token.contract_address)
          return (
            <div
              key={token.contract_address}
              onClick={() => onTokenSelect(token.contract_address, !isSelected)}
              className={`flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors relative ${
                isSelected
                  ? "bg-primary/5"
                  : "hover:bg-accent/40"
              }`}
            >
              {/* Left accent line for selected */}
              {isSelected && (
                <div className="absolute left-0 inset-y-0 w-[2px] bg-primary" />
              )}

              <Checkbox
                checked={isSelected}
                onCheckedChange={(checked) =>
                  onTokenSelect(token.contract_address, checked as boolean)
                }
                onClick={(e) => e.stopPropagation()}
                className="flex-shrink-0 data-[state=checked]:bg-primary data-[state=checked]:border-primary border-border/70"
              />

              <img
                src={getTokenLogoUrl(token, chainId)}
                alt={token.contract_name}
                className="w-8 h-8 rounded-full flex-shrink-0 border border-border/40"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.opacity = "0"
                }}
              />

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="font-medium text-sm truncate">{token.contract_name}</span>
                  <span className="text-[10px] font-mono text-muted-foreground bg-muted/60 border border-border/40 px-1.5 rounded flex-shrink-0">
                    {token.contract_ticker_symbol}
                  </span>
                </div>
                <div
                  className="text-xs text-muted-foreground mt-0.5"
                  style={{ fontFamily: "'JetBrains Mono', monospace" }}
                >
                  {Number(
                    formatUnits(BigInt(token.balance), token.contract_decimals)
                  ).toLocaleString(undefined, { maximumFractionDigits: 6 })}
                </div>
              </div>

              <div className="text-right flex-shrink-0">
                <div
                  className={`text-sm font-semibold ${isSelected ? "text-primary" : "text-foreground"}`}
                  style={{ fontFamily: "'JetBrains Mono', monospace" }}
                >
                  ${token.quote.toFixed(2)}
                </div>
              </div>
            </div>
          )
        })}

        {filteredTokens.length === 0 && (
          <div className="text-center py-14 text-muted-foreground">
            <p className="text-sm font-mono">No tokens found</p>
          </div>
        )}
      </div>
    </div>
  )
}
