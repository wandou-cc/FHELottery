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
      });
    } else {
      setContract(null);
    }
  }, [account]);

  const updateStatus = useCallback(async () => {
    if (!contract) return;

    try {
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
    }
  }, [contract]);

  return {
    contract,
    contractStatus,
    updateStatus,
    contractAddress: CONTRACT_ADDRESS
  };
};

