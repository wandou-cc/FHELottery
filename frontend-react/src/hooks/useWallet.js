import { useState, useEffect, useCallback } from 'react';
import { BrowserProvider, formatEther } from 'ethers';

const SEPOLIA_CHAIN_ID = '0xaa36a7'; // 11155111

export const useWallet = () => {
  const [account, setAccount] = useState(null);
  const [balance, setBalance] = useState('0');
  const [provider, setProvider] = useState(null);
  const [signer, setSigner] = useState(null);
  const [isManuallyDisconnected, setIsManuallyDisconnected] = useState(() => {
    // 从localStorage读取断开连接状态
    return localStorage.getItem('walletManuallyDisconnected') === 'true';
  });

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

      // 验证网络ID
      const network = await browserProvider.getNetwork();
      if (network.chainId !== 11155111n) {
        throw new Error('Please switch to Sepolia testnet (Chain ID: 11155111)');
      }

      setAccount(accounts[0]);
      setProvider(browserProvider);
      setSigner(signer);
      setIsManuallyDisconnected(false);
      localStorage.setItem('walletManuallyDisconnected', 'false');
      
      updateBalance(accounts[0], browserProvider);
    } catch (error) {
      console.error('Wallet connection failed:', error);
      alert('Failed to connect wallet: ' + error.message);
    }
  };

  const disconnectWallet = useCallback(() => {
    console.log('🔌 Disconnecting wallet...');
    
    // 清除所有状态
    setAccount(null);
    setBalance('0');
    setProvider(null);
    setSigner(null);
    setIsManuallyDisconnected(true);
    
    // 保存断开连接状态到localStorage
    localStorage.setItem('walletManuallyDisconnected', 'true');
    
    console.log('✅ Wallet disconnected');
  }, []);

  // Check for existing connection
  useEffect(() => {
    if (window.ethereum) {
      // 只有在用户没有主动断开连接时才自动连接
      if (!isManuallyDisconnected) {
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
      }

      // Listen for account changes
      const handleAccountsChanged = (accounts) => {
        if (accounts.length === 0) {
          disconnectWallet();
        } else if (!isManuallyDisconnected) {
          // 只有在用户没有主动断开连接时才更新账户
          setAccount(accounts[0]);
          if (provider) {
            updateBalance(accounts[0], provider);
          }
        }
      };

      // Listen for network changes
      const handleChainChanged = () => {
        window.location.reload();
      };

      window.ethereum.on('accountsChanged', handleAccountsChanged);
      window.ethereum.on('chainChanged', handleChainChanged);

      // 清理监听器
      return () => {
        if (window.ethereum.removeListener) {
          window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
          window.ethereum.removeListener('chainChanged', handleChainChanged);
        }
      };
    }
  }, [provider, updateBalance, disconnectWallet, isManuallyDisconnected]);

  return {
    account,
    balance,
    provider,
    signer,
    connectWallet,
    disconnectWallet
  };
};

