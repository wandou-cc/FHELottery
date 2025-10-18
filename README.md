# FHEVM Privacy Lottery System

A privacy-preserving lottery system built with Zama's FHEVM (Fully Homomorphic Encryption Virtual Machine) technology.
This project includes both smart contracts and a fully-featured frontend application.

## Quick Start

For detailed instructions see:
[FHEVM Hardhat Quick Start Tutorial](https://docs.zama.ai/protocol/solidity-guides/getting-started/quick-start-tutorial)

### Prerequisites

- **Node.js**: Version 20 or higher
- **npm or yarn/pnpm**: Package manager

### Installation

1. **Install dependencies**

   ```bash
   npm install
   ```

2. **Set up environment variables**

   ```bash
   npx hardhat vars set MNEMONIC

   # Set your Infura API key for network access
   npx hardhat vars set INFURA_API_KEY

   # Optional: Set Etherscan API key for contract verification
   npx hardhat vars set ETHERSCAN_API_KEY
   ```

3. **Compile and test**

   ```bash
   npm run compile
   npm run test
   ```

4. **Deploy to local network**

   ```bash
   # Start a local FHEVM-ready node
   npx hardhat node
   # Deploy to local network
   npx hardhat deploy --network localhost
   ```

5. **Deploy to Sepolia Testnet**

   ```bash
   # Deploy to Sepolia
   npx hardhat deploy --network sepolia
   # Verify contract on Etherscan
   npx hardhat verify --network sepolia <CONTRACT_ADDRESS>
   ```

6. **Test on Sepolia Testnet**

   ```bash
   # Once deployed, you can run a simple test on Sepolia.
   npx hardhat test --network sepolia
   ```

## 📁 Project Structure

```
Lottery/
├── contracts/           # Smart contract source files
│   └── Lottery.sol      # Privacy lottery contract
├── frontend/            # Frontend application
│   ├── index.html       # Main application (FHEVM integrated)
│   ├── styles.css       # Stylesheets
│   └── README.md        # Frontend documentation
├── deploy/              # Deployment scripts
├── tasks/               # Hardhat custom tasks
├── test/                # Test files
├── hardhat.config.ts    # Hardhat configuration
└── package.json         # Dependencies and scripts
```

## 📜 Available Scripts

### Contract Scripts

| Script             | Description              |
| ------------------ | ------------------------ |
| `npm run compile`  | Compile all contracts    |
| `npm run test`     | Run all tests            |
| `npm run coverage` | Generate coverage report |
| `npm run lint`     | Run linting checks       |
| `npm run clean`    | Clean build artifacts    |

### Frontend

```bash
# Navigate to frontend directory
cd frontend

# Start local server
python3 -m http.server 8001

# Or use npm
npm start

# Visit application
http://localhost:8001
```

## 🎯 Features

### Smart Contract Features
- **Privacy-Preserving**: All lottery numbers encrypted with FHEVM
- **Automated Draw**: Chainlink Automation for daily draws (UTC 20:00)
- **Fair Prize Distribution**: 9 prize tiers with transparent allocation
- **Secure Claims**: Prize claiming with encryption verification

### Frontend Features
- **FHEVM SDK Integration**: Full encryption/decryption support
- **Wallet Connection**: MetaMask integration
- **Network Management**: Auto-switch to Sepolia testnet
- **My Tickets**: View and manage purchased tickets
- **Prize Checking**: Decrypt and check prize status
- **Real-time Updates**: Live contract status display

## 🎲 Lottery Rules

### Game Format
- **Main Numbers**: Select 5 numbers from 0-31
- **Bonus Numbers**: Select 2 numbers from 0-9
- **Ticket Price**: 0.001 ETH
- **Draw Time**: Daily at UTC 20:00 (automated)
- **Privacy**: All numbers encrypted on-chain using FHEVM

### Prize Tiers & Distribution

| Prize Level | Match Condition | Prize Pool Share |
|-------------|----------------|------------------|
| **First Prize** | 5 main + 2 bonus | 38.7% |
| **Second Prize** | 5 main + 1 bonus | 23.9% |
| **Third Prize** | 5 main + 0 bonus | 14.8% |
| **Fourth Prize** | 4 main + 2 bonus | 9.1% |
| **Fifth Prize** | 4 main + 1 bonus | 5.6% |
| **Sixth Prize** | 3 main + 2 bonus | 3.5% |
| **Seventh Prize** | 4 main + 0 bonus | 2.2% |
| **Eighth Prize** | (3 main + 1 bonus) or (2 main + 2 bonus) | 1.3% |
| **Ninth Prize** | Other winning combinations | 0.8% |

### How to Play

1. **Connect Wallet**: Link MetaMask to Sepolia testnet
2. **Select Numbers**: Choose 5 main numbers (0-31) + 2 bonus numbers (0-9)
3. **Buy Ticket**: Pay 0.001 ETH for encrypted ticket
4. **Wait for Draw**: Automatic draw at UTC 20:00 daily
5. **Check Results**: Decrypt and view prize status
6. **Claim Prize**: Collect winnings if you won

### Privacy Protection

- **Full Encryption**: All numbers encrypted using FHEVM
- **Zero-Knowledge**: No one can see your numbers
- **Private Matching**: Prize calculation on encrypted data
- **Secure Claims**: Only you can decrypt your results

## 📚 Documentation

### FHEVM Resources
- [FHEVM Documentation](https://docs.zama.ai/fhevm)
- [Relayer SDK Guide](https://docs.zama.ai/protocol/relayer-sdk-guides)
- [Initialization](https://docs.zama.ai/protocol/relayer-sdk-guides/fhevm-relayer/initialization)
- [Input Encryption](https://docs.zama.ai/protocol/relayer-sdk-guides/fhevm-relayer/input)
- [User Decryption](https://docs.zama.ai/protocol/relayer-sdk-guides/fhevm-relayer/decryption/user-decryption)

### Project Documentation
- [Frontend README](frontend/README.md) - Frontend application guide
- [Contract ABI](abi) - Complete contract ABI

## 🚀 Deployment

### Contract Deployment

```bash
# Deploy to Sepolia testnet
npx hardhat deploy --network sepolia

# Verify contract
npx hardhat verify --network sepolia <CONTRACT_ADDRESS>
```

### Frontend Deployment

```bash
cd frontend

# Option 1: Local server
python3 -m http.server 8001

# Option 2: npm
npm start

# Option 3: Deploy to hosting service
# - Vercel
# - Netlify
# - GitHub Pages
# - IPFS
```

## 🔒 Security Notes

- This is a testnet application for demonstration purposes
- Do not use real ETH on mainnet without thorough security audit
- Always verify contract addresses
- Keep your private keys secure
- Use official MetaMask extension only

## 📄 License

This project is licensed under the BSD-3-Clause-Clear License. See the [LICENSE](LICENSE) file for details.

## 🆘 Support

- **GitHub Issues**: Report bugs or request features
- **Documentation**: [FHEVM Docs](https://docs.zama.ai)
- **Community**: [Zama Discord](https://discord.gg/zama)

## 🙏 Acknowledgments

- **Zama Team**: For the amazing FHEVM technology
- **Chainlink**: For automation services
- **OpenZeppelin**: For secure smart contract libraries

---

**Built with privacy and security in mind**  
**Powered by Zama FHEVM Technology**
