"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { History, ExternalLink, Trash2 } from "lucide-react"
import type { SweepRecord } from "@/hooks/use-sweep-history"
import { CHAIN_NAMES, EXPLORER_URLS, type SupportedChainId } from "@/types"
import { formatUsdValue } from "@/lib/utils"

interface SweepHistoryProps {
  history: SweepRecord[]
  onClear: () => void
}

export default function SweepHistory({ history, onClear }: SweepHistoryProps) {
  if (history.length === 0) return null

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <History className="w-5 h-5" />
            Recent Sweeps
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={onClear} className="text-gray-400 hover:text-red-500">
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {history.slice(0, 5).map((record) => {
            const chainName = CHAIN_NAMES[record.chainId] || "Unknown"
            const explorerBase = EXPLORER_URLS[record.chainId] || EXPLORER_URLS[8453 as SupportedChainId]
            const explorerUrl = `${explorerBase}/tx/${record.txHash}`
            const date = new Date(record.timestamp)

            return (
              <div key={record.id} className="flex items-center justify-between p-3 border rounded-lg text-sm">
                <div>
                  <div className="font-medium">
                    {record.tokensSwept} tokens → {record.outputAmount.toFixed(4)} {record.outputTokenSymbol}
                  </div>
                  <div className="text-gray-500">
                    {chainName} · {formatUsdValue(record.inputValueUsd)} · {date.toLocaleDateString()}
                  </div>
                </div>
                <a
                  href={explorerUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-700 flex-shrink-0"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
