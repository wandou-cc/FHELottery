import React, { useState, useEffect } from 'react';
import { Tabs, Tab, Card, CardBody } from '@heroui/react';
import { FiBarChart2, FiShoppingCart, FiTag, FiClock, FiLock, FiTarget, FiShield, FiZap, FiInfo, FiBook } from 'react-icons/fi';
import Header from './components/Header';
import GameRules from './components/GameRules';
import StatusCards from './components/StatusCards';
import BuyTicket from './components/BuyTicket';
import MyTickets from './components/MyTickets';
import DrawHistory from './components/DrawHistory';
import LoadingOverlay from './components/LoadingOverlay';
import Notification from './components/Notification';
import { useFHEVM } from './hooks/useFHEVM';
import { useContract } from './hooks/useContract';
import { useWallet } from './hooks/useWallet';

function App() {
  const { account, connectWallet, disconnectWallet, balance } = useWallet();
  const { fhevmInstance, initializeFHEVM } = useFHEVM();
  const { contract, contractStatus, updateStatus } = useContract(account);
  
  const [loading, setLoading] = useState({ show: false, message: '' });
  const [notification, setNotification] = useState({ show: false, message: '', type: 'info' });
  const [selectedTab, setSelectedTab] = useState('overview');

  // Initialize FHEVM SDK when wallet is connected
  useEffect(() => {
    if (account && !fhevmInstance) {
      initializeFHEVM();
    }
  }, [account, fhevmInstance, initializeFHEVM]);

  // Update contract status periodically
  useEffect(() => {
    if (contract) {
      updateStatus();
      const interval = setInterval(updateStatus, 30000);
      return () => clearInterval(interval);
    }
  }, [contract, updateStatus]);

  const showLoading = (message) => {
    setLoading({ show: true, message });
  };

  const hideLoading = () => {
    setLoading({ show: false, message: '' });
  };

  const showNotification = (message, type = 'info') => {
    setNotification({ show: true, message, type });
    setTimeout(() => {
      setNotification({ show: false, message: '', type: 'info' });
    }, 5000);
  };

  return (
    <div className="min-h-screen relative">
      {/* Floating decorative elements */}
      {/* Remove decorative blobs for flat design */}

      <Header
        account={account}
        balance={balance}
        onConnect={connectWallet}
        onDisconnect={disconnectWallet}
      />

      <main className="relative z-10 container mx-auto px-4 py-8 max-w-7xl">
        {/* Hero Section */}
        <div className="text-center mb-8 animate-fadeIn">
          <h1 className="text-title mb-2">Ecosystem</h1>
          <p className="text-subtitle mb-4">Apps & infrastructure live on The Zama Public Testnet.</p>
          <button className="inline-flex items-center gap-2 px-5 py-2 btn-black" onClick={() => setSelectedTab('rules')}>
            <span className="text-sm font-semibold">Game Rules</span>
          </button>
        </div>

        {/* Status Cards */}
        <div className="mb-8 animate-slideInRight">
          <StatusCards status={contractStatus} />
        </div>

        {/* Main Content with Tabs */}
        <Card className="card-flat animate-scaleIn">
          <CardBody className="p-4">
            <Tabs
              aria-label="Lottery sections"
              selectedKey={selectedTab}
              onSelectionChange={setSelectedTab}
              color="default"
              variant="underlined"
              size="lg"
              classNames={{
                tabList: "gap-4 w-full relative rounded-none p-0 border-b border-black/20",
                cursor: "w-full bg-black",
                tab: "max-w-fit px-4 h-10 text-black/70 data-[selected=true]:text-black",
                tabContent: "group-data-[selected=true]:font-semibold text-sm"
              }}
            >
              <Tab
                key="overview"
                title={
                  <div className="flex items-center space-x-2">
                    <FiBarChart2 className="w-5 h-5" />
                    <span>Overview</span>
                  </div>
                }
              >
                <div className="py-4 space-y-4">
                  <Card className="card-flat">
                    <CardBody className="p-5">
                      <div className="flex items-start gap-4">
                        <div className="w-10 h-10 rounded-xl bg-black/10 flex items-center justify-center">
                          <FiLock className="w-5 h-5 text-black" />
                        </div>
                        <div className="flex-1">
                          <h3 className="text-xl font-extrabold text-black mb-1">Fully Private Lottery</h3>
                          <p className="text-sm text-black/80 leading-relaxed">
                            Your lottery numbers are encrypted using Fully Homomorphic Encryption (FHE). Nobody can see your numbers — not even the contract. Winning numbers are drawn and verified entirely in the encrypted space, ensuring fairness and privacy.
                          </p>
                        </div>
                      </div>
                    </CardBody>
                  </Card>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card className="card-flat">
                      <CardBody className="p-6 text-center">
                        <div className="mx-auto mb-2 w-9 h-9 rounded-lg bg-black/10 flex items-center justify-center">
                          <FiTarget className="w-5 h-5 text-black" />
                        </div>
                        <h4 className="text-base font-semibold text-black mb-1">Provably Fair</h4>
                        <p className="text-xs text-black/70">Blockchain-verified draws</p>
                      </CardBody>
                    </Card>
                    <Card className="card-flat">
                      <CardBody className="p-6 text-center">
                        <div className="mx-auto mb-2 w-9 h-9 rounded-lg bg-black/10 flex items-center justify-center">
                          <FiShield className="w-5 h-5 text-black" />
                        </div>
                        <h4 className="text-base font-semibold text-black mb-1">Fully Encrypted</h4>
                        <p className="text-xs text-black/70">Numbers stay private</p>
                      </CardBody>
                    </Card>
                    <Card className="card-flat">
                      <CardBody className="p-6 text-center">
                        <div className="mx-auto mb-2 w-9 h-9 rounded-lg bg-black/10 flex items-center justify-center">
                          <FiZap className="w-5 h-5 text-black" />
                        </div>
                        <h4 className="text-base font-semibold text-black mb-1">Instant Payouts</h4>
                        <p className="text-xs text-black/70">Automatic winner detection</p>
                      </CardBody>
                    </Card>
                  </div>

                  {!account && (
                    <Card className="card-flat">
                      <CardBody className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="w-7 h-7 rounded-md bg-black/10 flex items-center justify-center">
                            <FiInfo className="w-4 h-4 text-black" />
                          </div>
                          <p className="text-sm text-black font-medium">
                            Connect your wallet to start playing. Make sure you're on Sepolia testnet.
                          </p>
                        </div>
                      </CardBody>
                    </Card>
                  )}
                </div>
              </Tab>

              <Tab
                key="buy"
                title={
                  <div className="flex items-center space-x-2">
                    <FiShoppingCart className="w-5 h-5" />
                    <span>Buy Tickets</span>
                  </div>
                }
              >
                <div className="py-6">
                  <BuyTicket
                    account={account}
                    contract={contract}
                    fhevmInstance={fhevmInstance}
                    contractStatus={contractStatus}
                    showLoading={showLoading}
                    hideLoading={hideLoading}
                    showNotification={showNotification}
                    onPurchaseComplete={updateStatus}
                  />
                </div>
              </Tab>

              <Tab
                key="mytickets"
                title={
                  <div className="flex items-center space-x-2">
                    <FiTag className="w-5 h-5" />
                    <span>My Tickets</span>
                  </div>
                }
              >
                <div className="py-6">
                  <MyTickets
                    account={account}
                    contract={contract}
                    fhevmInstance={fhevmInstance}
                    showLoading={showLoading}
                    hideLoading={hideLoading}
                    showNotification={showNotification}
                  />
                </div>
              </Tab>

              <Tab
                key="history"
                title={
                  <div className="flex items-center space-x-2">
                    <FiClock className="w-5 h-5" />
                    <span>Draw History</span>
                  </div>
                }
              >
                <div className="py-6">
                  <DrawHistory
                    contract={contract}
                    fhevmInstance={fhevmInstance}
                    showLoading={showLoading}
                    hideLoading={hideLoading}
                    showNotification={showNotification}
                  />
                </div>
              </Tab>

            <Tab
              key="rules"
              title={
                <div className="flex items-center space-x-2">
                  <FiBook className="w-5 h-5" />
                  <span>Game Rules</span>
                </div>
              }
            >
              <div className="py-6">
                <GameRules />
              </div>
            </Tab>
            </Tabs>
          </CardBody>
        </Card>

        {/* Footer */}
        <div className="mt-12 text-center text-white/60 text-sm animate-fadeIn">
          <p>Built with ❤️ using Zama FHEVM | Sepolia Testnet</p>
        </div>
      </main>

      {loading.show && <LoadingOverlay message={loading.message} />}
      {notification.show && (
        <Notification
          message={notification.message}
          type={notification.type}
          onClose={() => setNotification({ ...notification, show: false })}
        />
      )}
    </div>
  );
}

export default App;

