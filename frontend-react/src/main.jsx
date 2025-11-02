import React from "react";
import ReactDOM from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { WagmiProvider } from "wagmi";
import { RainbowKitProvider } from "@rainbow-me/rainbowkit";
import "@rainbow-me/rainbowkit/styles.css";
import App from "./App";
import "./index.css";
import { HeroUIProvider } from "@heroui/react";
import { wagmiConfig } from "./config/wagmi";

// 创建 React Query 客户端
const queryClient = new QueryClient();

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider
          appInfo={{
            appName: "FHEVM Lottery",
            learnMoreUrl: "https://docs.zama.ai/fhevm",
          }}
          initialChain={11155111} // Sepolia
          modalSize="compact"
        >
          <HeroUIProvider>
            <App />
          </HeroUIProvider>
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  </React.StrictMode>,
);
