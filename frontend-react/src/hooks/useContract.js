import { useState, useCallback, useEffect } from 'react';
import { Contract, BrowserProvider, formatEther } from 'ethers';
import contractABI from '../contract/abi.json';

const CONTRACT_ADDRESS = '0x002784c1e871843863Ad1086bcf73ff71284eF9c';

export const useContract = (account) => {
  const [contract, setContract] = useState(null);
  const [contractStatus, setContractStatus] = useState({
    isBuyingOpen: false,
    hasDrawn: false,
    currentTicketId: 0,
    prizePool: '0'
  });

  useEffect(() => {
    if (account && window.ethereum) {
      const provider = new BrowserProvider(window.ethereum);
      provider.getSigner().then(signer => {
        const contractInstance = new Contract(CONTRACT_ADDRESS, contractABI, signer);
        setContract(contractInstance);
      }).catch(error => {
        console.error('Failed to create contract instance:', error);
        setContract(null);
      });
    } else {
      setContract(null);
    }
  }, [account]);

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
    contractAddress: CONTRACT_ADDRESS
  };
};

