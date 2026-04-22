import type { SupportedChainId } from "@/types"
import { SUPPORTED_CHAINS, CHAIN_NAMES, COVALENT_CHAIN_NAMES, TRUST_WALLET_CHAIN_NAMES, DEBANK_CHAIN_NAMES } from "@/types"

/**
 * Utility functions for chain operations
 */
export const getChainName = (chainId: number): string => {
  return CHAIN_NAMES[chainId as SupportedChainId] || "Unknown"
}

export const getCovalentChainName = (chainId: number): string => {
  return COVALENT_CHAIN_NAMES[chainId as SupportedChainId] || "eth-mainnet"
}

export const getTrustWalletChainName = (chainId: SupportedChainId): string | null => {
  return TRUST_WALLET_CHAIN_NAMES[chainId] || null
}

export const getDebankChainName = (chainId: SupportedChainId): string | null => {
  return DEBANK_CHAIN_NAMES[chainId] || null
}

/**
 * Check if a chain ID is supported
 */
export const isSupportedChain = (chainId: number): chainId is SupportedChainId => {
  return Object.values(SUPPORTED_CHAINS).includes(chainId as SupportedChainId)
}

/**
 * Server-side environment config
 */
export interface ServerEnvironmentConfig {
  covalentApiKey?: string
}

export const getServerConfig = (): ServerEnvironmentConfig => ({
  covalentApiKey: process.env.COVALENT_API_KEY,
})
