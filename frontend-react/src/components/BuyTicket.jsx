import React, { useState, useEffect } from 'react';
import { parseEther } from 'ethers';
import { Button, Card, CardHeader, CardBody, Chip, Divider } from '@heroui/react';
import { FiZap, FiRotateCcw, FiCheck, FiShoppingCart } from 'react-icons/fi';

const BuyTicket = ({ 
  account, 
  contract, 
  fhevmInstance, 
  contractStatus,
  showLoading, 
  hideLoading, 
  showNotification,
  onPurchaseComplete 
}) => {
  const [mainNumbers, setMainNumbers] = useState([]);
  const [bonusNumbers, setBonusNumbers] = useState([]);

  const toggleMainNumber = (num) => {
    if (mainNumbers.includes(num)) {
      setMainNumbers(mainNumbers.filter(n => n !== num));
    } else if (mainNumbers.length < 5) {
      setMainNumbers([...mainNumbers, num].sort((a, b) => a - b));
    } else {
      showNotification('You can only select 5 main numbers', 'warning');
    }
  };

  const toggleBonusNumber = (num) => {
    if (bonusNumbers.includes(num)) {
      setBonusNumbers(bonusNumbers.filter(n => n !== num));
    } else if (bonusNumbers.length < 2) {
      setBonusNumbers([...bonusNumbers, num].sort((a, b) => a - b));
    } else {
      showNotification('You can only select 2 bonus numbers', 'warning');
    }
  };

  const encryptNumbers = async () => {
    if (!fhevmInstance) {
      throw new Error('FHEVM instance not initialized');
    }

    const allNumbers = [...mainNumbers, ...bonusNumbers];
    console.log('🔐 Encrypting numbers:', allNumbers);

    // Create encrypted input buffer
    const buffer = fhevmInstance.createEncryptedInput(
      contract.target, // Contract address (ethers v6)
      account          // User address
    );

    // Add 7 euint8 numbers
    allNumbers.forEach(num => buffer.add8(BigInt(num)));

    // Encrypt and upload to relayer
    console.log('🔐 Encrypting and uploading to relayer...');
    const encryptedData = await buffer.encrypt();

    console.log('✅ Encryption successful');
    console.log('Handles:', encryptedData.handles);
    console.log('InputProof length:', encryptedData.inputProof.length);

    return encryptedData;
  };

  const handlePurchase = async () => {
    if (!account) {
      showNotification('Please connect your wallet first', 'error');
      return;
    }

    if (!fhevmInstance) {
      showNotification('FHEVM not initialized. Please wait...', 'error');
      return;
    }

    if (mainNumbers.length !== 5 || bonusNumbers.length !== 2) {
      showNotification('Please select 5 main numbers and 2 bonus numbers', 'warning');
      return;
    }

    try {
      showLoading('Encrypting your lottery numbers...');

      // Encrypt numbers using FHEVM SDK
      const encryptedData = await encryptNumbers();

      showLoading('Sending purchase transaction...');

      // Call contract to buy ticket
      const tx = await contract.buyTicket(
        encryptedData.handles[0],
        encryptedData.handles[1],
        encryptedData.handles[2],
        encryptedData.handles[3],
        encryptedData.handles[4],
        encryptedData.handles[5],
        encryptedData.handles[6],
        encryptedData.inputProof,
        { 
          value: parseEther('0.001'),
          gasLimit: 2000000n
        }
      );

      showNotification('Transaction submitted, waiting for confirmation...', 'info');
      console.log('⏳ Waiting for transaction confirmation...');

      const receipt = await tx.wait();

      if (receipt.status === 1) {
        // Save plaintext numbers to localStorage
        const event = receipt.logs.find(log => {
          try {
            const parsed = contract.interface.parseLog(log);
            return parsed && parsed.name === 'TicketPurchased';
          } catch {
            return false;
          }
        });

        if (event) {
          const parsed = contract.interface.parseLog(event);
          const ticketId = parsed.args.ticketId.toString();
          saveTicketNumbers(ticketId, mainNumbers, bonusNumbers, receipt.hash);
        }

        showNotification('🎉 Ticket purchased successfully!', 'success');
        console.log('✅ Purchase successful, tx hash:', receipt.hash);

        // Clear selection
        setMainNumbers([]);
        setBonusNumbers([]);

        // Update contract status
        if (onPurchaseComplete) {
          setTimeout(onPurchaseComplete, 1000);
        }
      } else {
        showNotification('Transaction failed', 'error');
      }
    } catch (error) {
      console.error('❌ Purchase failed:', error);
      
      if (error.code === 'ACTION_REJECTED') {
        showNotification('Transaction cancelled', 'warning');
      } else if (error.message && error.message.includes('execution reverted')) {
        showNotification('Contract execution failed, buying may be closed', 'error');
      } else {
        showNotification('Purchase failed: ' + error.message, 'error');
      }
    } finally {
      hideLoading();
    }
  };

  const saveTicketNumbers = (ticketId, main, bonus, txHash) => {
    try {
      const storageKey = `lottery_tickets_${account.toLowerCase()}`;
      const existing = JSON.parse(localStorage.getItem(storageKey) || '{}');
      existing[ticketId] = {
        mainNumbers: main,
        bonusNumbers: bonus,
        purchaseTime: Date.now(),
        txHash
      };
      localStorage.setItem(storageKey, JSON.stringify(existing));
      console.log('✅ Ticket numbers saved locally:', ticketId);
    } catch (error) {
      console.error('Failed to save ticket numbers:', error);
    }
  };

  const canPurchase = mainNumbers.length === 5 && 
                      bonusNumbers.length === 2 && 
                      account && 
                      fhevmInstance &&
                      contractStatus.isBuyingOpen &&
                      !contractStatus.hasDrawn;

  const handleQuickPick = () => {
    // Generate 5 random main numbers (0-31)
    const randomMain = [];
    while (randomMain.length < 5) {
      const num = Math.floor(Math.random() * 32);
      if (!randomMain.includes(num)) randomMain.push(num);
    }
    setMainNumbers(randomMain.sort((a, b) => a - b));

    // Generate 2 random bonus numbers (0-9)
    const randomBonus = [];
    while (randomBonus.length < 2) {
      const num = Math.floor(Math.random() * 10);
      if (!randomBonus.includes(num)) randomBonus.push(num);
    }
    setBonusNumbers(randomBonus.sort((a, b) => a - b));
    showNotification('Lucky numbers generated! 🍀', 'success');
  };

  const handleClearAll = () => {
    setMainNumbers([]);
    setBonusNumbers([]);
  };

  return (
    <div className="space-y-6">
      {/* Header with Quick Actions */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-title mb-1">Choose Your Numbers</h2>
          <p className="text-subtitle">Your numbers will be encrypted with FHE before submission</p>
        </div>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="solid"
            className="btn-black px-3 py-2"
            onPress={handleQuickPick}
            startContent={<FiZap className="w-4 h-4" />}
          >
            Quick Pick
          </Button>
          <Button
            size="sm"
            variant="flat"
            className="bg-black/10 text-black hover:bg-black/20"
            onPress={handleClearAll}
            isDisabled={mainNumbers.length === 0 && bonusNumbers.length === 0}
            startContent={<FiRotateCcw className="w-4 h-4" />}
          >
            Clear All
          </Button>
        </div>
      </div>

      {/* Main Numbers */}
      <Card className="card-flat">
        <CardBody className="p-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="text-3xl">🎱</div>
              <div>
                <h3 className="text-xl font-bold text-black">Main Numbers</h3>
                <p className="text-sm text-black/70">Select 5 numbers from 0-31</p>
              </div>
            </div>
            <Chip 
              color={mainNumbers.length === 5 ? "success" : "warning"} 
              variant="flat"
              size="lg"
              className="font-bold"
            >
              {mainNumbers.length}/5
            </Chip>
          </div>

          <div className="grid grid-cols-8 gap-1.5 mb-3">
            {Array.from({ length: 32 }, (_, i) => (
              <button
                key={i}
                onClick={() => toggleMainNumber(i)}
                disabled={!account || !fhevmInstance}
                className={`
                  relative aspect-square rounded-lg font-bold text-base
                  transition-all duration-200 transform
                  ${mainNumbers.includes(i)
                    ? 'bg-black text-white scale-105'
                    : 'bg-black/10 text-black hover:bg-black/20 hover:scale-105'
                  }
                  disabled:opacity-30 disabled:cursor-not-allowed
                `}
              >
                {i}
                {mainNumbers.includes(i) && (
                  <div className="absolute -top-1 -right-1 w-5 h-5 bg-amber-400 rounded-full flex items-center justify-center">
                    <FiCheck className="w-3 h-3 text-secondary-900" />
                  </div>
                )}
              </button>
            ))}
          </div>

          {mainNumbers.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap p-4 bg-black/5 rounded-xl">
              <span className="text-sm font-semibold text-black">Selected:</span>
              {mainNumbers.map(num => (
                <div key={num} className="lottery-ball w-12 h-12 text-base">
                  {num}
                </div>
              ))}
            </div>
          )}
        </CardBody>
      </Card>

      {/* Bonus Numbers */}
      <Card className="card-flat">
        <CardBody className="p-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="text-3xl">⭐</div>
              <div>
                <h3 className="text-xl font-bold text-black">Bonus Numbers</h3>
                <p className="text-sm text-black/70">Select 2 bonus numbers from 0-9</p>
              </div>
            </div>
            <Chip 
              color={bonusNumbers.length === 2 ? "success" : "warning"} 
              variant="flat"
              size="lg"
              className="font-bold"
            >
              {bonusNumbers.length}/2
            </Chip>
          </div>

          <div className="grid grid-cols-10 gap-1.5 mb-3">
            {Array.from({ length: 10 }, (_, i) => (
              <button
                key={i}
                onClick={() => toggleBonusNumber(i)}
                disabled={!account || !fhevmInstance}
                className={`
                  relative aspect-square rounded-lg font-bold text-base
                  transition-all duration-200 transform
                  ${bonusNumbers.includes(i)
                    ? 'bg-black text-white scale-105'
                    : 'bg-black/10 text-black hover:bg-black/20 hover:scale-105'
                  }
                  disabled:opacity-30 disabled:cursor-not-allowed
                `}
              >
                {i}
                {bonusNumbers.includes(i) && (
                  <div className="absolute -top-1 -right-1 w-5 h-5 bg-amber-400 rounded-full flex items-center justify-center">
                    <FiCheck className="w-3 h-3 text-secondary-900" />
                  </div>
                )}
              </button>
            ))}
          </div>

          {bonusNumbers.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap p-4 bg-black/5 rounded-xl">
              <span className="text-sm font-semibold text-black">Selected:</span>
              {bonusNumbers.map(num => (
                <div key={num} className="lottery-ball w-12 h-12 text-base" style={{ background: 'linear-gradient(135deg, #d946ef 0%, #c026d3 100%)' }}>
                  {num}
                </div>
              ))}
            </div>
          )}
        </CardBody>
      </Card>

      {/* Purchase Section */}
      <Card className="card-flat">
        <CardBody className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-black/70 mb-1">Ticket Price</p>
              <div className="flex items-center gap-2">
                <span className="text-4xl font-bold text-black">0.001</span>
                <span className="text-2xl text-black/70">ETH</span>
              </div>
            </div>
            
            <Button
              size="md"
              className={`px-8 py-4 text-base font-bold btn-black ${canPurchase ? '' : 'opacity-60'}`}
              isDisabled={!canPurchase}
              onPress={handlePurchase}
              startContent={<FiShoppingCart className="w-5 h-5" />}
            >
              Purchase Ticket
            </Button>
          </div>

          {/* Status Messages */}
          {!canPurchase && (
            <div className="mt-4 space-y-2">
              {!account && (
                <Chip color="warning" variant="flat" size="sm" className="w-full justify-center">
                  🔌 Please connect your wallet first
                </Chip>
              )}
              {account && !fhevmInstance && (
                <Chip color="warning" variant="flat" size="sm" className="w-full justify-center">
                  ⏳ Initializing FHEVM encryption...
                </Chip>
              )}
              {account && fhevmInstance && !contractStatus.isBuyingOpen && (
                <Chip color="danger" variant="flat" size="sm" className="w-full justify-center">
                  🚫 Ticket sales are currently closed
                </Chip>
              )}
              {account && fhevmInstance && contractStatus.hasDrawn && (
                <Chip color="primary" variant="flat" size="sm" className="w-full justify-center">
                  ✅ Draw completed. Waiting for next round...
                </Chip>
              )}
              {account && fhevmInstance && contractStatus.isBuyingOpen && !contractStatus.hasDrawn && 
               mainNumbers.length !== 5 && (
                <Chip color="warning" variant="flat" size="sm" className="w-full justify-center">
                  ⚠️ Select 5 main numbers ({mainNumbers.length}/5 selected)
                </Chip>
              )}
              {account && fhevmInstance && contractStatus.isBuyingOpen && !contractStatus.hasDrawn && 
               mainNumbers.length === 5 && bonusNumbers.length !== 2 && (
                <Chip color="warning" variant="flat" size="sm" className="w-full justify-center">
                  ⚠️ Select 2 bonus numbers ({bonusNumbers.length}/2 selected)
                </Chip>
              )}
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  );
};

export default BuyTicket;

