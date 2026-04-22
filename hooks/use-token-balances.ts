"use client"

import { useState, useCallback, useEffect, useMemo, useRef } from "react"
import { getAddress, type Address } from "viem"
import type { Token, ApiStatus, SupportedChainId } from "@/types"
import { APP_CONFIG, SUPPORTED_CHAINS } from "@/types"
import { getTokenLogoUrl } from "@/lib/utils"
import { TOKEN_LIST } from "@/lib/token"
import { logger } from "@/lib/logger"

// ─── Config ──────────────────────────────────────────────────────────────────

const RPC_URLS: Record<SupportedChainId, string> = {
  [SUPPORTED_CHAINS.OPTIMISM]:
    process.env.NEXT_PUBLIC_OPTIMISM_RPC_URL || "https://mainnet.optimism.io",
  [SUPPORTED_CHAINS.BASE]:
    process.env.NEXT_PUBLIC_BASE_RPC_URL || "https://mainnet.base.org",
}

const DEFILLAMA_CHAIN_NAMES: Record<SupportedChainId, string> = {
  [SUPPORTED_CHAINS.OPTIMISM]: "optimism",
  [SUPPORTED_CHAINS.BASE]: "base",
}

const ZERO_BALANCE = "0x0000000000000000000000000000000000000000000000000000000000000000"

// ─── Types ────────────────────────────────────────────────────────────────────

interface AlchemyTokenBalance {
  contractAddress: string
  tokenBalance: string
  error: string | null
}

interface AlchemyTokenMetadata {
  decimals: number | null
  logo: string | null
  name: string | null
  symbol: string | null
}

// ─── Fetch helpers ────────────────────────────────────────────────────────────

async function fetchTokenBalances(rpcUrl: string, address: string): Promise<AlchemyTokenBalance[]> {
  const all: AlchemyTokenBalance[] = []
  let pageKey: string | undefined

  do {
    const params: unknown[] = [address, "erc20"]
    if (pageKey) params.push({ pageKey })

    const res = await fetch(rpcUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "alchemy_getTokenBalances", params }),
    })
    if (!res.ok) throw new Error(`RPC request failed: ${res.status}`)
    const json = await res.json()
    if (json.error) throw new Error(`RPC error: ${json.error.message ?? JSON.stringify(json.error)}`)

    const result = json.result
    all.push(...(result.tokenBalances ?? []))
    pageKey = result.pageKey
  } while (pageKey)

  return all
}

async function fetchTokenMetadata(
  rpcUrl: string,
  contractAddresses: string[]
): Promise<Map<string, AlchemyTokenMetadata>> {
  const map = new Map<string, AlchemyTokenMetadata>()
  if (!contractAddresses.length) return map

  const batchBody = contractAddresses.map((addr, i) => ({
    jsonrpc: "2.0",
    id: i,
    method: "alchemy_getTokenMetadata",
    params: [addr],
  }))

  const res = await fetch(rpcUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(batchBody),
  })
  if (!res.ok) throw new Error(`Metadata batch failed: ${res.status}`)
  const results: Array<{ id: number; result?: AlchemyTokenMetadata }> = await res.json()

  for (const item of results) {
    if (item.result) map.set(contractAddresses[item.id], item.result)
  }
  return map
}

async function fetchDefiLlamaPrices(
  llamaChain: string,
  contractAddresses: string[]
): Promise<Map<string, number>> {
  const map = new Map<string, number>()
  if (!contractAddresses.length) return map

  try {
    const coins = contractAddresses.map((a) => `${llamaChain}:${a.toLowerCase()}`).join(",")
    const res = await fetch(`https://coins.llama.fi/prices/current/${coins}`)
    if (!res.ok) return map
    const data: { coins: Record<string, { price: number }> } = await res.json()
    for (const [key, coin] of Object.entries(data.coins)) {
      if (coin?.price) map.set(key, coin.price)
    }
  } catch {
    // prices optional — degrade to quote: 0
  }
  return map
}

// ─── Cache ────────────────────────────────────────────────────────────────────

interface TokenCacheEntry {
  data: Token[]
  timestamp: number
  version: number
}

const cache = new Map<string, TokenCacheEntry>()
let tokenCacheVersion = 1

