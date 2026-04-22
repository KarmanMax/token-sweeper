"use client";
import "@rainbow-me/rainbowkit/styles.css";

import type React from "react";
import { WagmiProvider } from "wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { getDefaultConfig, RainbowKitProvider, darkTheme } from "@rainbow-me/rainbowkit";
import { base, optimism, mainnet, arbitrum, polygon } from "wagmi/chains";
import { http } from "wagmi";

const config = getDefaultConfig({
  chains: [base, optimism],
  transports: {
    [base.id]: http(
      process.env.NEXT_PUBLIC_BASE_RPC_URL || "https://mainnet.base.org"
    ),
    // [mainnet.id]: http(
    //   process.env.NEXT_PUBLIC_ETHEREUM_RPC_URL || "https://eth.llamarpc.com"
    // ),
    // [arbitrum.id]: http(
    //   process.env.NEXT_PUBLIC_ARBITRUM_RPC_URL || "https://arb1.arbitrum.io/rpc"
    // ),
    [optimism.id]: http(
      process.env.NEXT_PUBLIC_OPTIMISM_RPC_URL || "https://mainnet.optimism.io"
    ),
    // [polygon.id]: http(
    //   process.env.NEXT_PUBLIC_POLYGON_RPC_URL || "https://polygon-rpc.com"
    // ),
  },

  projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || "demo",
  appName: "Token Sweeper",
});

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

export function Web3Provider({ children }: { children: React.ReactNode }) {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider
          modalSize="compact"
          initialChain={base}
          theme={darkTheme({
            accentColor: "hsl(186 100% 50%)",
            accentColorForeground: "hsl(222 47% 5%)",
            borderRadius: "small",
          })}
        >
          {children}
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
