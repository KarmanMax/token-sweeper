"use client"

import { useState, useCallback } from "react"
import { encodeFunctionData, type Address, type Hex, maxUint256 } from "viem"
import type { SwapCall, SwapQuote, Token, SupportedChainId } from "@/types"

const erc20ApproveAbi = [
  {
    name: "approve",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ type: "bool" }],
  },
] as const

/**
 * Builds swap transaction calls from ExSwapper quotes.
 * For each token: generates an ERC-20 approve call (to ExSwapper contract) + the swap call.
 */
export function useSwapBuilder() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const buildSwapCalls = useCallback(
    async (
      selectedTokens: string[],
      tokens: Token[],
      outcomeTokenAddress: string,
      chainId: SupportedChainId,
      userWalletAddress: string,
      quotes: Record<string, SwapQuote>,
    ): Promise<SwapCall[]> => {
      setLoading(true)
      setError(null)

      try {
        const calls: SwapCall[] = []

        for (const tokenAddr of selectedTokens) {
          const token = tokens.find((t) => t.contract_address === tokenAddr)
          const quote = quotes[tokenAddr]

          if (!token || !quote || !quote.tx) {
            console.warn(`Skipping ${tokenAddr}: no token data or quote`)
            continue
          }

          // 1. ERC-20 Approve: allow the aggregator router to spend tokens
          const approveTarget = quote.allowanceTarget
          if (approveTarget) {
            const approveData = encodeFunctionData({
              abi: erc20ApproveAbi,
              functionName: "approve",
              args: [approveTarget, maxUint256],
            })

            calls.push({
              to: token.contract_address as Address,
              data: approveData,
              value: BigInt(0),
            })
          }

          // 2. Swap call to aggregator router (tx built server-side)
          // Set explicit gas limit so the wallet skips estimation for this call.
          // Without this, estimation fails because the approval above hasn't
          // executed yet, causing the swap to revert → gas blows up to 140M.
          const gasEstimate = quote.estimatedGas ? BigInt(quote.estimatedGas) : BigInt(0)
          const swapGas = gasEstimate > BigInt(0) ? gasEstimate * BigInt(3) / BigInt(2) : BigInt(500000)

          calls.push({
            to: quote.tx.to,
            data: quote.tx.data as Hex,
            value: BigInt(quote.tx.value || 0),
            gas: swapGas,
          })
        }

        if (calls.length === 0) {
          throw new Error("No valid swap calls could be built")
        }

        return calls
      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred'
        console.error("Error building swap calls:", err)
        setError(errorMessage)
        return []
      } finally {
        setLoading(false)
      }
    },
    [],
  )

  return {
    buildSwapCalls,
    loading,
    error,
  }
}