export const invalidateTokenBalanceCache = () => {
  tokenCacheVersion++
  console.log(`🧹 Invalidated token balance cache, new version: ${tokenCacheVersion}`)
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useTokenBalances(address: string | undefined, chainId: SupportedChainId) {
  const [tokens, setTokens] = useState<Token[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [apiStatus, setApiStatus] = useState<ApiStatus>('untested')

  const prevAddressRef = useRef<string | undefined>(address)
  const cacheKey = useMemo(() => `${address}-${chainId}`, [address, chainId])

  useEffect(() => {
    if (prevAddressRef.current !== address) {
      setTokens([])
      setError(null)
      setApiStatus('untested')
      prevAddressRef.current = address
    }
  }, [address])

  const fetchTokens = useCallback(async () => {
    if (!address) return

    const cached = cache.get(cacheKey)
    if (cached && Date.now() - cached.timestamp < APP_CONFIG.CACHE_TTL && cached.version === tokenCacheVersion) {
      setTokens(cached.data)
      setApiStatus('working')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const rpcUrl = RPC_URLS[chainId]
      const llamaChain = DEFILLAMA_CHAIN_NAMES[chainId]

      const allowedAddresses = new Set(
        Object.values((TOKEN_LIST as Record<number, Record<string, { address: string }>>)[chainId] ?? {}).map((t) => t.address.toLowerCase())
      )

      // Step 1: balances (paginated)
      const rawBalances = await fetchTokenBalances(rpcUrl, address)

      // Step 2: filter zero, errors, not in TOKEN_LIST; deduplicate
      const seen = new Set<string>()
      const nonZero = rawBalances.filter((t) => {
        if (t.error || !t.tokenBalance || t.tokenBalance === ZERO_BALANCE) return false
        if (!allowedAddresses.has(t.contractAddress.toLowerCase())) return false
        const key = t.contractAddress.toLowerCase()
        if (seen.has(key)) return false
        seen.add(key)
        return true
      })

      if (nonZero.length === 0) {
        setTokens([])
        setError("No valid ERC-20 tokens found in this wallet")
        setApiStatus('working')
        return
      }

      const contractAddresses = nonZero.map((t) => t.contractAddress)

      // Step 3: metadata + prices in parallel
      const [metaMap, priceMap] = await Promise.all([
        fetchTokenMetadata(rpcUrl, contractAddresses),
        fetchDefiLlamaPrices(llamaChain, contractAddresses),
      ])

      // Step 4: assemble + sort
      const items: Token[] = nonZero.map((t) => {
        const meta = metaMap.get(t.contractAddress)
        const checksumAddr = (() => {
          try { return getAddress(t.contractAddress) } catch { return t.contractAddress }
        })()

        const logoUrl = getTokenLogoUrl(
          { logo_url: meta?.logo ?? undefined, contract_address: checksumAddr, contract_ticker_symbol: meta?.symbol ?? undefined },
          chainId
        )

        const decimals = meta?.decimals ?? 18
        const humanBalance = parseInt(t.tokenBalance, 16) / Math.pow(10, decimals)
        const priceKey = `${llamaChain}:${t.contractAddress.toLowerCase()}`
        const quote = (priceMap.get(priceKey) ?? 0) * humanBalance

        return {
          contract_address: checksumAddr as Address,
          contract_name: meta?.name || "Unknown Token",
          contract_ticker_symbol: meta?.symbol || "???",
          contract_decimals: decimals,
          logo_urls: { token_logo_url: logoUrl },
          supports_erc: ["erc20"],
          native_token: false,
          is_spam: false,
          balance: t.tokenBalance,
          quote,
        }
      }).sort((a, b) => b.quote - a.quote)

      setApiStatus('working')
      setTokens(items)
      cache.set(cacheKey, { data: items, timestamp: Date.now(), version: tokenCacheVersion })

      console.log(`✅ ${items.length} tokens for ${address}`)
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred'
      logger.apiError('GET', `alchemy_getTokenBalances chain=${chainId} address=${address}`, err)
      setError(`Failed to fetch tokens: ${errorMessage}`)
      setApiStatus('failed')
      setTokens([])
    } finally {
      setLoading(false)
    }
  }, [address, chainId, cacheKey])

  useEffect(() => {
    fetchTokens()
  }, [fetchTokens])

  return { tokens, loading, error, apiStatus, refetch: fetchTokens }
}
