import { http } from "wagmi";
import { sepolia } from "wagmi/chains";
import { getDefaultConfig } from "@rainbow-me/rainbowkit";

// 获取项目ID - 从环境变量获取（可选，用于 WalletConnect）
const projectId = import.meta.env.VITE_WALLETCONNECT_PROJECT_ID || "YOUR_PROJECT_ID";

// 使用 RainbowKit 的 getDefaultConfig 来自动配置所有支持的钱包
// 这样可以正确区分 MetaMask、OKX 等不同的钱包
export const wagmiConfig = getDefaultConfig({
  appName: "FHEVM Lottery",
  projectId: projectId,
  chains: [sepolia],
  transports: {
    [sepolia.id]: http(),
  },
  ssr: false,
});

export { projectId };
