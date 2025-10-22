import { useState, useCallback, useEffect } from 'react';

// Load FHEVM SDK dynamically from CDN
let fhevmSDK = null;

const loadFHEVMSDK = async () => {
  if (fhevmSDK) return fhevmSDK;

  const cdnUrls = [
    'https://cdn.zama.ai/relayer-sdk-js/0.2.0/relayer-sdk-js.js',
    'https://unpkg.com/@zama-fhe/relayer-sdk@0.2.0/dist/index.js'
  ];

  for (const url of cdnUrls) {
    try {
      console.log(`📦 Loading FHEVM SDK from ${url}...`);
      const module = await import(url);
      
      // 验证模块是否包含必要的函数
      if (!module.initSDK || !module.createInstance) {
        throw new Error('FHEVM SDK module is missing required functions');
      }
      
      fhevmSDK = module;
      console.log('✅ FHEVM SDK loaded successfully');
      return module;
    } catch (error) {
      console.warn(`⚠️ Failed to load from ${url}:`, error.message);
      continue;
    }
  }
  
  // 所有URL都失败了
  const error = new Error('Failed to load FHEVM SDK from all sources');
  console.error('❌', error.message);
  fhevmSDK = null;
  throw error;
};

export const useFHEVM = () => {
  const [fhevmInstance, setFhevmInstance] = useState(null);
  const [isInitializing, setIsInitializing] = useState(false);
  const [error, setError] = useState(null);
  const [sdkLoaded, setSdkLoaded] = useState(false);

  // Load SDK on mount
  useEffect(() => {
    loadFHEVMSDK()
      .then(() => {
        console.log('✅ FHEVM SDK loaded from CDN');
        setSdkLoaded(true);
      })
      .catch(err => {
        console.error('❌ Failed to load FHEVM SDK:', err);
        setError(err.message);
      });
  }, []);

  const initializeFHEVM = useCallback(async () => {
    if (fhevmInstance || isInitializing || !sdkLoaded) return;

    setIsInitializing(true);
    setError(null);

    try {
      console.log('🔐 Initializing FHEVM SDK...');
      
      // 确保SDK已加载
      if (!fhevmSDK) {
        console.log('🔄 SDK not loaded yet, loading now...');
        await loadFHEVMSDK();
      }
      
      const { initSDK, createInstance } = fhevmSDK;
      
      // Step 1: Initialize the SDK (load WASM)
      await initSDK();
      console.log('✅ FHEVM SDK initialized');

      // Step 2: Create FHEVM instance with Zama testnet config
      // 使用正确的Zama测试网配置
      const instance = await createInstance({
        // ACL_CONTRACT_ADDRESS (FHEVM Host chain)
        aclContractAddress: '0x687820221192C5B662b25367F70076A37bc79b6c',
        // KMS_VERIFIER_CONTRACT_ADDRESS (FHEVM Host chain)
        kmsContractAddress: '0x1364cBBf2cDF5032C47d8226a6f6FBD2AFCDacAC',
        // INPUT_VERIFIER_CONTRACT_ADDRESS (FHEVM Host chain)
        inputVerifierContractAddress: '0xbc91f3daD1A5F19F8390c400196e58073B6a0BC4',
        // DECRYPTION_ADDRESS (Gateway chain)
        verifyingContractAddressDecryption: '0xb6E160B1ff80D67Bfe90A85eE06Ce0A2613607D1',
        // INPUT_VERIFICATION_ADDRESS (Gateway chain)
        verifyingContractAddressInputVerification: '0x7048C39f048125eDa9d678AEbaDfB22F7900a29F',
        // FHEVM Host chain id
        chainId: 11155111,
        // Gateway chain id
        gatewayChainId: 55815,
        // Optional RPC provider to host chain
        network: window.ethereum,
        // Relayer URL
        relayerUrl: 'https://relayer.testnet.zama.cloud',
      });

      console.log('✅ FHEVM instance created successfully');
      setFhevmInstance(instance);
    } catch (err) {
      console.error('❌ FHEVM initialization failed:', err);
      setError(err.message);
      
      // 如果是KMS相关错误，尝试使用更简单的配置
      if (err.message.includes('getKmsSigners') || err.message.includes('BAD_DATA') || err.message.includes('Cannot destructure')) {
        console.log('🔄 Retrying with minimal configuration...');
        try {
          // 确保SDK已加载
          if (!fhevmSDK) {
            await loadFHEVMSDK();
          }
          
          const { createInstance } = fhevmSDK;
          const instance = await createInstance({
            chainId: 11155111,
            network: window.ethereum,
          });
          console.log('✅ FHEVM instance created with minimal config');
          setFhevmInstance(instance);
          setError(null);
        } catch (retryErr) {
          console.error('❌ Retry also failed:', retryErr);
          setError(retryErr.message);
        }
      }
    } finally {
      setIsInitializing(false);
    }
  }, [fhevmInstance, isInitializing, sdkLoaded]);

  const resetFHEVM = useCallback(() => {
    console.log('🔄 Resetting FHEVM instance...');
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
    resetFHEVM
  };
};

