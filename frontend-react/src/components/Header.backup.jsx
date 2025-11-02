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

          {/* Wallet Connection - 使用默认 ConnectButton 进行测试 */}
          <div className="animate-slideInRight">
            <ConnectButton />
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
