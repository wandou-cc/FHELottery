import { useState, useCallback, useEffect } from "react";
import { Contract, BrowserProvider, JsonRpcProvider, formatEther } from "ethers";
import { useAccount } from "wagmi";
import contractABI from "../contract/abi.json";

const CONTRACT_ADDRESS = "0x002784c1e871843863Ad1086bcf73ff71284eF9c";

// Sepolia testnet RPC URL
const SEPOLIA_RPC_URL = "https://sepolia.infura.io/v3/YOUR_INFURA_KEY"; // 需要替换为实际的Infura key
const FALLBACK_RPC_URL = "https://ethereum-sepolia.publicnode.com";

// 辅助函数：根据钱包标识符识别 provider
const identifyProvider = (provider) => {
  if (!provider) return null;

  // 检查是否是 MetaMask
  if (provider.isMetaMask) {
    return { type: "metaMask", provider };
  }

  // 检查是否是 OKX
  if (
    provider.isOkxWallet ||
    provider.isOKExWallet ||
    provider.constructor?.name?.includes("Okx") ||
    provider.constructor?.name?.includes("OKX")
  ) {
    return { type: "okx", provider };
  }

  // 检查其他钱包标识
  if (provider.isCoinbaseWallet) {
    return { type: "coinbase", provider };
  }

  if (provider.isTrust) {
    return { type: "trust", provider };
  }

  return { type: "unknown", provider };
};

// 辅助函数：通过检查 selectedAddress 和实际请求来确认当前活跃的 provider
const getActiveProvider = async (targetAccount, connector) => {
  if (typeof window === "undefined" || !window.ethereum) {
    return null;
  }

  // 如果没有多个 provider，直接使用
  if (!window.ethereum.providers || !Array.isArray(window.ethereum.providers)) {
    console.log("✅ useContract: Single provider detected, using window.ethereum");
    return window.ethereum;
  }

  // 优先通过 connector 信息来确定
  if (connector) {
    const connectorId = connector.id?.toLowerCase() || "";
    const connectorName = connector.name?.toLowerCase() || "";

    console.log("🔍 useContract: Checking connector:", { connectorId, connectorName });

    // 如果明确是 MetaMask，直接返回 MetaMask provider，不做额外检查
    if (connectorId.includes("metamask") || connectorId.includes("io.metamask") || connectorName.includes("metamask")) {
      console.log("🎯 useContract: Connector indicates MetaMask, searching for MetaMask provider...");
      for (const provider of window.ethereum.providers) {
        if (provider.isMetaMask) {
          console.log("✅ useContract: Found and using MetaMask provider directly (connector match)");
          return provider;
        }
      }
      console.warn("⚠️ useContract: Connector indicates MetaMask but MetaMask provider not found");
    }

    // 如果明确是 OKX
    if (
      connectorId.includes("okx") ||
      connectorId.includes("okex") ||
      connectorName.includes("okx") ||
      connectorName.includes("okex")
    ) {
      console.log("🎯 useContract: Connector indicates OKX");
      for (const provider of window.ethereum.providers) {
        const identified = identifyProvider(provider);
        if (identified && identified.type === "okx") {
          console.log("✅ useContract: Using OKX provider");
          return provider;
        }
      }
    }
  }

  // 回退：通过账户匹配查找
  if (targetAccount) {
    console.log("🔍 useContract: Falling back to account matching for:", targetAccount);
    for (const provider of window.ethereum.providers) {
      try {
        const accounts = await provider.request({ method: "eth_accounts" });
        if (accounts && accounts.length > 0) {
          const providerAccount = accounts[0].toLowerCase();
          const targetAccountLower = targetAccount.toLowerCase();

          if (providerAccount === targetAccountLower) {
            const identified = identifyProvider(provider);
            console.log(`✅ useContract: Found provider (${identified?.type || "unknown"}) by account match`);
            return provider;
          }
        }
      } catch (error) {
        continue;
      }
    }
  }

  console.log("⚠️ useContract: Could not determine active provider, will use first available");
  return null;
};

