"use client"

import { useState, useCallback, useRef } from "react"
import { formatUnits } from "viem"
import { constructSimpleSDK, type SimpleFetchSDK } from "@velora-dex/sdk"
import { useAccount } from "wagmi"
import type { SwapQuote, Token, SupportedChainId } from "@/types"
import { APP_CONFIG } from "@/types"
import { getTokenSymbolFromAddress, getTokenDecimalsFromAddress } from "@/lib/token-config"

// Cache SDK instances per chainId — avoid re-creating on every quote fetch
const sdkCache = new Map<number, SimpleFetchSDK>()
function getSDK(chainId: number): SimpleFetchSDK {
  if (!sdkCache.has(chainId)) {
    sdkCache.set(chainId, constructSimpleSDK({ chainId, fetch }))
  }
  return sdkCache.get(chainId)!
}

// APP_CONFIG.SLIPPAGE_TOLERANCE is decimal (0.01 = 1%)
// ParaSwap slippage is in basis points (1% = 100)
const SLIPPAGE_BPS = Math.round(APP_CONFIG.SLIPPAGE_TOLERANCE * 10000)

export function useSwapQuotes() {
  const { address: walletAddress } = useAccount()
  const [quotes, setQuotes] = useState<Record<string, SwapQuote>>({})
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastFetchKey, setLastFetchKey] = useState<string>("")
  const activeRequestRef = useRef<string | null>(null)

  const fetchQuotes = useCallback(
    async (selectedTokens: string[], tokens: Token[], outcomeTokenAddress: string, chainId: SupportedChainId) => {
      if (!walletAddress) return

      const fetchKey = `${chainId}-${outcomeTokenAddress}-${selectedTokens.sort().join(',')}-${tokens.map(t => `${t.contract_address}:${t.balance}`).sort().join(',')}`

      if (fetchKey === lastFetchKey && Object.keys(quotes).length > 0) return
      if (activeRequestRef.current === fetchKey) return

      setLoading(true)
      setError(null)
      setLastFetchKey(fetchKey)
      activeRequestRef.current = fetchKey

      try {
        const newQuotes: Record<string, SwapQuote> = {}
        const uniqueTokenAddresses = [...new Set(selectedTokens)]
        const sdk = getSDK(chainId)

        const quotePromises = uniqueTokenAddresses.map(async (tokenAddr) => {
          const token = tokens.find((t) => t.contract_address === tokenAddr)
          if (!token) return null

          try {
            const buyDecimals = getTokenDecimalsFromAddress(outcomeTokenAddress, chainId)

            const data = await sdk.swap.getSwapTxData({
              srcToken: tokenAddr,
              destToken: outcomeTokenAddress,
              amount: token.balance,
              side: "SELL",
              srcDecimals: token.contract_decimals,
              destDecimals: buyDecimals,
              userAddress: walletAddress,
              slippage: SLIPPAGE_BPS,
            })
            console.log('getSwapTxData :>> ', {
              srcToken: tokenAddr,
              destToken: outcomeTokenAddress,
              amount: token.balance,
              side: "SELL",
              srcDecimals: token.contract_decimals,
              destDecimals: buyDecimals,
              userAddress: walletAddress,
              slippage: SLIPPAGE_BPS,
              data,
            });

            const { priceRoute, txParams } = data

            const buyAmount = Number(formatUnits(BigInt(priceRoute.destAmount), buyDecimals))
            const minAmountOut = (
              BigInt(priceRoute.destAmount) * BigInt(10000 - SLIPPAGE_BPS) / BigInt(10000)
            ).toString()
            const minBuyAmount = Number(formatUnits(BigInt(minAmountOut), buyDecimals))

            const quote: SwapQuote = {
              input: {
                token: {
                  address: token.contract_address,
                  symbol: token.contract_ticker_symbol,
                  decimals: token.contract_decimals,
                },
                amount: Number(formatUnits(BigInt(priceRoute.srcAmount), token.contract_decimals)),
                amount_wei: priceRoute.srcAmount,
                value_usd: token.quote,
              },
              output: {
                token: {
                  address: outcomeTokenAddress as `0x${string}`,
                  symbol: getTokenSymbolFromAddress(outcomeTokenAddress, chainId),
                  decimals: buyDecimals,
                },
                amount: buyAmount,
                amount_wei: priceRoute.destAmount,
                min_amount: minBuyAmount,
                min_amount_wei: minAmountOut,
                value_usd: token.quote,
              },
              tx: {
                to: txParams.to as `0x${string}`,
                data: txParams.data as `0x${string}`,
                value: txParams.value || "0",
                gas: priceRoute.gasCost || "0",
              },
              allowanceTarget: priceRoute.tokenTransferProxy as `0x${string}`,
              sources: [priceRoute.contractMethod || "ParaSwap"],
              estimatedGas: priceRoute.gasCost || "0",
              slippage: APP_CONFIG.SLIPPAGE_TOLERANCE,
              route_found: true,
              price_impact: priceRoute.maxImpact ?? 0,
            }

            return { tokenAddr, quote }
          } catch (tokenError: unknown) {
            const msg = tokenError instanceof Error ? tokenError.message : 'Unknown error'
            console.error(`Error fetching quote for ${token.contract_ticker_symbol}:`, msg)
            return null
          }
        })

        const results = await Promise.all(quotePromises)

        for (const result of results) {
          if (result) {
            newQuotes[result.tokenAddr] = result.quote
          }
        }

        if (Object.keys(newQuotes).length === 0 && uniqueTokenAddresses.length > 0) {
          setError("No swap routes found for selected tokens. They may have insufficient liquidity.")
        }

        setQuotes(newQuotes)
      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred'
        console.error("Error fetching quotes:", err)
        setError(errorMessage)
      } finally {
        setLoading(false)
        activeRequestRef.current = null
      }
    },
    [walletAddress],
  )

  return {
    quotes,
    loading,
    error,
    fetchQuotes,
  }
}
