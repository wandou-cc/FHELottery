import React from 'react';
import { Button, Chip, Avatar, Dropdown, DropdownTrigger, DropdownMenu, DropdownItem } from '@heroui/react';
import { FiShield, FiPower, FiCopy, FiExternalLink, FiChevronDown } from 'react-icons/fi';

const Header = ({ account, balance, onConnect, onDisconnect }) => {
  return (
    <header className="sticky top-0 z-50 bg-transparent border-b border-black/20">
      <div className="container mx-auto px-4 py-3 max-w-6xl">
        <div className="flex justify-between items-center">
          {/* Logo */}
          <div className="flex items-center space-x-4 animate-slideInLeft">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-amber-300 to-yellow-500 rounded-2xl blur opacity-70 animate-pulse-slow" />
              <div className="relative bg-gradient-to-br from-amber-300 via-amber-400 to-yellow-500 p-3 rounded-2xl shadow-2xl">
                <FiShield className="w-8 h-8 text-white" />
              </div>
            </div>
            <div>
              <h1 className="text-xl font-extrabold text-black flex items-center gap-2">
                <span className="text-black">
                  FHEVM Lottery
                </span>
                <span className="text-xl">🎰</span>
              </h1>
              <div className="flex items-center gap-2 mt-1">
                <div className="w-2 h-2 bg-black rounded-sm" />
                <p className="text-xs text-black/80 font-medium">Powered by Zama</p>
              </div>
            </div>
          </div>

          {/* Wallet Connection */}
          <div className="animate-slideInRight">
            {!account ? (
              <Button
                color="primary"
                size="lg"
                onPress={onConnect}
                className="font-semibold px-8 shadow-lg shadow-primary-500/50 hover:shadow-xl hover:shadow-primary-500/60 transition-all"
                startContent={
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                }
              >
                Connect Wallet
              </Button>
            ) : (
              <div className="flex items-center gap-3">
                {/* Balance Display */}
                <div className="hidden md:flex items-center gap-3 px-3 py-1.5 rounded-lg border border-black/20 bg-black/5">
                  <div>
                    <p className="text-xs text-black/70 font-medium">Balance</p>
                    <p className="text-sm font-bold text-black">{parseFloat(balance).toFixed(4)} ETH</p>
                  </div>
                  <Chip
                    color="default"
                    variant="solid"
                    size="sm"
                    startContent={
                      <div className="w-2 h-2 bg-black rounded-sm" />
                    }
                  >
                    Sepolia
                  </Chip>
                </div>

                {/* Account Dropdown */}
                <Dropdown placement="bottom-end" backdrop="blur">
                  <DropdownTrigger>
                    <Button
                      variant="flat"
                      className="glass-effect border-white/20 px-4 py-6 hover:scale-105 transition-transform"
                    >
                      <div className="flex items-center gap-3">
                        <Avatar
                          size="sm"
                          src={`https://api.dicebear.com/7.x/shapes/svg?seed=${account}`}
                          className="ring-2 ring-amber-400/50"
                        />
                        <div className="text-left hidden sm:block">
                          <p className="text-xs text-secondary-600">Connected</p>
                          <p className="text-sm font-bold text-secondary-900">
                            {account.slice(0, 6)}...{account.slice(-4)}
                          </p>
                        </div>
                        <FiChevronDown className="w-4 h-4 text-secondary-600" />
                      </div>
                    </Button>
                  </DropdownTrigger>
                  <DropdownMenu
                    aria-label="Account actions"
                    className="w-64"
                    itemClasses={{
                      base: "gap-4",
                    }}
                  >
                    <DropdownItem
                      key="account"
                      className="h-14 gap-2"
                      textValue="Account info"
                    >
                      <div className="flex items-center gap-3">
                        <Avatar
                          size="md"
                          src={`https://api.dicebear.com/7.x/shapes/svg?seed=${account}`}
                        />
                        <div>
                          <p className="font-semibold">{account.slice(0, 10)}...{account.slice(-8)}</p>
                          <p className="text-xs text-default-500">{balance} ETH</p>
                        </div>
                      </div>
                    </DropdownItem>
                    <DropdownItem
                      key="copy"
                      startContent={<FiCopy className="w-4 h-4" />}
                      onPress={() => navigator.clipboard.writeText(account)}
                    >
                      Copy Address
                    </DropdownItem>
                    <DropdownItem
                      key="explorer"
                      startContent={<FiExternalLink className="w-4 h-4" />}
                      onPress={() => window.open(`https://sepolia.etherscan.io/address/${account}`, '_blank')}
                    >
                      View on Explorer
                    </DropdownItem>
                    <DropdownItem
                      key="disconnect"
                      color="danger"
                      className="text-danger"
                      startContent={<FiPower className="w-4 h-4" />}
                      onPress={onDisconnect}
                    >
                      Disconnect
                    </DropdownItem>
                  </DropdownMenu>
                </Dropdown>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;

