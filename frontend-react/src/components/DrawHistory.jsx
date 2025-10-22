import React, { useState } from 'react';
import { Button, Card, CardHeader, CardBody, Chip, Divider, Link } from '@heroui/react';
import { FiExternalLink, FiInfo, FiAward, FiUnlock } from 'react-icons/fi';

const DrawHistory = ({ contract, fhevmInstance, showLoading, hideLoading, showNotification }) => {
  const [drawHistory, setDrawHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [decryptedNumbers, setDecryptedNumbers] = useState({});

  const loadDrawHistory = async () => {
    if (!contract) {
      showNotification('Please connect your wallet first', 'error');
      return;
    }

    try {
      setLoading(true);
      showLoading('Loading draw history...');

      // Query NumbersDrawn events
      // Limit to last 2 days (approximately 14,400 blocks on Sepolia, 12s per block)
      const currentBlock = await contract.runner.provider.getBlockNumber();
      const blocksPerDay = 7200; // 12s per block * 60 * 60 * 24 / 12
      const fromBlock = currentBlock - (blocksPerDay * 14); // Last 2 days
      
      console.log(`📊 Querying draw history from block ${fromBlock} to ${currentBlock}`);
      
      const filter = contract.filters.NumbersDrawn();
      const events = await contract.queryFilter(filter, fromBlock, 'latest');

      console.log('📜 Found', events.length, 'draw events');

      if (events.length === 0) {
        setDrawHistory([]);
        hideLoading();
        setLoading(false);
        return;
      }

      // Get block info for each event
      const historyPromises = events.map(async (event) => {
        const block = await event.getBlock();
        return {
          blockNumber: event.blockNumber,
          timestamp: block.timestamp,
          txHash: event.hash
        };
      });

      const history = await Promise.all(historyPromises);
      setDrawHistory(history.reverse()); // Show newest first

      hideLoading();
      setLoading(false);
      showNotification('History loaded successfully', 'success');
    } catch (error) {
      console.error('❌ Failed to load draw history:', error);
      showNotification('Failed to load history: ' + error.message, 'error');
      hideLoading();
      setLoading(false);
    }
  };

  const decryptWinningNumbers = async (blockNumber) => {
    if (!fhevmInstance) {
      showNotification('FHEVM not initialized', 'error');
      return;
    }

    try {
      showLoading('Requesting access permission...');

      // Check if already drawn
      const hasDrawn = await contract.hasDrawn();
      if (!hasDrawn) {
        throw new Error('Numbers not drawn yet');
      }

      // Step 1: Request access permission
      console.log('🔑 Requesting access to winning numbers...');
      try {
        const signer = await contract.runner;
        const account = await signer.getAddress();
        const accessTx = await contract.allowWinningNumbersAccess(account);
        console.log('⏳ Waiting for access permission...');
        await accessTx.wait();
        console.log('✅ Access granted');
      } catch (error) {
        console.log('⚠️ Access request failed (may already have access):', error.message);
        // Continue, may already have access
      }

      showLoading('Fetching encrypted numbers...');

      // Step 2: Get encrypted winning numbers
      console.log('🔍 Fetching encrypted winning numbers...');
      const winningNumbers = await contract.getWinningNumbers();

      console.log('🔐 Encrypted winning numbers:', winningNumbers);

      const handles = [
        winningNumbers.num1,
        winningNumbers.num2,
        winningNumbers.num3,
        winningNumbers.num4,
        winningNumbers.num5,
        winningNumbers.bonus1,
        winningNumbers.bonus2
      ];

      // Check for zero handles
      const zeroHandle = '0x0000000000000000000000000000000000000000000000000000000000000000';
      if (handles.some(h => h === zeroHandle)) {
        throw new Error('Winning numbers not properly initialized');
      }

      // Step 3: User decrypt all numbers
      showLoading('Decrypting winning numbers (this may take 10-30 seconds)...');
      console.log('🔐 Starting user decryption...');
      const decryptedValues = await userDecryptNumbers(contract, fhevmInstance, handles);

      console.log('✅ Decrypted winning numbers:', decryptedValues);

      // Save decrypted numbers
      setDecryptedNumbers(prev => ({
        ...prev,
        [blockNumber]: decryptedValues
      }));

      // Also save to localStorage for all users
      saveDecryptedWinningNumbers(blockNumber, decryptedValues);

      hideLoading();
      showNotification('✅ Winning numbers decrypted successfully!', 'success');
    } catch (error) {
      hideLoading();
      console.error('❌ Failed to decrypt winning numbers:', error);

      let errorMessage = error.message;
      if (error.message.includes('not drawn')) {
        errorMessage = 'Numbers not drawn yet. Please wait for the draw.';
      } else if (error.message.includes('network')) {
        errorMessage = 'Network error. Please check your connection.';
      } else if (error.message.includes('user rejected') || error.message.includes('rejected')) {
        errorMessage = 'Signature rejected. Please approve the signature request.';
      }

      showNotification('Failed to decrypt: ' + errorMessage, 'error');
    }
  };

  const userDecryptNumbers = async (contract, fhevmInstance, encryptedHandles) => {
    try {
      console.log('🔐 User decryption of', encryptedHandles.length, 'handles');

      const signer = await contract.runner;
      const userAddress = await signer.getAddress(); // Get checksum address
      const contractAddress = await contract.getAddress(); // Get checksum address

      console.log('📝 User address:', userAddress);
      console.log('📝 Contract address:', contractAddress);

      // Generate keypair
      console.log('🔑 Generating keypair...');
      const keypair = fhevmInstance.generateKeypair();

      // Create EIP712 signature
      const startTimeStamp = Math.floor(Date.now() / 1000).toString();
      const durationDays = '10';
      const contractAddresses = [contractAddress];

      console.log('📝 Creating EIP712 message...');
      console.log('  Timestamp:', startTimeStamp);
      console.log('  Duration:', durationDays);
      
      const eip712 = fhevmInstance.createEIP712(
        keypair.publicKey,
        contractAddresses,
        startTimeStamp,
        durationDays
      );

      console.log('🖊️ Requesting signature...');
      // Sign (ethers v6 syntax)
      const signature = await signer.signTypedData(
        eip712.domain,
        { UserDecryptRequestVerification: eip712.types.UserDecryptRequestVerification },
        eip712.message
      );

      console.log('✅ Signature obtained');

      // Prepare decrypt request
      const handleContractPairs = encryptedHandles.map(handle => ({
        handle: handle,
        contractAddress: contractAddress
      }));

      console.log('🌐 Calling relayer for decryption...');
      console.log('  Handles:', encryptedHandles.length);
      console.log('  User:', userAddress);
      
      // Batch user decrypt
      const result = await fhevmInstance.userDecrypt(
        handleContractPairs,
        keypair.privateKey,
        keypair.publicKey,
        signature.replace('0x', ''),
        contractAddresses,
        userAddress, // Use checksum address from getAddress()
        startTimeStamp,
        durationDays
      );

      console.log('✅ Relayer response received:', result);

      // Extract decrypted values
      const decryptedValues = [];
      for (const handle of encryptedHandles) {
        const value = result[handle];
        if (value === undefined || value === null) {
          console.warn('⚠️ No value for handle:', handle);
          decryptedValues.push(0);
        } else {
          const numValue = parseInt(value);
          console.log(`  Handle ${handle.slice(0, 10)}... → ${numValue}`);
          decryptedValues.push(numValue);
        }
      }

      console.log('✅ User decryption completed:', decryptedValues);
      return decryptedValues;
    } catch (error) {
      console.error('❌ User decryption failed:', error);
      throw error;
    }
  };

  const saveDecryptedWinningNumbers = (blockNumber, numbers) => {
    try {
      const storageKey = 'lottery_winning_numbers';
      const existing = JSON.parse(localStorage.getItem(storageKey) || '{}');
      existing[blockNumber] = {
        numbers,
        decryptedAt: Date.now()
      };
      localStorage.setItem(storageKey, JSON.stringify(existing));
      console.log('✅ Winning numbers saved for block:', blockNumber);
    } catch (error) {
      console.error('Failed to save winning numbers:', error);
    }
  };

  const getDecryptedWinningNumbers = (blockNumber) => {
    // Check state first
    if (decryptedNumbers[blockNumber]) {
      return decryptedNumbers[blockNumber];
    }

    // Check localStorage
    try {
      const storageKey = 'lottery_winning_numbers';
      const existing = JSON.parse(localStorage.getItem(storageKey) || '{}');
      return existing[blockNumber]?.numbers || null;
    } catch (error) {
      console.error('Failed to get winning numbers:', error);
      return null;
    }
  };

  const LotteryBall = ({ number, type = 'main' }) => (
    <div
      className={`
        lottery-ball w-14 h-14 text-lg
        ${type === 'main' 
          ? 'bg-gradient-to-br from-amber-400 to-orange-600' 
          : 'bg-gradient-to-br from-rose-400 to-red-600'
        }
      `}
    >
      {number}
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-title mb-1">Draw History</h2>
          <p className="text-subtitle">View past lottery draws and winning numbers</p>
        </div>
        <Button
          size="sm"
          variant="flat"
          className="bg-white/10 text-white hover:bg-white/20"
          isDisabled={loading || !contract}
          onPress={loadDrawHistory}
          startContent={
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
          }
        >
          Load History
        </Button>
      </div>

      {drawHistory.length === 0 && !loading && (
        <Card className="card-flat">
          <CardBody className="p-12 text-center">
            <div className="text-6xl mb-4">📜</div>
            <h3 className="text-xl font-bold text-black mb-2">No History Yet</h3>
            <p className="text-black/80 mb-4">Click "Load History" to view past draws</p>
            <Button
              size="lg"
              className="btn-black font-semibold"
              onPress={loadDrawHistory}
              isDisabled={!contract}
            >
              Load Draw History
            </Button>
          </CardBody>
        </Card>
      )}

      {drawHistory.map((draw, index) => {
        const drawDate = new Date(draw.timestamp * 1000).toLocaleString();
        const round = drawHistory.length - index;
        const numbers = getDecryptedWinningNumbers(draw.blockNumber);

        return (
          <Card
            key={draw.blockNumber}
            className="card-flat"
            style={{ animationDelay: `${index * 0.1}s` }}
          >
            <CardBody className="p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <div className="text-3xl">🏆</div>
                    <div>
                      <h3 className="text-2xl font-bold text-black">Round #{round}</h3>
                      <p className="text-sm text-black/70">📅 {drawDate}</p>
                    </div>
                  </div>
                  <Chip
                    size="sm"
                    variant="flat"
                    className="bg-black/10 text-black font-mono"
                  >
                    Block: {draw.blockNumber}
                  </Chip>
                </div>
                <Link
                  href={`https://sepolia.etherscan.io/tx/${draw.txHash}`}
                  isExternal
                  className="text-black/70 hover:text-black transition-colors"
                >
                  <FiExternalLink className="w-5 h-5" />
                </Link>
              </div>

              {numbers ? (
                <div className="bg-black/5 rounded-2xl p-5 border border-black/10">
                  <div className="flex items-center gap-2 mb-4">
                    <FiAward className="w-5 h-5 text-white" />
                    <div>
                      <h4 className="font-bold text-black text-lg">Winning Numbers</h4>
                      <p className="text-xs text-black/60">Official draw results</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3 flex-wrap mb-4">
                    {numbers.slice(0, 5).map((num, idx) => (
                      <LotteryBall key={`main-${idx}`} number={num} type="main" />
                    ))}
                    <span className="text-3xl font-bold text-white/80">+</span>
                    {numbers.slice(5, 7).map((num, idx) => (
                      <LotteryBall key={`bonus-${idx}`} number={num} type="bonus" />
                    ))}
                  </div>

                  <div className="p-3 bg-black/5 rounded-xl border border-black/10">
                    <p className="text-xs text-black/80 flex items-center gap-2">
                      <FiInfo className="w-4 h-4" />
                      These numbers were decrypted from the blockchain
                    </p>
                  </div>
                </div>
              ) : (
                <div className="bg-black/5 rounded-2xl p-5 border border-black/10">
                  <div className="flex items-center gap-3 mb-4 text-black/70">
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                    <div>
                      <p className="font-semibold text-black">Numbers Encrypted</p>
                      <p className="text-sm">Click below to decrypt and view</p>
                    </div>
                  </div>
                  
                  <Button
                    size="lg"
                    className="w-full btn-black font-bold"
                    onPress={() => decryptWinningNumbers(draw.blockNumber)}
                    startContent={<FiUnlock className="w-5 h-5" />}
                  >
                    Decrypt Winning Numbers
                  </Button>
                  
                  <p className="text-xs text-black/60 mt-3 text-center">
                    ⏱️ Decryption may take 10-30 seconds
                  </p>
                </div>
              )}
            </CardBody>
          </Card>
        );
      })}
    </div>
  );
};

export default DrawHistory;

