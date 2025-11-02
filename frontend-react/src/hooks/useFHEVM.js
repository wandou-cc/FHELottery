import { useState, useCallback, useEffect } from "react";
import { useAccount } from "wagmi";

// Load FHEVM SDK dynamically from CDN
let fhevmSDK = null;

const loadFHEVMSDK = async () => {
  if (fhevmSDK) return fhevmSDK;

  const cdnUrls = [
    "https://cdn.zama.org/relayer-sdk-js/0.2.0/relayer-sdk-js.js",
    "https://unpkg.com/@zama-fhe/relayer-sdk@0.2.0/dist/index.js",
  ];

  for (const url of cdnUrls) {
    try {
      console.log(`📦 Loading FHEVM SDK from ${url}...`);
      // @ts-ignore - Dynamic import from CDN
      const module = await import(/* @vite-ignore */ url);

      // 验证模块是否包含必要的函数
      if (!module.initSDK || !module.createInstance) {
        throw new Error("FHEVM SDK module is missing required functions");
      }

      fhevmSDK = module;
      console.log("✅ FHEVM SDK loaded successfully");
      return module;
    } catch (error) {
      console.warn(`⚠️ Failed to load from ${url}:`, error.message);
      continue;
    }
  }

  // 所有URL都失败了
  const error = new Error("Failed to load FHEVM SDK from all sources");
  console.error("❌", error.message);
  fhevmSDK = null;
  throw error;
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

export const useFHEVM = () => {
  const { connector, address } = useAccount();
  const [fhevmInstance, setFhevmInstance] = useState(null);
  const [isInitializing, setIsInitializing] = useState(false);
  const [error, setError] = useState(null);
  const [sdkLoaded, setSdkLoaded] = useState(false);

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
        console.log("🎯 FHEVM: Connector indicates MetaMask");
        for (const provider of window.ethereum.providers) {
          if (provider.isMetaMask) {
            console.log("✅ FHEVM: Found and using MetaMask provider directly");
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
        console.log("🎯 FHEVM: Connector indicates OKX");
        for (const provider of window.ethereum.providers) {
          const identified = identifyProvider(provider);
          if (identified && identified.type === "okx") {
            console.log("✅ FHEVM: Found and using OKX provider");
            return provider;
          }
        }
      }
    }

    // 回退：通过账户匹配查找
    if (targetAccount) {
      console.log("🔍 FHEVM: Falling back to account matching for:", targetAccount);
      for (const provider of window.ethereum.providers) {
        try {
          const accounts = await provider.request({ method: "eth_accounts" });
          if (accounts && accounts.length > 0) {
            const providerAccount = accounts[0].toLowerCase();
            const targetAccountLower = targetAccount.toLowerCase();

            if (providerAccount === targetAccountLower) {
              const identified = identifyProvider(provider);
              console.log(`✅ FHEVM: Found provider (${identified?.type || "unknown"}) by account match`);
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

  // 获取正确的 provider（根据 connector 和账户选择）
  const getProvider = async () => {
    if (typeof window === "undefined" || !window.ethereum) {
      return null;
    }

    // 🔑 关键修复：优先使用 connector 提供的 provider
    if (connector && typeof connector.getProvider === "function") {
      try {
        console.log("🎯 FHEVM: Using connector.getProvider() for:", connector.name);
        const connectorProvider = await connector.getProvider();
        if (connectorProvider) {
          console.log("✅ FHEVM: Got provider from connector:", {
            name: connector.name,
            id: connector.id,
            isMetaMask: connectorProvider.isMetaMask,
            isOkxWallet: connectorProvider.isOkxWallet,
          });
          return connectorProvider;
        }
      } catch (error) {
        console.warn("⚠️ FHEVM: Failed to get provider from connector:", error);
      }
    }

    // 备选方案：通过 connector 和账户找到活跃的 provider
    const activeProvider = await getActiveProvider(address, connector);
    if (activeProvider) {
      return activeProvider;
    }

    // 根据 connector 选择正确的 provider
    if (connector) {
      const connectorId = connector.id?.toLowerCase() || "";
      const connectorName = connector.name?.toLowerCase() || "";

      const providers =
        window.ethereum.providers && Array.isArray(window.ethereum.providers)
          ? window.ethereum.providers
          : [window.ethereum];

      if (
        connectorId.includes("metamask") ||
        connectorId.includes("io.metamask") ||
        connectorName.includes("metamask")
      ) {
        console.log("🎯 FHEVM: User selected MetaMask, finding MetaMask provider...");
        for (const provider of providers) {
          const identified = identifyProvider(provider);
          if (identified && identified.type === "metaMask") {
            console.log("✅ FHEVM: Found and using MetaMask provider");
            return identified.provider;
          }
        }
      }

      if (
        connectorId.includes("okx") ||
        connectorId.includes("okex") ||
        connectorName.includes("okx") ||
        connectorName.includes("okex")
      ) {
        console.log("🎯 FHEVM: User selected OKX, finding OKX provider...");
        for (const provider of providers) {
          const identified = identifyProvider(provider);
          if (identified && identified.type === "okx") {
            console.log("✅ FHEVM: Found and using OKX provider");
            return identified.provider;
          }
        }
      }
    }

    // 回退：优先选择 MetaMask
    if (window.ethereum.isMetaMask) {
      console.log("✅ FHEVM: Using MetaMask from window.ethereum");
      return window.ethereum;
    }

    if (window.ethereum.providers && Array.isArray(window.ethereum.providers)) {
      const metaMask = window.ethereum.providers.find((p) => p.isMetaMask);
      if (metaMask) {
        console.log("✅ FHEVM: Found MetaMask in window.ethereum.providers");
        return metaMask;
      }
      if (window.ethereum.providers.length > 0) {
        console.log("⚠️ FHEVM: MetaMask not found, using first available provider");
        return window.ethereum.providers[0];
      }
    }

    console.log("✅ FHEVM: Using default window.ethereum");
    return window.ethereum;
  };

  // Load SDK on mount
  useEffect(() => {
    loadFHEVMSDK()
      .then(() => {
        console.log("✅ FHEVM SDK loaded from CDN");
        setSdkLoaded(true);
      })
      .catch((err) => {
        console.error("❌ Failed to load FHEVM SDK:", err);
        setError(err.message);
      });
  }, []);

  const initializeFHEVM = useCallback(async () => {
    if (fhevmInstance || isInitializing || !sdkLoaded) return;

    setIsInitializing(true);
    setError(null);

    try {
      console.log("🔐 Initializing FHEVM SDK...");

      // 确保SDK已加载
      if (!fhevmSDK) {
        console.log("🔄 SDK not loaded yet, loading now...");
        await loadFHEVMSDK();
      }

      const { initSDK, createInstance } = fhevmSDK;

      // Step 1: Initialize the SDK (load WASM)
      await initSDK();
      console.log("✅ FHEVM SDK initialized");

      // Step 2: Create FHEVM instance with Zama testnet config
      // 使用正确的Zama测试网配置
      const provider = await getProvider();
      if (!provider) {
        throw new Error("No wallet provider available for FHEVM");
      }

      const instance = await createInstance({
        // ACL_CONTRACT_ADDRESS (FHEVM Host chain)
        aclContractAddress: "0x687820221192C5B662b25367F70076A37bc79b6c",
        // KMS_VERIFIER_CONTRACT_ADDRESS (FHEVM Host chain)
        kmsContractAddress: "0x1364cBBf2cDF5032C47d8226a6f6FBD2AFCDacAC",
        // INPUT_VERIFIER_CONTRACT_ADDRESS (FHEVM Host chain)
        inputVerifierContractAddress: "0xbc91f3daD1A5F19F8390c400196e58073B6a0BC4",
        // DECRYPTION_ADDRESS (Gateway chain)
        verifyingContractAddressDecryption: "0xb6E160B1ff80D67Bfe90A85eE06Ce0A2613607D1",
        // INPUT_VERIFICATION_ADDRESS (Gateway chain)
        verifyingContractAddressInputVerification: "0x7048C39f048125eDa9d678AEbaDfB22F7900a29F",
        // FHEVM Host chain id
        chainId: 11155111,
        // Gateway chain id
        gatewayChainId: 55815,
        // Optional RPC provider to host chain - 使用从 window.ethereum 获取的 provider
        network: provider,
        // Relayer URL
        relayerUrl: "https://relayer.testnet.zama.cloud",
      });

      console.log("✅ FHEVM instance created successfully");
      setFhevmInstance(instance);
    } catch (err) {
      console.error("❌ FHEVM initialization failed:", err);
      setError(err.message);

      // 如果是KMS相关错误，尝试使用更简单的配置
      if (
        err.message.includes("getKmsSigners") ||
        err.message.includes("BAD_DATA") ||
        err.message.includes("Cannot destructure")
      ) {
        console.log("🔄 Retrying with minimal configuration...");
        try {
          // 确保SDK已加载
          if (!fhevmSDK) {
            await loadFHEVMSDK();
          }

          const { createInstance } = fhevmSDK;
          const provider = await getProvider();
          if (!provider) {
            throw new Error("No wallet provider available for FHEVM");
          }
          const instance = await createInstance({
            chainId: 11155111,
            network: provider,
          });
          console.log("✅ FHEVM instance created with minimal config");
          setFhevmInstance(instance);
          setError(null);
        } catch (retryErr) {
          console.error("❌ Retry also failed:", retryErr);
          setError(retryErr.message);
        }
      }
    } finally {
      setIsInitializing(false);
    }
  }, [fhevmInstance, isInitializing, sdkLoaded, connector]);

  const resetFHEVM = useCallback(() => {
    console.log("🔄 Resetting FHEVM instance...");
    setFhevmInstance(null);
    setError(null);
    setIsInitializing(false);
  }, []);

  return {
    fhevmInstance,
    isInitializing,
    error,
    sdkLoaded,
    initializeFHEVM,
    resetFHEVM,
  };
};
