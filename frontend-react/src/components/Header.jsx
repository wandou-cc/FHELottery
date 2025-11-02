import React from "react";
import { Chip, Avatar } from "@heroui/react";
import { FiShield, FiChevronDown } from "react-icons/fi";
import { ConnectButton } from "@rainbow-me/rainbowkit";

const Header = ({ account, balance }) => {
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
                <span className="text-black">FHEVM Lottery</span>
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
            <ConnectButton.Custom>
              {({
                account: connectedAccount,
                chain,
                openAccountModal,
                openChainModal,
                openConnectModal,
                authenticationStatus,
                mounted,
              }) => {
                const ready = mounted && authenticationStatus !== "loading";
                // 简化连接状态检查：只要有 account 就认为已连接
                const connected = ready && connectedAccount;

                // 调试日志
                if (!ready) {
                  console.log("🔍 RainbowKit: Not ready yet", { mounted, authenticationStatus });
                }

                return (
                  <div
                    {...(!ready && {
                      "aria-hidden": true,
                      style: {
                        opacity: 0,
                        pointerEvents: "none",
                        userSelect: "none",
                      },
                    })}
                  >
                    {(() => {
                      if (!connected) {
                        return (
                          <button
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              console.log("🔗 Opening connect modal...");
                              openConnectModal();
                            }}
                            type="button"
                            className="btn-black font-semibold px-8 py-3 shadow-lg shadow-black/20 hover:shadow-xl hover:shadow-black/30 transition-all rounded-xl cursor-pointer"
                          >
                            <div className="flex items-center gap-2">
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                                />
                              </svg>
                              <span>Connect Wallet</span>
                            </div>
                          </button>
                        );
                      }

                      if (chain?.unsupported) {
                        return (
                          <button
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              openChainModal();
                            }}
                            type="button"
                            className="btn-black font-semibold px-6 py-3 rounded-xl"
                          >
                            Wrong network
                          </button>
                        );
                      }

                      return (
                        <div className="flex items-center gap-3">
                          {/* Balance Display */}
                          <div className="hidden md:flex items-center gap-3 px-3 py-1.5 rounded-lg border border-black/20 bg-black/5">
                            <div>
                              <p className="text-xs text-black/70 font-medium">Balance</p>
                              <p className="text-sm font-bold text-black">
                                {parseFloat(balance || "0").toFixed(4)} ETH
                              </p>
                            </div>
                            <Chip
                              color="default"
                              variant="solid"
                              size="sm"
                              startContent={<div className="w-2 h-2 bg-black rounded-sm" />}
                            >
                              Sepolia
                            </Chip>
                          </div>

                          {/* Account Button */}
                          <button
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              openAccountModal();
                            }}
                            type="button"
                            className="flex items-center gap-3 px-4 py-2 rounded-xl border border-black/20 bg-white/50 hover:bg-white/70 transition-all cursor-pointer"
                          >
                            <Avatar
                              size="sm"
                              src={`https://api.dicebear.com/7.x/shapes/svg?seed=${connectedAccount.address}`}
                              className="ring-2 ring-amber-400/50"
                            />
                            <div className="text-left hidden sm:block">
                              <p className="text-xs text-black/60">Connected</p>
                              <p className="text-sm font-bold text-black">
                                {connectedAccount.displayName ||
                                  `${connectedAccount.address.slice(0, 6)}...${connectedAccount.address.slice(-4)}`}
                              </p>
                            </div>
                            <FiChevronDown className="w-4 h-4 text-black/60" />
                          </button>
                        </div>
                      );
                    })()}
                  </div>
                );
              }}
            </ConnectButton.Custom>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