// 辅助函数：根据 connector 信息选择正确的 provider
const getProviderByConnector = async (connector, targetAccount) => {
  if (typeof window === "undefined" || !window.ethereum) {
    return null;
  }

  // 🔑 关键修复：优先使用 connector 提供的 provider
  if (connector && typeof connector.getProvider === "function") {
    try {
      console.log("🎯 useContract: Using connector.getProvider() for:", connector.name);
      const connectorProvider = await connector.getProvider();
      if (connectorProvider) {
        console.log("✅ useContract: Got provider from connector:", {
          name: connector.name,
          id: connector.id,
          isMetaMask: connectorProvider.isMetaMask,
          isOkxWallet: connectorProvider.isOkxWallet,
        });
        return new BrowserProvider(connectorProvider);
      }
    } catch (error) {
      console.warn("⚠️ useContract: Failed to get provider from connector:", error);
    }
  }

  // 首先尝试通过 connector 和账户找到活跃的 provider
  const activeProvider = await getActiveProvider(targetAccount, connector);
  if (activeProvider) {
    return new BrowserProvider(activeProvider);
  }

  // 如果没有 connector，回退到原来的逻辑
  if (!connector) {
    return getProviderFromEthereum();
  }

  const connectorId = connector.id?.toLowerCase() || "";
  const connectorName = connector.name?.toLowerCase() || "";

  console.log("🔍 useContract: Connector info:", {
    id: connectorId,
    name: connectorName,
    fullConnector: connector,
  });

  // 检查是否有多个 provider
  const providers =
    window.ethereum.providers && Array.isArray(window.ethereum.providers)
      ? window.ethereum.providers
      : [window.ethereum];

  // 如果用户选择的是 MetaMask
  if (connectorId.includes("metamask") || connectorId.includes("io.metamask") || connectorName.includes("metamask")) {
    console.log("🎯 useContract: User selected MetaMask, finding MetaMask provider...");

    // 查找 MetaMask provider
    for (const provider of providers) {
      const identified = identifyProvider(provider);
      if (identified && identified.type === "metaMask") {
        console.log("✅ useContract: Found and using MetaMask provider");
        return new BrowserProvider(identified.provider);
      }
    }

    console.warn("⚠️ useContract: MetaMask connector selected but MetaMask provider not found");
  }

  // 如果用户选择的是 OKX
  if (
    connectorId.includes("okx") ||
    connectorId.includes("okex") ||
    connectorName.includes("okx") ||
    connectorName.includes("okex")
  ) {
    console.log("🎯 useContract: User selected OKX, finding OKX provider...");

    // 查找 OKX provider
    for (const provider of providers) {
      const identified = identifyProvider(provider);
      if (identified && identified.type === "okx") {
        console.log("✅ useContract: Found and using OKX provider");
        return new BrowserProvider(identified.provider);
      }
    }

    console.warn("⚠️ useContract: OKX connector selected but OKX provider not found");
  }

  // 如果无法识别，回退到识别所有 provider 并优先选择 MetaMask
  console.log("⚠️ useContract: Cannot identify connector, falling back to provider detection");
  return getProviderFromEthereum();
};

// 获取正确的 provider（从 window.ethereum，RainbowKit 会管理连接）
const getProviderFromEthereum = () => {
  if (typeof window === "undefined" || !window.ethereum) {
    return null;
  }

  // 如果是 MetaMask，直接使用
  if (window.ethereum.isMetaMask) {
    console.log("✅ useContract: Using MetaMask from window.ethereum");
    return new BrowserProvider(window.ethereum);
  }

  // 如果有多个 provider，查找 MetaMask
  if (window.ethereum.providers && Array.isArray(window.ethereum.providers)) {
    const metaMaskProvider = window.ethereum.providers.find((p) => p.isMetaMask);
    if (metaMaskProvider) {
      console.log("✅ useContract: Found MetaMask in providers array");
      return new BrowserProvider(metaMaskProvider);
    }
    // 如果找不到 MetaMask，使用第一个可用的 provider
    if (window.ethereum.providers.length > 0) {
      console.log("⚠️ useContract: MetaMask not found, using first available provider");
      return new BrowserProvider(window.ethereum.providers[0]);
    }
  }

  // 回退到默认的 window.ethereum
  console.log("⚠️ useContract: Using default window.ethereum");
  return new BrowserProvider(window.ethereum);
};

