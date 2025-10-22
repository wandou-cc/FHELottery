import React, { useState, useEffect } from 'react';
import { Button, Card, CardHeader, CardBody, Chip, Divider, Badge } from '@heroui/react';
import { FiRefreshCw, FiLock, FiInfo, FiGift } from 'react-icons/fi';

const MyTickets = ({ account, contract, fhevmInstance, showLoading, hideLoading, showNotification }) => {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(false);

  const getTicketNumbers = (ticketId) => {
    try {
      const storageKey = `lottery_tickets_${account.toLowerCase()}`;
      const existing = JSON.parse(localStorage.getItem(storageKey) || '{}');
      return existing[ticketId] || null;
    } catch (error) {
      console.error('Failed to get ticket numbers:', error);
      return null;
    }
  };

  const loadMyTickets = async () => {
    if (!contract || !account) {
      showNotification('Please connect your wallet first', 'error');
      return;
    }

    try {
      setLoading(true);
      showLoading('Loading your tickets...');

      // Query TicketPurchased events for this user
      // Limit to last 2 days (approximately 14,400 blocks on Sepolia, 12s per block)
      const currentBlock = await contract.runner.provider.getBlockNumber();
      const blocksPerDay = 7200; // 12s per block * 60 * 60 * 24 / 12
      const fromBlock = currentBlock - (blocksPerDay * 14); // Last 2 days
      
      console.log(`📊 Querying from block ${fromBlock} to ${currentBlock}`);
      
      const filter = contract.filters.TicketPurchased(null, account);
      const events = await contract.queryFilter(filter, fromBlock, 'latest');

      console.log('📋 Found', events.length, 'tickets');
      
      // 检查是否有重复的事件
      const eventTicketIds = events.map(event => {
        const parsed = contract.interface.parseLog(event);
        return parsed.args.ticketId.toString();
      });
      const uniqueEventIds = [...new Set(eventTicketIds)];
      if (eventTicketIds.length !== uniqueEventIds.length) {
        console.warn('⚠️ Found duplicate events:', {
          total: eventTicketIds.length,
          unique: uniqueEventIds.length,
          duplicates: eventTicketIds.length - uniqueEventIds.length
        });
      }

      if (events.length === 0) {
        setTickets([]);
        hideLoading();
        setLoading(false);
        return;
      }

      // Get ticket details
      const ticketPromises = events.map(async (event) => {
        const parsed = contract.interface.parseLog(event);
        const ticketId = parsed.args.ticketId.toString();
        
        const [ticket, hasClaimed, hasDrawn] = await Promise.all([
          contract.getTicket(ticketId),
          contract.hasClaimed(ticketId),
          contract.hasDrawn()
        ]);

        return {
          id: ticketId,
          player: ticket.player,
          purchaseTime: Number(ticket.purchaseTime),
          hasClaimed,
          hasDrawn,
          numbers: ticket.numbers
        };
      });

      const ticketDetails = await Promise.all(ticketPromises);
      
      // 去重：基于ticket ID去重，保留最新的
      const uniqueTickets = ticketDetails.reduce((acc, ticket) => {
        const existing = acc.find(t => t.id === ticket.id);
        if (!existing || ticket.purchaseTime > existing.purchaseTime) {
          // 移除旧的，添加新的
          acc = acc.filter(t => t.id !== ticket.id);
          acc.push(ticket);
        }
        return acc;
      }, []);
      
      // 按购买时间排序，最新的在前
      const sortedTickets = uniqueTickets.sort((a, b) => b.purchaseTime - a.purchaseTime);
      setTickets(sortedTickets);
      
      hideLoading();
      setLoading(false);
    } catch (error) {
      console.error('❌ Failed to load tickets:', error);
      showNotification('Failed to load tickets: ' + error.message, 'error');
      hideLoading();
      setLoading(false);
    }
  };

  const checkTicketPrize = async (ticketId) => {
    if (!fhevmInstance) {
      showNotification('FHEVM not initialized', 'error');
      return;
    }

    try {
      showLoading('Checking prize status...');

      // Call checkTicket to calculate prize level
      const checkTx = await contract.checkTicket(ticketId);
      await checkTx.wait();

      // Get encrypted prize level
      const encryptedPrizeLevel = await contract.getTicketPrizeLevel(ticketId);
      console.log('🔐 Encrypted prize level:', encryptedPrizeLevel);

      // Decrypt prize level using user decryption
      const prizeLevel = await decryptUserData(encryptedPrizeLevel);
      console.log('🎉 Decrypted prize level:', prizeLevel);

      // Show result
      const prizeNames = ['No prize', 'Ninth prize', 'Eighth prize', 'Seventh prize', 'Sixth prize', 
                         'Fifth prize', 'Fourth prize', 'Third prize', 'Second prize', 'First prize'];
      const prizeName = prizeNames[prizeLevel] || 'Unknown';

      if (prizeLevel === 0) {
        showNotification(`Ticket #${ticketId}: No prize`, 'info');
      } else {
        showNotification(`🎉 Ticket #${ticketId}: Congratulations! You won ${prizeName}!`, 'success');
      }

      // Reload tickets
      loadMyTickets();
    } catch (error) {
      console.error('❌ Prize check failed:', error);
      showNotification('Prize check failed: ' + error.message, 'error');
    } finally {
      hideLoading();
    }
  };

  const decryptUserData = async (encryptedHandle) => {
    try {
      console.log('🔐 Starting user decryption...');

      // Get signer from contract
      const signer = await contract.runner;
      const userAddress = await signer.getAddress(); // Get checksum address

      // Generate keypair
      const keypair = fhevmInstance.generateKeypair();

      // Create EIP712 signature for user decryption
      const startTimeStamp = Math.floor(Date.now() / 1000).toString();
      const durationDays = '10';
      const contractAddress = await contract.getAddress(); // Get checksum address
      const contractAddresses = [contractAddress];

      console.log('📝 Decryption params:', { userAddress, contractAddress, startTimeStamp });

      const eip712 = fhevmInstance.createEIP712(
        keypair.publicKey,
        contractAddresses,
        startTimeStamp,
        durationDays
      );

      // Sign with ethers v6
      const signature = await signer.signTypedData(
        eip712.domain,
        { UserDecryptRequestVerification: eip712.types.UserDecryptRequestVerification },
        eip712.message
      );

      console.log('✅ Signature obtained');

      // Decrypt
      const handleContractPairs = [{
        handle: encryptedHandle,
        contractAddress: contractAddress
      }];

      console.log('🌐 Calling relayer for user decryption...');
      const result = await fhevmInstance.userDecrypt(
        handleContractPairs,
        keypair.privateKey,
        keypair.publicKey,
        signature.replace('0x', ''),
        contractAddresses,
        userAddress, // Use checksum address
        startTimeStamp,
        durationDays
      );

      const decryptedValue = result[encryptedHandle];
      console.log('✅ User decryption successful:', decryptedValue);

      return parseInt(decryptedValue);
    } catch (error) {
      console.error('❌ User decryption failed:', error);
      throw error;
    }
  };

  useEffect(() => {
    if (account && contract) {
      loadMyTickets();
    }
  }, [account, contract]);

  const LotteryBall = ({ number, type = 'main' }) => (
    <div
      className={`
        lottery-ball w-14 h-14 text-lg
        ${type === 'main' 
          ? 'bg-gradient-to-br from-cyan-400 to-blue-600' 
          : 'bg-gradient-to-br from-purple-400 to-pink-600'
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
          <h2 className="text-title mb-1">My Tickets</h2>
          <p className="text-subtitle">View and check your purchased tickets</p>
        </div>
        <Button
          size="sm"
          variant="flat"
          className="bg-white/10 text-white hover:bg-white/20"
          isDisabled={loading || !account}
          onPress={loadMyTickets}
          startContent={<FiRefreshCw className="w-4 h-4" />}
        >
          Refresh
        </Button>
      </div>

      {!account && (
        <Card className="bg-gradient-to-br from-amber-500/20 to-orange-500/20 border border-white/10">
          <CardBody className="p-12 text-center">
            <div className="text-6xl mb-4">🎫</div>
            <h3 className="text-xl font-bold text-white mb-2">No Wallet Connected</h3>
            <p className="text-white/70">Connect your wallet to view your tickets</p>
          </CardBody>
        </Card>
      )}

      {account && tickets.length === 0 && !loading && (
        <Card className="card-flat">
          <CardBody className="p-12 text-center">
            <div className="text-6xl mb-4">🎟️</div>
            <h3 className="text-xl font-bold text-black mb-2">No Tickets Yet</h3>
            <p className="text-black/80">Purchase your first ticket to get started!</p>
          </CardBody>
        </Card>
      )}

      {tickets.map((ticket, index) => {
        const savedNumbers = getTicketNumbers(ticket.id);
        const purchaseDate = new Date(ticket.purchaseTime * 1000).toLocaleString();

        let chipColor = 'warning';
        let statusText = 'Pending Draw';
        let statusIcon = '⏳';

        if (ticket.hasDrawn) {
          if (ticket.hasClaimed) {
            chipColor = 'success';
            statusText = 'Prize Claimed';
            statusIcon = '✅';
          } else {
            chipColor = 'primary';
            statusText = 'Check Result';
            statusIcon = '🎁';
          }
        }

        return (
          <Card
            key={ticket.id}
            className="card-flat"
            style={{ animationDelay: `${index * 0.1}s` }}
          >
            <CardBody className="p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-2xl font-bold text-black">Ticket #{ticket.id}</h3>
                    <Chip size="sm" color={chipColor} variant="flat" className="font-semibold">
                      {statusIcon} {statusText}
                    </Chip>
                  </div>
                  <p className="text-sm text-black/70">📅 {purchaseDate}</p>
                </div>
              </div>

              {savedNumbers ? (
                <div className="bg-black/5 rounded-2xl p-5 mb-4 border border-black/10">
                  <div className="flex items-center gap-2 mb-3">
                    <FiLock className="w-5 h-5 text-black" />
                    <div>
                      <h4 className="font-bold text-black">Your Private Numbers</h4>
                      <p className="text-xs text-black/60">Only you can see these</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3 flex-wrap">
                    {savedNumbers.mainNumbers.map((num, idx) => (
                      <LotteryBall key={`${ticket.id}-main-${idx}`} number={num} type="main" />
                    ))}
                    <span className="text-3xl font-bold text-white/80">+</span>
                    {savedNumbers.bonusNumbers.map((num, idx) => (
                      <LotteryBall key={`${ticket.id}-bonus-${idx}`} number={num} type="bonus" />
                    ))}
                  </div>
                  
                  <div className="mt-3 p-3 bg-black/5 rounded-xl border border-black/10">
                    <p className="text-xs text-black/80 flex items-center gap-2">
                      <FiInfo className="w-4 h-4" />
                      Numbers are stored locally and encrypted on-chain with FHE
                    </p>
                  </div>
                </div>
              ) : (
                <div className="bg-black/5 rounded-2xl p-5 mb-4 border border-black/10">
                  <div className="flex items-center gap-3 text-black/70">
                    <FiLock className="w-6 h-6" />
                    <div>
                      <p className="font-semibold text-black">Numbers Encrypted</p>
                      <p className="text-sm">Your numbers are protected with FHE</p>
                    </div>
                  </div>
                </div>
              )}

              {ticket.hasDrawn && !ticket.hasClaimed && (
                <Button
                  size="lg"
                  className="w-full btn-black font-bold"
                  onPress={() => checkTicketPrize(ticket.id)}
                  startContent={<FiGift className="w-5 h-5" />}
                >
                  Check Prize Status
                </Button>
              )}

              {ticket.hasClaimed && (
                <div className="text-center p-4 bg-green-500/20 rounded-xl border border-green-400/30">
                  <p className="text-green-200 font-semibold">✅ Prize claimed successfully!</p>
                </div>
              )}
            </CardBody>
          </Card>
        );
      })}
    </div>
  );
};

export default MyTickets;

