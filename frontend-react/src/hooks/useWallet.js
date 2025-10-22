import { useState, useEffect, useCallback } from 'react';
import { BrowserProvider, formatEther } from 'ethers';

const SEPOLIA_CHAIN_ID = '0xaa36a7'; // 11155111

export const useWallet = () => {
  const [account, setAccount] = useState(null);
  const [balance, setBalance] = useState('0');
  const [provider, setProvider] = useState(null);
  const [signer, setSigner] = useState(null);

  const updateBalance = useCallback(async (address, browserProvider) => {
    if (!browserProvider || !address) return;
    try {
      const balance = await browserProvider.getBalance(address);
      setBalance(parseFloat(formatEther(balance)).toFixed(4));
    } catch (error) {
      console.error('Failed to get balance:', error);
    }
  }, []);

  const checkNetwork = async () => {
    if (!window.ethereum) return false;
    
    try {
      const chainId = await window.ethereum.request({ method: 'eth_chainId' });
      
      if (chainId !== SEPOLIA_CHAIN_ID) {
        try {
          await window.ethereum.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: SEPOLIA_CHAIN_ID }],
          });
        } catch (switchError) {
          if (switchError.code === 4902) {
            await window.ethereum.request({
              method: 'wallet_addEthereumChain',
              params: [{
                chainId: SEPOLIA_CHAIN_ID,
                chainName: 'Sepolia Test Network',
                nativeCurrency: {
                  name: 'SepoliaETH',
                  symbol: 'ETH',
                  decimals: 18,
                },
                rpcUrls: ['https://sepolia.infura.io/v3'],
                blockExplorerUrls: ['https://sepolia.etherscan.io'],
              }],
            });
          } else {
            throw switchError;
          }
        }
      }
      return true;
    } catch (error) {
      console.error('Network check failed:', error);
      return false;
    }
  };

  const connectWallet = async () => {
    if (!window.ethereum) {
      alert('Please install MetaMask wallet');
      return;
    }

    try {
      // Check and switch network
      const networkOk = await checkNetwork();
      if (!networkOk) {
        throw new Error('Failed to switch to Sepolia network');
      }

      // Request account access
      const accounts = await window.ethereum.request({ 
        method: 'eth_requestAccounts' 
      });

      const browserProvider = new BrowserProvider(window.ethereum);
      const signer = await browserProvider.getSigner();

      setAccount(accounts[0]);
      setProvider(browserProvider);
      setSigner(signer);
      
      updateBalance(accounts[0], browserProvider);
    } catch (error) {
      console.error('Wallet connection failed:', error);
      alert('Failed to connect wallet: ' + error.message);
    }
  };

  const disconnectWallet = () => {
    setAccount(null);
    setBalance('0');
    setProvider(null);
    setSigner(null);
  };

  // Check for existing connection
  useEffect(() => {
    if (window.ethereum) {
      window.ethereum.request({ method: 'eth_accounts' })
        .then(async accounts => {
          if (accounts.length > 0) {
            const browserProvider = new BrowserProvider(window.ethereum);
            const signer = await browserProvider.getSigner();
            
            setAccount(accounts[0]);
            setProvider(browserProvider);
            setSigner(signer);
            updateBalance(accounts[0], browserProvider);
          }
        })
        .catch(console.error);

      // Listen for account changes
      window.ethereum.on('accountsChanged', (accounts) => {
        if (accounts.length === 0) {
          disconnectWallet();
        } else {
          setAccount(accounts[0]);
          if (provider) {
            updateBalance(accounts[0], provider);
          }
        }
      });

      // Listen for network changes
      window.ethereum.on('chainChanged', () => {
        window.location.reload();
      });
    }
  }, [provider, updateBalance]);

  return {
    account,
    balance,
    provider,
    signer,
    connectWallet,
    disconnectWallet
  };
};

