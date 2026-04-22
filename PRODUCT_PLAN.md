# Token Sweeper - Product Feasibility Analysis & Plan

> Date: 2026-04-01
> Status: Draft
> Based on: token-sweeper-eip-7702 demo (Base + Optimism, EIP-7702 batch swap)

---

## Context

This project is an EIP-7702-based token dust sweeper demo supporting batch token consolidation on Base and Optimism. The goal is to productize it as a self-custody dust consolidation tool, targeting both retail and professional users, monetized via transaction fee commission.

---

## 1. Market & Competitive Analysis

### Competitive Landscape

| Product | Type | Status | Key Difference |
|---------|------|--------|----------------|
| **DustSweeper** | Dedicated dust sweeper | **Deprecated** | Made obsolete by EIP-7702 |
| **CowSwap** | Intent-based DEX | Active | Batch auction + MEV protection + gasless, but not a dedicated dust tool |
| **Uniswap Universal Router** | DEX | Active | Best liquidity, but no dust-specific UX |
| **Revoke.cash** | Approval management | Active | Only manages approvals, no swaps |
| **Binance/Bitget** | CEX dust conversion | Active | Simple but requires custodial deposit; Bitget charges 2% |
| **0x Protocol** | DEX aggregation API | Active | API layer, no end-user dust product |

### Key Findings

1. **Clear market gap**: No dominant decentralized dust sweeping product since DustSweeper shut down
2. **Real demand**: USDT dust attacks up 612% YoY; dust accumulation affects most active DeFi wallets
3. **CEX dominance**: Binance/Bitget one-click conversion is currently the simplest solution, but requires centralized custody
4. **EIP-7702 timing window**: Live since Pectra upgrade (May 2025); MetaMask, Coinbase Wallet, and Trust Wallet already support it

### Competitive Positioning

| vs | Our Advantage |
|----|---------------|
| CEX (Binance/Bitget) | Self-custody, no deposit/withdrawal needed |
| CowSwap | Purpose-built UX, one-click operation vs generic trading interface |
| 0x / Uniswap | End-user product vs developer API / generic DEX |

**Core value proposition**: EIP-7702 native support -> single-signature batch consolidation -> gas optimal

---

## 2. Business Viability

### Market Size Estimation

| Metric | Estimate |
|--------|----------|
| Active DeFi wallets (MAU) | ~5M+ |
| Wallets with 5+ dust tokens | 30-50% |
| Addressable user pool | 1.5-2.5M wallets |
| Average sweep amount | $50-500 |
| Annual sweep frequency | 2-6x per wallet |
| **TAM (annual volume)** | **~$400M** |
| **Revenue at 0.3% fee** | **~$1.2M/year (optimistic)** |

### Revenue Model: Transaction Fee Commission

```
User sweeps $100 in dust tokens
├── DEX swap fee:          ~0.3% (paid to DEX)
├── Token Sweeper fee:      0.3% = $0.30
├── Gas fee:                user pays (50%+ lower via EIP-7702 batching)
└── User receives:         ~$99.10
```

