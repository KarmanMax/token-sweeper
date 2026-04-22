import type { Address, Hash, Hex } from "viem"

/**
 * Configuration constants
 */
export const APP_CONFIG = {
  SLIPPAGE_TOLERANCE: 0.01, // 1% slippage
  CACHE_TTL: 2 * 60 * 1000, // 2 minutes - standardized across all hooks
  MIN_TOKEN_VALUE_USD: 0.01, // Minimum $0.01 value
} as const

/**
 * Chain configuration
 */
export const SUPPORTED_CHAINS = {
  OPTIMISM: 10,
  BASE: 8453,
} as const

export type SupportedChainId = (typeof SUPPORTED_CHAINS)[keyof typeof SUPPORTED_CHAINS]

/**
 * Token interface - used across all components and hooks
 */
export interface Token {
  contract_address: Address
  contract_name: string
  contract_ticker_symbol: string
  contract_decimals: number
  logo_urls: {
    token_logo_url: string
  }
  supports_erc: string[]
  native_token: boolean
  is_spam: boolean
  balance: string
  quote: number
}

/**
 * API status types
 */
export type ApiStatus = 'untested' | 'working' | 'failed'

/**
 * Swap quote interface — unified format used in UI
 */
export interface SwapQuote {
  input: {
    token: {
      address: Address
      symbol: string
      decimals: number
    }
    amount: number
    amount_wei: string
    value_usd: number
  }
  output: {
    token: {
      address: Address
      symbol: string
      decimals: number
    }
    amount: number
    amount_wei: string
    min_amount: number
    min_amount_wei: string
    value_usd: number
  }
  // ExSwapper transaction data (ready to send)
  tx: {
    to: Address
    data: Hex
    value: string
    gas: string
  }
  // Aggregator router address for ERC-20 approval
  allowanceTarget: Address
  sources: string[]
  estimatedGas: string
  slippage: number
  route_found: boolean
  price_impact: number
}

/**
 * Swap call interface with proper Viem types
 */
export interface SwapCall {
  to: Address
  data: Hex
  value: bigint
  gas?: bigint
}

/**
 * Swap build parameters
 */
export interface SwapBuildParams {
  from_token: Address
  to_token: Address
  amount: string
  wallet_address: Address
  slippage: number
}

/**
 * Environment validation result
 */
export interface EnvironmentConfig {
  walletConnectProjectId?: string
}

export interface ValidationResult {
  isValid: boolean
  warnings: string[]
  errors: string[]
  config: EnvironmentConfig
}

/**
 * Outcome token interface
 */
export interface OutcomeToken {
  address: Address
  symbol: string
  name: string
  decimals: number
  logo_url?: string
}

/**
 * Swap result interface
 */
export interface SwapResult {
  tokensSwapped: number
  totalValue: number
  outcomeToken: Address
  chain: string
  txHash: Hash
  chainId: SupportedChainId
  isAtomic: boolean
}

/**
 * Chain names mapping
 */
export const CHAIN_NAMES: Record<SupportedChainId, string> = {
  [SUPPORTED_CHAINS.OPTIMISM]: "Optimism",
  [SUPPORTED_CHAINS.BASE]: "Base",
} as const

/**
 * API chain names for Covalent
 */
export const COVALENT_CHAIN_NAMES: Record<SupportedChainId, string> = {
  [SUPPORTED_CHAINS.OPTIMISM]: "optimism-mainnet",
  [SUPPORTED_CHAINS.BASE]: "base-mainnet",
} as const

/**
 * Explorer URLs
 */
export const EXPLORER_URLS: Record<SupportedChainId, string> = {
  [SUPPORTED_CHAINS.OPTIMISM]: "https://optimistic.etherscan.io",
  [SUPPORTED_CHAINS.BASE]: "https://basescan.org",
} as const

/**
 * Chain identifiers for DeBank token logos
 */
export const DEBANK_CHAIN_NAMES: Record<SupportedChainId, string> = {
  [SUPPORTED_CHAINS.OPTIMISM]: "op",
  [SUPPORTED_CHAINS.BASE]: "base",
} as const

/**
 * Chain identifiers for Trust Wallet assets
 */
export const TRUST_WALLET_CHAIN_NAMES: Record<SupportedChainId, string> = {
  [SUPPORTED_CHAINS.OPTIMISM]: "optimism",
  [SUPPORTED_CHAINS.BASE]: "base",
} as const

/**
 * ExSwapper-supported chain IDs (chains with deployed ExSwapper contract)
 */
export const EXSWAPPER_SUPPORTED_CHAINS = new Set([
  SUPPORTED_CHAINS.OPTIMISM,
  SUPPORTED_CHAINS.BASE,
])

/**
 * Fee configuration
 */
export const FEE_CONFIG = {
  /** Fee percentage as decimal (0.003 = 0.3%) */
  PERCENTAGE: 0.003,
  /** Fee percentage for display (0.3%) */
  DISPLAY_PERCENTAGE: "0.3%",
  /** Fee recipient wallet address — set via env var */
  RECIPIENT: (process.env.NEXT_PUBLIC_FEE_RECIPIENT || "") as Address,
} as const