import { useState, useCallback, useEffect } from 'react';

// Load FHEVM SDK dynamically from CDN
let fhevmSDK = null;

const loadFHEVMSDK = async () => {
  if (fhevmSDK) return fhevmSDK;

  try {
    // Import from CDN (browser-compatible version)
    const module = await import('https://cdn.zama.ai/relayer-sdk-js/0.2.0/relayer-sdk-js.js');
    fhevmSDK = module;
    return module;
  } catch (error) {
    console.error('Failed to load FHEVM SDK:', error);
    throw error;
  }
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
      
      const { initSDK, createInstance, SepoliaConfig } = fhevmSDK;
      
      // Step 1: Initialize the SDK (load WASM)
      await initSDK();
      console.log('✅ FHEVM SDK initialized');

      // Step 2: Create FHEVM instance with Sepolia config
      const instance = await createInstance({
        ...SepoliaConfig,
        network: window.ethereum
      });

      console.log('✅ FHEVM instance created successfully');
      setFhevmInstance(instance);
    } catch (err) {
      console.error('❌ FHEVM initialization failed:', err);
      setError(err.message);
    } finally {
      setIsInitializing(false);
    }
  }, [fhevmInstance, isInitializing, sdkLoaded]);

  return {
    fhevmInstance,
    isInitializing,
    error,
    sdkLoaded,
    initializeFHEVM
  };
};