**Pricing Tiers**:
- Basic: 0.3% per sweep (competitive vs Bitget's 2%)
- Pro subscriber: 0.15% ($9.99/month)
- High volume (>$10K): 0.1%

### Risk Assessment

| Risk | Level | Mitigation |
|------|-------|------------|
| DEX aggregators add dust feature | **High** | Speed + UX differentiation, build user habits early |
| Wallets natively integrate dust sweep | **Medium-High** | Multi-chain + multi-DEX aggregation as moat |
| Regulatory risk (fee = financial service?) | **Medium** | Pure on-chain contracts, non-custodial |
| Insufficient liquidity causing high slippage | **Medium** | Aggregate multiple DEXs, set minimum value threshold |
| Competitors flood in after EIP-7702 adoption | **High** | First-mover advantage + brand + multi-chain coverage |

### Viability Conclusion

**Moderately positive (4/5)**. The market gap is real, but the moat is shallow (frontend product, low technical barrier). Success depends on:
1. **Speed** - seize the EIP-7702 first-mover window
2. **Experience** - simpler than any generic DEX
3. **Coverage** - rapid multi-chain expansion for network effects

---

## 3. Technical Architecture (Demo -> Product)

### Current Demo Limitations

| Issue | Impact |
|-------|--------|
| Only 2 chains (Base/Optimism) | Insufficient coverage |
| Single DEX per chain (Aerodrome/Velodrome) | Suboptimal pricing |
| No fee collection mechanism | Cannot monetize |
| No user account system | Cannot do Pro subscriptions |
| API keys hardcoded in backend | Security risk |
| No on-chain contract, pure frontend logic | Fee collection not enforceable |
| No monitoring/analytics | No user behavior insight |

### Production Architecture

```
┌─────────────────────────────────────────────────┐
│                   Frontend (Next.js)             │
│  ┌──────────┐  ┌──────────┐  ┌───────────────┐  │
│  │ Portfolio │  │  Sweep   │  │  Dashboard    │  │
│  │  Viewer   │  │  Engine  │  │ (Pro Features)│  │
│  └──────────┘  └──────────┘  └───────────────┘  │
└──────────────────────┬──────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────┐
│              Backend API (Node.js)               │
│  ┌──────────┐  ┌──────────┐  ┌───────────────┐  │
│  │  Quote   │  │  Route   │  │  Fee Service  │  │
│  │Aggregator│  │ Optimizer│  │  (sig verify)  │  │
│  └──────────┘  └──────────┘  └───────────────┘  │
└──────────────────────┬──────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────┐
│           Smart Contract Layer                   │
│  ┌─────────────────────────────────────────┐     │
│  │  SweepRouter.sol                        │     │
│  │  - batchSwap(SwapParams[])              │     │
│  │  - Built-in fee extraction (feeBps)     │     │
│  │  - EIP-7702 delegatecall compatible     │     │
│  │  - Multi-DEX routing                    │     │
│  └─────────────────────────────────────────┘     │
│  ┌─────────────────────────────────────────┐     │
│  │  FeeCollector.sol                       │     │
│  │  - Fee aggregation + revenue split      │     │
│  │  - Owner withdrawal                     │     │
│  └─────────────────────────────────────────┘     │
└─────────────────────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────┐
│              Multi-Chain Support                  │
│  Base │ Optimism │ Ethereum │ Arbitrum │ Polygon │
│ Aerodrome│Velodrome│ Uniswap │ Camelot │QuickSwap│
└─────────────────────────────────────────────────┘
```

### Key Technical Upgrades

#### 3.1 SweepRouter Contract (Critical Path)

The most important piece missing from demo to product. Handles on-chain fee enforcement.

- **Fee extraction**: Automatically routes X bps of swap output to FeeCollector
- **Multi-DEX routing**: Unified interface to call different DEX routers (Aerodrome, Uniswap V3, etc.)
- **EIP-7702 compatible**: Designed as a delegation target for EOA batch execution
- **Slippage protection**: Per-swap and total-sweep slippage checks

#### 3.2 DEX Aggregation Layer

- Current: Single DEX per chain (Aerodrome on Base, Velodrome on Optimism)
- Target: Aggregate 3-5 DEXs per chain, select best price
- Implementation: Backend quote service sends parallel requests to multiple DEX APIs, returns optimal route

#### 3.3 Multi-Chain Expansion

Priority order: Ethereum mainnet > Arbitrum > Polygon > BSC

Per-chain requirements:
- DEX integration (router addresses + API endpoints)
- SweepRouter deployment
- Token list curation + spam filtering

#### 3.4 User System (Pro Features, V2)

- Sign-In with Ethereum (SIWE) for authentication
- Subscription state: on-chain NFT or backend database
- Pro features: automated scheduled sweeps, webhook notifications, API access

---

## 4. MVP Implementation Plan

### Scope: 4-6 weeks, Base chain first

#### Phase 1: Smart Contracts (Week 1-2)

- [ ] Develop `SweepRouter.sol` - batch swap with fee extraction
- [ ] Develop `FeeCollector.sol` - fee aggregation and withdrawal
- [ ] Contract testing (Foundry/Hardhat)
- [ ] Security review preparation
- [ ] Deploy to Base Sepolia testnet -> Base mainnet

#### Phase 2: Backend Upgrade (Week 2-3)

- [ ] DEX aggregation service - support Aerodrome + Uniswap V3 on Base
- [ ] Optimal route selection logic
- [ ] Rate limiting + API security hardening
- [ ] Transaction monitoring + analytics instrumentation

#### Phase 3: Frontend Productization (Week 3-5)

- [ ] UI redesign - professional product interface (not demo style)
- [ ] Fee transparency display (show service fee breakdown)
- [ ] Transaction history page
- [ ] Multi-chain switcher (Base first, quick add Arbitrum)
- [ ] Landing page + SEO optimization

#### Phase 4: Launch & Operations (Week 5-6)

- [ ] Smart contract security audit (at least 1 firm)
- [ ] Beta testing (invite-only)
- [ ] Monitoring & alerting (tx failure rate, fee revenue)
- [ ] Social media + crypto community marketing

### Feature Matrix

| Feature | MVP | V2 |
|---------|-----|----|
| Single-signature batch sweep | Yes | Yes |
| Base chain support | Yes | Yes |
| Fee commission (0.3%) | Yes | Yes |
| Spam token filtering | Yes | Yes |
| Multi-DEX aggregation | Yes (2) | Yes (5+) |
| Ethereum / Arbitrum | No | Yes |
| Pro subscription | No | Yes |
| Automated scheduled sweep | No | Yes |
| Open API | No | Yes |
| Browser extension | No | Yes |

### Validation Criteria

1. **Technical**: SweepRouter completes 10+ token batch sweep on Base testnet
2. **Product**: Track DAU, transaction volume, and fee revenue in first month on mainnet
3. **PMF signal**: Monthly return rate > 20%, organic community sharing

---

## 5. Phase 0: Pure Frontend MVP (No Backend, No Contract)

> **Goal**: Ship the fastest possible product to validate demand. No custom contracts, no self-built backend. Use existing DEX aggregator APIs with built-in referral fee support for monetization.

### 5.1 Core Insight: Aggregator API Referral Fees

Major DEX aggregator APIs natively support referral/affiliate fees — **no custom smart contract needed**:

| API | Fee Parameter | Mechanism | Max Fee |
|-----|--------------|-----------|---------|
| **0x Swap API** | `buyTokenPercentageFee` + `feeRecipient` | % of output token sent to your wallet | 10% |
| **1inch API** | `fee` + `referrerAddress` | Basis points from output token | 3% |
| **Paraswap API** | `partner` + `partnerFee` | Basis points from positive slippage | Varies |

This means we can collect 0.3% fees **without deploying any contract** — the aggregator's router contract handles it.

### 5.2 Architecture: Pure Frontend

```
┌─────────────────────────────────────────────────────────┐
│                  Frontend (Next.js on Vercel)            │
│                                                         │
│  ┌─────────────┐  ┌─────────────┐  ┌────────────────┐  │
│  │  Portfolio   │  │   Sweep     │  │   Success +    │  │
│  │  (token list │  │   (quote →  │  │   Social Share │  │
│  │   + select)  │  │    swap)    │  │                │  │
│  └──────┬──────┘  └──────┬──────┘  └────────────────┘  │
│         │                │                              │
│  ┌──────▼────────────────▼──────────────────────────┐   │
│  │        Next.js API Routes (thin proxies)          │   │
│  │   - Protect API keys (server-side env vars)       │   │
│  │   - No business logic, just forward requests      │   │
│  └──────┬────────────────┬──────────────────────────┘   │
└─────────┼────────────────┼──────────────────────────────┘
          │                │
          ▼                ▼
┌─────────────────┐  ┌──────────────────────────────────┐
│   Token Data    │  │       DEX Aggregator API          │
│                 │  │                                    │
│  Covalent API   │  │  0x Swap API (primary)             │
│  (balances +    │  │  - /swap/v1/quote (with fee params)│
│   spam filter)  │  │  - /swap/v1/price (preview)        │
│                 │  │  - Built-in referral fee → our EOA  │
│  Trust Wallet   │  │                                    │
│  (token verify) │  │  Supports: Ethereum, Base, OP,     │
│                 │  │  Arbitrum, Polygon, BSC, Avalanche  │
└─────────────────┘  └──────────────────────────────────┘
```

**Key differences from current demo**:

| Current Demo | Pure Frontend MVP |
|-------------|-------------------|
| Aerodrome/Velodrome per-chain DEX | 0x API — single integration, all chains |
| No fee collection | 0x `buyTokenPercentageFee` → our EOA |
| 2 chains (Base, Optimism) | 7+ chains out of the box |
| Single DEX per chain | Aggregated best price across all DEXs |
| Demo-quality UI | Product-quality UI |
| Mock data fallbacks | Production-only, no mock mode |

### 5.3 Implementation Changes from Demo

#### A. Replace DEX Integration (Biggest Change)

**Current**: Direct calls to Aerodrome/Velodrome API per chain
- `app/api/swap/quote/route.ts` → calls `${AERODROME_API}/v1/quote`
- `app/api/swap/build/route.ts` → calls `${AERODROME_API}/v1/swap/build`
- `hooks/use-swap-quotes.ts` → parses Aerodrome response format
- `hooks/use-swap-builder.ts` → parses Aerodrome build response

**New**: Single 0x Swap API integration across all chains
- `app/api/swap/quote/route.ts` → calls `https://api.0x.org/swap/v1/quote`
  - Add `buyTokenPercentageFee=0.003` (0.3%)
  - Add `feeRecipient=OUR_FEE_WALLET_ADDRESS`
  - Chain selection via API subdomain or header
- `app/api/swap/build/route.ts` → **Remove** (0x quote response includes calldata)
- `hooks/use-swap-quotes.ts` → parse 0x response format (simpler)
- `hooks/use-swap-builder.ts` → extract `to`, `data`, `value` from 0x quote directly

```typescript
// Example: 0x API call with referral fee
const quoteUrl = `https://api.0x.org/swap/v1/quote?` +
  `buyToken=${toToken}` +
  `&sellToken=${fromToken}` +
  `&sellAmount=${amountWei}` +
  `&buyTokenPercentageFee=0.003` +        // 0.3% fee
  `&feeRecipient=${FEE_WALLET_ADDRESS}` +  // Our wallet
  `&slippagePercentage=0.01`;

// Response includes ready-to-send transaction:
// { to, data, value, gas, gasPrice, buyAmount, sellAmount, ... }
```

#### B. Multi-Chain Support (Simplified)

**Current**: Per-chain DEX config + per-chain API endpoints
**New**: Single 0x API, chain specified via parameter

```typescript
// 0x chain-specific endpoints
const ZeroX_CHAIN_URLS: Record<number, string> = {
  1:     'https://api.0x.org/',         // Ethereum
  8453:  'https://base.api.0x.org/',    // Base
  10:    'https://optimism.api.0x.org/', // Optimism
  42161: 'https://arbitrum.api.0x.org/', // Arbitrum
  137:   'https://polygon.api.0x.org/',  // Polygon
  56:    'https://bsc.api.0x.org/',      // BSC
  43114: 'https://avalanche.api.0x.org/',// Avalanche
};
```

Config changes in `providers.tsx`:
```typescript
// Add more chains to wagmi config
chains: [base, optimism, mainnet, arbitrum, polygon]
```

#### C. Fee Transparency in UI

Add a fee breakdown section to `swap-configuration.tsx`:
```
Swap Summary
├── Input value:       $100.00
├── DEX fee:           ~$0.30 (0.3%)
├── Service fee:        $0.30 (0.3%)  ← NEW: transparent display
├── Gas (estimated):   ~$0.05
└── You receive:       ~$99.35
```

#### D. Remove Mock Data / Dev Mode

Current demo has extensive mock data fallbacks. For product:
- Remove all mock token data from `lib/config.ts`
- Remove mock quotes from `hooks/use-swap-quotes.ts`
- Remove mock calls from `hooks/use-swap-builder.ts`
- Remove "Dev Mode" badge
- Show proper error states instead of silent fallbacks

#### E. Token Balance Source (Keep Covalent, Enhance)

Current Covalent integration works well. Enhancements:
- Add proper loading skeletons
- Better spam filtering UX (show spam count, allow override)
- Show token logos from 0x token registry as fallback

### 5.4 New Features for Product

#### Transaction History (localStorage)

Store sweep history locally (no backend needed):
```typescript
interface SweepRecord {
  timestamp: number
  chainId: number
  txHash: string
  tokensSwept: number
  inputValueUsd: number
  outputToken: string
  outputAmount: string
  feeUsd: number
}
// Store in localStorage, display in a "History" tab
```

#### Multi-Chain Switcher

Replace the current 2-chain hardcoded setup with a dynamic chain selector:
- Show chain logos and names
- Display token count per chain (fetched on switch)
- Remember last used chain

#### Improved Landing Page

Current landing is functional but demo-quality. Product version needs:
- Clear value proposition ("Convert dust to USDC in one click")
- Social proof section (transaction count, volume)
- Supported chains display
- FAQ section
- Connect wallet CTA

### 5.5 Environment Variables (Simplified)

```bash
# Required
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=<Reown project ID>

# Token data (server-side)
COVALENT_API_KEY=<Covalent/QuickNode API key>

# DEX aggregator (server-side)
ZEROX_API_KEY=<0x API key>

# Fee collection
NEXT_PUBLIC_FEE_RECIPIENT=<your EOA address for fee collection>
NEXT_PUBLIC_FEE_PERCENTAGE=0.003  # 0.3%

# RPC endpoints (client-side, one per chain)
NEXT_PUBLIC_BASE_RPC_URL=<Base RPC>
NEXT_PUBLIC_OPTIMISM_RPC_URL=<Optimism RPC>
NEXT_PUBLIC_ETHEREUM_RPC_URL=<Ethereum RPC>
NEXT_PUBLIC_ARBITRUM_RPC_URL=<Arbitrum RPC>
```

**Removed**: `AERODROME_BASE_API`, `VELODROME_OPTIMISM_API` (replaced by single 0x API)

### 5.6 Deployment

Vercel (zero-config for Next.js):
- Frontend + API routes deploy together
- Serverless functions for API proxies
- Edge caching for static assets
- Custom domain

### 5.7 Implementation Plan (2 weeks)

#### Week 1: Core Swap Engine Replacement

| Day | Task |
|-----|------|
| 1-2 | Replace swap API routes: Aerodrome/Velodrome → 0x Swap API with fee params |
| 2-3 | Update `use-swap-quotes.ts` and `use-swap-builder.ts` for 0x response format |
| 3-4 | Add multi-chain config (wagmi chains + 0x endpoints + Covalent chain names) |
| 4-5 | Remove all mock data, add proper error states |
| 5   | End-to-end test: connect wallet → select tokens → get quotes → execute sweep on Base |

#### Week 2: Product Polish + Ship

| Day | Task |
|-----|------|
| 1   | Fee transparency UI (show service fee in swap summary) |
| 2   | Transaction history (localStorage) + history tab |
| 2   | Multi-chain switcher UI |
| 3   | Landing page redesign |
| 4   | Analytics integration (Vercel Analytics / Mixpanel) |
| 4   | Deploy to Vercel with production env vars |
| 5   | Test on mainnet with real dust tokens, fix edge cases |

### 5.8 What This Version Validates

| Question | How We'll Know |
|----------|----------------|
| Do people want to sweep dust tokens? | DAU, sweep transaction count |
| Is 0.3% fee acceptable? | Conversion rate (quote → execute) |
| Which chains have most demand? | Per-chain sweep volume |
| What's the average sweep size? | Transaction value distribution |
| Do users come back? | Weekly retention rate |

### 5.9 Limitations of Pure Frontend Version

| Limitation | Impact | Upgrade Path |
|------------|--------|--------------|
| Fee via aggregator API (not enforced on-chain) | User could bypass by calling DEX directly | → SweepRouter contract (Phase 1) |
| No user accounts | Can't do Pro pricing tiers | → SIWE + backend (Phase 2) |
| localStorage history | Lost on browser clear | → Backend + DB (Phase 2) |
| 0x API rate limits | May throttle high-volume users | → Multiple API keys + caching (Phase 1) |
| No automated sweeps | Users must manually trigger | → Cron + keeper bot (Phase 2) |

### 5.10 Path to Full Product

```
Phase 0 (NOW - 2 weeks)     Phase 1 (Month 2)           Phase 2 (Month 3+)
Pure Frontend MVP            + Smart Contract             + Backend + Pro
─────────────────           ──────────────────           ──────────────────
✓ 0x API + referral fee     + SweepRouter.sol            + User accounts (SIWE)
✓ EIP-7702 batch swap       + On-chain fee enforcement   + Pro tier (0.15%)
✓ 5+ chains                 + Contract audit             + Automated sweeps
✓ Fee transparency           + Own liquidity routing     + API for B2B
✓ Basic analytics           + Advanced analytics         + Keeper bots
```

---

## 6. Summary & Recommendations

### Feasibility Rating: 4/5

**Reasons to build**:
- Real market gap (DustSweeper deprecated, no decentralized alternative)
- Perfect EIP-7702 timing (wallets already support it)
- Pure frontend MVP can ship in 2 weeks with aggregator referral fees
- No contract audit needed for Phase 0

**Key risks**:
- Shallow moat - large DEXs can replicate quickly
- Fee bypass possible (users can call DEX directly) — acceptable for validation phase
- 0x API dependency — mitigated by easy switch to 1inch/Paraswap

### Recommended Priority

1. **Ship Phase 0 in 2 weeks** — validate demand with real users before investing in contracts
2. **Base + Ethereum first** — highest dust token concentration
3. **Track fee revenue from day 1** — this is your PMF signal
4. **Only build SweepRouter if Phase 0 shows traction** — don't over-invest before validation
5. **Consider B2B early** — wallet teams may want to embed sweep functionality
