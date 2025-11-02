import { useAccount, useBalance, useConnect, useDisconnect, useSwitchChain } from "wagmi";
import { BrowserProvider } from "ethers";
import { useMemo } from "react";

export const useWallet = () => {
  // Wagmi hooks
  const { address, isConnected, chainId, connector } = useAccount();
  const { connect, connectors, isPending, error: connectError } = useConnect();
  const { disconnect } = useDisconnect();
  const { switchChain } = useSwitchChain();
  const { data: balanceData } = useBalance({
    address: address,
  });

  // 转换为 ethers provider 和 signer（如果需要）
  const provider = useMemo(() => {
    if (!isConnected || !connector) return null;
    // wagmi 使用 viem，但我们的合约可能需要 ethers
    // 这里返回 connector 的 provider，后续可以通过它创建 BrowserProvider
    return connector;
  }, [isConnected, connector]);

  // 获取余额字符串
  const balance = useMemo(() => {
    if (!balanceData) return "0";
    return parseFloat(balanceData.formatted).toFixed(4);
  }, [balanceData]);

  // 连接钱包函数（打开钱包选择器）
  const connectWallet = async () => {
    // 这个函数现在由 WalletConnectButton 组件处理
    // 保留这个函数以保持接口兼容
    if (connectors.length > 0) {
      // 尝试连接第一个可用的连接器（通常是 injected）
      connect({ connector: connectors[0] });
    }
  };

  // 断开钱包
  const disconnectWallet = () => {
    disconnect();
  };

  // 切换网络（如果需要）
  const switchToSepolia = async () => {
    if (chainId !== 11155111n) {
      try {
        switchChain({ chainId: 11155111 });
      } catch (error) {
        console.error("切换网络失败:", error);
      }
    }
  };

  // 辅助函数：识别 provider 类型
  const identifyProvider = (provider) => {
    if (!provider) return null;
    if (provider.isMetaMask) return { type: "metaMask", provider };
    if (
      provider.isOkxWallet ||
      provider.isOKExWallet ||
      provider.constructor?.name?.includes("Okx") ||
      provider.constructor?.name?.includes("OKX")
    ) {
      return { type: "okx", provider };
    }
    return { type: "unknown", provider };
  };

  // 通过 connector 和账户来确认当前活跃的 provider
  const getActiveProvider = async (targetAccount, connector) => {
    if (typeof window === "undefined" || !window.ethereum) {
      return null;
    }

    if (!window.ethereum.providers || !Array.isArray(window.ethereum.providers)) {
      return window.ethereum;
    }

    // 优先通过 connector 信息来确定
    if (connector) {
      const connectorId = connector.id?.toLowerCase() || "";
      const connectorName = connector.name?.toLowerCase() || "";

      // 如果明确是 MetaMask，直接返回 MetaMask provider
      if (
        connectorId.includes("metamask") ||
        connectorId.includes("io.metamask") ||
        connectorName.includes("metamask")
      ) {
        console.log("🎯 useWallet: Connector indicates MetaMask");
        for (const provider of window.ethereum.providers) {
          if (provider.isMetaMask) {
            console.log("✅ useWallet: Found and using MetaMask provider directly");
            return provider;
          }
        }
      }

      // 如果明确是 OKX
      if (
        connectorId.includes("okx") ||
        connectorId.includes("okex") ||
        connectorName.includes("okx") ||
        connectorName.includes("okex")
      ) {
        console.log("🎯 useWallet: Connector indicates OKX");
        for (const provider of window.ethereum.providers) {
          const identified = identifyProvider(provider);
          if (identified && identified.type === "okx") {
            console.log("✅ useWallet: Found and using OKX provider");
            return provider;
          }
        }
      }
    }

    // 回退：通过账户匹配查找
    if (targetAccount) {
      console.log("🔍 useWallet: Falling back to account matching for:", targetAccount);
      for (const provider of window.ethereum.providers) {
        try {
          const accounts = await provider.request({ method: "eth_accounts" });
          if (accounts && accounts.length > 0) {
            const providerAccount = accounts[0].toLowerCase();
            const targetAccountLower = targetAccount.toLowerCase();

            if (providerAccount === targetAccountLower) {
              const identified = identifyProvider(provider);
              console.log(`✅ useWallet: Found provider (${identified?.type || "unknown"}) by account match`);
              return provider;
            }
          }
        } catch (error) {
          continue;
        }
      }
    }

    return null;
  };

  // 根据 connector 选择正确的 provider
  const getProviderByConnector = async (connector, targetAccount) => {
    if (typeof window === "undefined" || !window.ethereum) {
      return null;
    }

    // 🔑 关键修复：优先使用 connector 提供的 provider
    if (connector && typeof connector.getProvider === "function") {
      try {
        console.log("🎯 useWallet: Using connector.getProvider() for:", connector.name);
        const connectorProvider = await connector.getProvider();
        if (connectorProvider) {
          console.log("✅ useWallet: Got provider from connector:", {
            name: connector.name,
            id: connector.id,
            isMetaMask: connectorProvider.isMetaMask,
            isOkxWallet: connectorProvider.isOkxWallet,
          });
          return new BrowserProvider(connectorProvider);
        }
      } catch (error) {
        console.warn("⚠️ useWallet: Failed to get provider from connector:", error);
      }
    }

    // 首先尝试通过 connector 和账户找到活跃的 provider
    const activeProvider = await getActiveProvider(targetAccount, connector);
    if (activeProvider) {
      return new BrowserProvider(activeProvider);
    }

    if (!connector) {
      if (window.ethereum.isMetaMask) {
        return new BrowserProvider(window.ethereum);
      }
      if (window.ethereum.providers) {
        const metaMask = window.ethereum.providers.find((p) => p.isMetaMask);
        if (metaMask) return new BrowserProvider(metaMask);
      }
      return new BrowserProvider(window.ethereum);
    }

    const connectorId = connector.id?.toLowerCase() || "";
    const connectorName = connector.name?.toLowerCase() || "";

    const providers =
      window.ethereum.providers && Array.isArray(window.ethereum.providers)
        ? window.ethereum.providers
        : [window.ethereum];

    if (connectorId.includes("metamask") || connectorId.includes("io.metamask") || connectorName.includes("metamask")) {
      console.log("🎯 useWallet: User selected MetaMask, finding MetaMask provider...");
      for (const provider of providers) {
        const identified = identifyProvider(provider);
        if (identified && identified.type === "metaMask") {
          console.log("✅ useWallet: Found and using MetaMask provider");
          return new BrowserProvider(identified.provider);
        }
      }
    }

    if (
      connectorId.includes("okx") ||
      connectorId.includes("okex") ||
      connectorName.includes("okx") ||
      connectorName.includes("okex")
    ) {
      console.log("🎯 useWallet: User selected OKX, finding OKX provider...");
      for (const provider of providers) {
        const identified = identifyProvider(provider);
        if (identified && identified.type === "okx") {
          console.log("✅ useWallet: Found and using OKX provider");
          return new BrowserProvider(identified.provider);
        }
      }
    }

    if (window.ethereum.isMetaMask) {
      return new BrowserProvider(window.ethereum);
    }
    if (window.ethereum.providers) {
      const metaMask = window.ethereum.providers.find((p) => p.isMetaMask);
      if (metaMask) return new BrowserProvider(metaMask);
    }
    return new BrowserProvider(window.ethereum);
  };

  // 创建 ethers BrowserProvider（用于兼容现有代码）
  const getEthersProvider = async () => {
    if (!isConnected || !address) return null;

    try {
      return await getProviderByConnector(connector, address);
    } catch (error) {
      console.error("创建 ethers provider 失败:", error);
    }
    return null;
  };

  // 获取 signer（用于兼容现有代码）
  const getSigner = async () => {
    const ethersProvider = await getEthersProvider();
    if (ethersProvider) {
      return await ethersProvider.getSigner();
    }
    return null;
  };

  return {
    account: address || null,
    balance,
    provider: provider ? { getEthersProvider, getSigner } : null,
    signer: null, // 需要时通过 getSigner() 获取
    isConnected,
    chainId,
    connector,
    connectors,
    connectWallet,
    disconnectWallet,
    switchToSepolia,
    isPending,
    connectError,
    // 提供兼容性方法
    getEthersProvider,
    getSigner,
  };
};
