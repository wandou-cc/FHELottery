import { useState, useCallback, useEffect } from 'react';
import { Contract, BrowserProvider, JsonRpcProvider, formatEther } from 'ethers';
import contractABI from '../contract/abi.json';

const CONTRACT_ADDRESS = '0x002784c1e871843863Ad1086bcf73ff71284eF9c';

// Sepolia testnet RPC URL
const SEPOLIA_RPC_URL = 'https://sepolia.infura.io/v3/YOUR_INFURA_KEY'; // 需要替换为实际的Infura key
const FALLBACK_RPC_URL = 'https://ethereum-sepolia.publicnode.com';

export const useContract = (account) => {
  const [contract, setContract] = useState(null);
  const [isWalletConnected, setIsWalletConnected] = useState(false);
  const [contractStatus, setContractStatus] = useState({
    isBuyingOpen: false,
    hasDrawn: false,
    currentTicketId: 0,
    prizePool: '0'
  });

  useEffect(() => {
    const initializeContract = async () => {
      try {
        let provider;
        let contractInstance;

        if (account && window.ethereum) {
          // 有钱包连接时，使用BrowserProvider
          provider = new BrowserProvider(window.ethereum);
          const signer = await provider.getSigner();
          contractInstance = new Contract(CONTRACT_ADDRESS, contractABI, signer);
          setIsWalletConnected(true);
        } else {
          // 没有钱包连接时，使用公共Provider
          provider = new JsonRpcProvider(FALLBACK_RPC_URL);
          contractInstance = new Contract(CONTRACT_ADDRESS, contractABI, provider);
          setIsWalletConnected(false);
        }

        setContract(contractInstance);

        // 立即更新状态（对于公共读取）
        if (!account) {
          await updateStatusForPublic(contractInstance);
        }
      } catch (error) {
        console.error('Failed to create contract instance:', error);
        setContract(null);
        setIsWalletConnected(false);
      }
    };

    initializeContract();
  }, [account]);

  // 公共读取状态的函数（不需要签名）
  const updateStatusForPublic = useCallback(async (contractInstance) => {
    if (!contractInstance) return;

    try {
      // 首先检查合约是否存在
      const code = await contractInstance.runner.provider.getCode(CONTRACT_ADDRESS);
      if (code === '0x') {
        console.error('Contract not found at address:', CONTRACT_ADDRESS);
        return;
      }

      const [isBuyingOpen, hasDrawn, currentTicketId, totalPrizePool] = await Promise.all([
        contractInstance.isBuyingOpen(),
        contractInstance.hasDrawn(),
        contractInstance.currentTicketId(),
        contractInstance.getTotalPrizePool()
      ]);

      setContractStatus({
        isBuyingOpen,
        hasDrawn,
        currentTicketId: currentTicketId.toString(),
        prizePool: formatEther(totalPrizePool)
      });
    } catch (error) {
      console.error('Failed to update contract status for public:', error);
      // 如果是合约不存在或网络错误，重置状态
      if (error.code === 'BAD_DATA' || error.message.includes('could not decode')) {
        console.error('Contract may not be deployed or wrong network');
        setContractStatus({
          isBuyingOpen: false,
          hasDrawn: false,
          currentTicketId: 0,
          prizePool: '0'
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
      if (code === '0x') {
        console.error('Contract not found at address:', CONTRACT_ADDRESS);
        return;
      }

      const [isBuyingOpen, hasDrawn, currentTicketId, totalPrizePool] = await Promise.all([
        contract.isBuyingOpen(),
        contract.hasDrawn(),
        contract.currentTicketId(),
        contract.getTotalPrizePool()
      ]);

      setContractStatus({
        isBuyingOpen,
        hasDrawn,
        currentTicketId: currentTicketId.toString(),
        prizePool: formatEther(totalPrizePool)
      });
    } catch (error) {
      console.error('Failed to update contract status:', error);
      // 如果是合约不存在或网络错误，重置状态
      if (error.code === 'BAD_DATA' || error.message.includes('could not decode')) {
        console.error('Contract may not be deployed or wrong network');
        setContractStatus({
          isBuyingOpen: false,
          hasDrawn: false,
          currentTicketId: 0,
          prizePool: '0'
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
    contractAddress: CONTRACT_ADDRESS
  };
};