export const useContract = (account) => {
  const { connector } = useAccount();
  const [contract, setContract] = useState(null);
  const [isWalletConnected, setIsWalletConnected] = useState(false);
  const [contractStatus, setContractStatus] = useState({
    isBuyingOpen: false,
    hasDrawn: false,
    currentTicketId: 0,
    prizePool: "0",
  });

  useEffect(() => {
    const initializeContract = async () => {
      try {
        let provider;
        let contractInstance;

        if (account) {
          // 有钱包连接时，根据 connector 信息和账户选择正确的 provider
          console.log("🔗 Initializing contract with wallet:", account);
          provider = await getProviderByConnector(connector, account);

          if (provider) {
            const signer = await provider.getSigner();
            // 验证 signer 的地址是否匹配
            const signerAddress = await signer.getAddress();
            if (signerAddress.toLowerCase() !== account.toLowerCase()) {
              console.warn(`⚠️ useContract: Signer address (${signerAddress}) doesn't match account (${account})`);
            }
            contractInstance = new Contract(CONTRACT_ADDRESS, contractABI, signer);
            setIsWalletConnected(true);
            console.log("✅ Contract initialized with wallet provider");
          } else {
            throw new Error("No wallet provider available");
          }
        } else {
          // 没有钱包连接时，使用公共Provider
          provider = new JsonRpcProvider(FALLBACK_RPC_URL);
          contractInstance = new Contract(CONTRACT_ADDRESS, contractABI, provider);
          setIsWalletConnected(false);
          console.log("📖 Contract initialized with public provider");
        }

        setContract(contractInstance);

        // 立即更新状态（对于公共读取）
        if (!account) {
          await updateStatusForPublic(contractInstance);
        }
      } catch (error) {
        console.error("Failed to create contract instance:", error);
        setContract(null);
        setIsWalletConnected(false);
      }
    };

    initializeContract();
  }, [account, connector]);

  // 公共读取状态的函数（不需要签名）
  const updateStatusForPublic = useCallback(async (contractInstance) => {
    if (!contractInstance) return;

    try {
      // 首先检查合约是否存在
      const code = await contractInstance.runner.provider.getCode(CONTRACT_ADDRESS);
      if (code === "0x") {
        console.error("Contract not found at address:", CONTRACT_ADDRESS);
        return;
      }

      const [isBuyingOpen, hasDrawn, currentTicketId, totalPrizePool] = await Promise.all([
        contractInstance.isBuyingOpen(),
        contractInstance.hasDrawn(),
        contractInstance.currentTicketId(),
        contractInstance.getTotalPrizePool(),
      ]);

      setContractStatus({
        isBuyingOpen,
        hasDrawn,
        currentTicketId: currentTicketId.toString(),
        prizePool: formatEther(totalPrizePool),
      });
    } catch (error) {
      console.error("Failed to update contract status for public:", error);
      // 如果是合约不存在或网络错误，重置状态
      if (error.code === "BAD_DATA" || error.message.includes("could not decode")) {
        console.error("Contract may not be deployed or wrong network");
        setContractStatus({
          isBuyingOpen: false,
          hasDrawn: false,
          currentTicketId: 0,
          prizePool: "0",
        });
      }
    }
  }, []);

  // 带签名的状态更新函数（用于钱包连接后的操作）
  const updateStatus = useCallback(async () => {
    if (!contract) return;

    try {
      // 首先检查合约是否存在
      const code = await contract.runner.provider.getCode(CONTRACT_ADDRESS);
      if (code === "0x") {
        console.error("Contract not found at address:", CONTRACT_ADDRESS);
        return;
      }

      const [isBuyingOpen, hasDrawn, currentTicketId, totalPrizePool] = await Promise.all([
        contract.isBuyingOpen(),
        contract.hasDrawn(),
        contract.currentTicketId(),
        contract.getTotalPrizePool(),
      ]);

      setContractStatus({
        isBuyingOpen,
        hasDrawn,
        currentTicketId: currentTicketId.toString(),
        prizePool: formatEther(totalPrizePool),
      });
    } catch (error) {
      console.error("Failed to update contract status:", error);
      // 如果是合约不存在或网络错误，重置状态
      if (error.code === "BAD_DATA" || error.message.includes("could not decode")) {
        console.error("Contract may not be deployed or wrong network");
        setContractStatus({
          isBuyingOpen: false,
          hasDrawn: false,
          currentTicketId: 0,
          prizePool: "0",
        });
      }
    }
  }, [contract]);

  return {
    contract,
    contractStatus,
    updateStatus,
    updateStatusForPublic,
    isWalletConnected,
    contractAddress: CONTRACT_ADDRESS,
  };
};
