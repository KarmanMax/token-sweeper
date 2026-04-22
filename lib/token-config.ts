import { SUPPORTED_CHAINS } from "@/types"

export interface TokenConfig {
  address: string
  symbol: string
  decimals: number
  name: string
  logoUrl: string
}

const WETH_LOGO = "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2/logo.png"
const USDC_LOGO = "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48/logo.png"
const USDT_LOGO = "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0xdAC17F958D2ee523a2206206994597C13D831ec7/logo.png"

export const OUTCOME_TOKENS: Record<number, TokenConfig[]> = {
  [SUPPORTED_CHAINS.BASE]: [
    { address: "0x4200000000000000000000000000000000000006", symbol: "WETH", decimals: 18, name: "Wrapped Ether", logoUrl: WETH_LOGO },
    { address: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913", symbol: "USDC", decimals: 6, name: "USD Coin", logoUrl: USDC_LOGO },
    { address: "0xfde4C96c8593536E31F229EA8f37b2ADa2699bb2", symbol: "USDT", decimals: 6, name: "Tether USD", logoUrl: USDT_LOGO },
  ],
  [SUPPORTED_CHAINS.OPTIMISM]: [
    { address: "0x4200000000000000000000000000000000000006", symbol: "WETH", decimals: 18, name: "Wrapped Ether", logoUrl: WETH_LOGO },
    { address: "0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85", symbol: "USDC", decimals: 6, name: "USD Coin", logoUrl: USDC_LOGO },
    { address: "0x94b008aA00579c1307B0EF2c499aD98a8ce58e58", symbol: "USDT", decimals: 6, name: "Tether USD", logoUrl: USDT_LOGO },
  ],
}

export function getOutcomeTokenAddress(symbol: string, chainId: number): string {
  const tokens = OUTCOME_TOKENS[chainId] || OUTCOME_TOKENS[8453]
  const token = tokens.find(t => t.symbol === symbol)
  return token?.address || OUTCOME_TOKENS[8453][0].address
}

export function getTokenSymbolFromAddress(address: string, chainId: number): string {
  const tokens = OUTCOME_TOKENS[chainId] || OUTCOME_TOKENS[8453]
  const token = tokens.find(t => t.address.toLowerCase() === address.toLowerCase())
  return token?.symbol || "TOKEN"
}

export function getTokenLogoFromAddress(address: string, chainId: number): string {
  const tokens = OUTCOME_TOKENS[chainId] || OUTCOME_TOKENS[8453]
  const token = tokens.find(t => t.address.toLowerCase() === address.toLowerCase())
  return token?.logoUrl || `/placeholder.svg?height=32&width=32&text=${getTokenSymbolFromAddress(address, chainId)}`
}

export function getTokenDecimalsFromAddress(address: string, chainId: number): number {
  const tokens = OUTCOME_TOKENS[chainId] || OUTCOME_TOKENS[8453]
  const token = tokens.find(t => t.address.toLowerCase() === address.toLowerCase())
  return token?.decimals || 18
}
