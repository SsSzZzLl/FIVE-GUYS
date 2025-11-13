import type { PropsWithChildren } from "react";
import {
  RainbowKitProvider,
  getDefaultConfig,
  midnightTheme,
} from "@rainbow-me/rainbowkit";
import "@rainbow-me/rainbowkit/styles.css";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { WagmiProvider } from "wagmi";
import { transports, SUPPORTED_CHAINS } from "@/config/chains";

const queryClient = new QueryClient();

const wagmiConfig = getDefaultConfig({
  appName: "BlindBox DApp",
  projectId: import.meta.env.VITE_WALLET_CONNECT_ID || "00000000000000000000000000000000",
  chains: SUPPORTED_CHAINS,
  transports,
  batch: {
    multicall: false,
  },
  ssr: false,
});

export function Web3Provider({ children }: PropsWithChildren) {
  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider
          theme={midnightTheme({
            accentColor: "#8F5FFF",
            accentColorForeground: "#ffffff",
            borderRadius: "medium",
            overlayBlur: "small",
          })}
        >
          {children}
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}

