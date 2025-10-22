# FHEVM Privacy Lottery - React Frontend

A modern React-based frontend for the FHEVM Privacy Lottery, built with the Zama Relayer SDK for fully homomorphic encryption.

## Features

- 🔐 **Full Privacy**: Numbers are encrypted using FHEVM technology
- 👁️ **User Decryption**: View your own ticket numbers privately
- 🌐 **Public Decryption**: Everyone can view winning numbers after the draw
- ⚡ **Modern UI**: Built with React 18 and Tailwind CSS
- 🚀 **Fast Development**: Powered by Vite
- 📱 **Responsive**: Works on all devices

## Technology Stack

- **React 18** - Modern UI library
- **Vite** - Next generation frontend tooling
- **Tailwind CSS** - Utility-first CSS framework
- **ethers.js v6** - Ethereum library
- **@zama-fhe/relayer-sdk** - FHEVM encryption/decryption

## Getting Started

### Prerequisites

- Node.js >= 16.0.0
- MetaMask wallet
- Sepolia testnet ETH

### Installation

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

The app will open at `http://localhost:3000`

## How It Works

### 1. Initialization

The app initializes the FHEVM SDK when you connect your wallet:

```javascript
import { initSDK, createInstance, SepoliaConfig } from '@zama-fhe/relayer-sdk';

// Initialize SDK (load WASM)
await initSDK();

// Create instance with Sepolia config
const instance = await createInstance({
  ...SepoliaConfig,
  network: window.ethereum
});
```

### 2. Buying Tickets (Encrypted Input)

When you select numbers and buy a ticket:

1. Numbers are encrypted using FHEVM
2. Encrypted data is uploaded to the relayer
3. Transaction is sent to the smart contract
4. Plaintext numbers are saved locally (only for you)

```javascript
// Create encrypted input buffer
const buffer = fhevmInstance.createEncryptedInput(
  contractAddress,
  userAddress
);

// Add numbers as euint8
numbers.forEach(num => buffer.add8(BigInt(num)));

// Encrypt and upload
const encryptedData = await buffer.encrypt();

// Send to contract
await contract.buyTicket(...encryptedData.handles, encryptedData.inputProof);
```

### 3. Viewing Your Tickets (User Decryption)

Your ticket numbers are stored locally and displayed only to you:

- **Stored locally**: Numbers saved in browser localStorage
- **Encrypted on-chain**: Only encrypted ciphertext exists on blockchain
- **Private viewing**: Only you can see your plaintext numbers

For checking prizes, user decryption is used to decrypt your prize level:

```javascript
// Generate keypair
const keypair = fhevmInstance.generateKeypair();

// Create EIP712 signature
const eip712 = fhevmInstance.createEIP712(
  keypair.publicKey,
  [contractAddress],
  startTimestamp,
  durationDays
);

// Sign and decrypt
const signature = await signer.signTypedData(eip712.domain, eip712.types, eip712.message);
const result = await fhevmInstance.userDecrypt(
  handleContractPairs,
  keypair.privateKey,
  keypair.publicKey,
  signature,
  [contractAddress],
  userAddress,
  startTimestamp,
  durationDays
);
```

### 4. Viewing Winning Numbers (Public Decryption)

After the draw, anyone can decrypt the winning numbers:

```javascript
// Get encrypted winning numbers from contract
const winningNumbers = await contract.getWinningNumbers();

// Public decrypt each number
const handles = [
  winningNumbers.num1,
  winningNumbers.num2,
  // ... etc
];

const decryptedValues = await fhevmInstance.publicDecrypt(handles);
```

## Project Structure

```
frontend-react/
├── src/
│   ├── components/         # React components
│   │   ├── Header.jsx      # Header with wallet connection
│   │   ├── StatusCards.jsx # Contract status display
│   │   ├── BuyTicket.jsx   # Ticket purchase (encrypted input)
│   │   ├── MyTickets.jsx   # User's tickets (user decryption)
│   │   ├── DrawHistory.jsx # Draw history (public decryption)
│   │   ├── LoadingOverlay.jsx
│   │   └── Notification.jsx
│   ├── hooks/              # Custom React hooks
│   │   ├── useWallet.js    # Wallet connection
│   │   ├── useFHEVM.js     # FHEVM initialization
│   │   └── useContract.js  # Contract interaction
│   ├── contract/           # Contract ABI
│   │   └── abi.json
│   ├── App.jsx             # Main app component
│   ├── main.jsx            # Entry point
│   └── index.css           # Global styles
├── index.html              # HTML template
├── vite.config.js          # Vite configuration
├── tailwind.config.js      # Tailwind configuration
└── package.json            # Dependencies
```

## Key Features Explained

### Privacy Protection

- **Before purchase**: Numbers are visible to you
- **During purchase**: Numbers are encrypted client-side using FHEVM
- **After purchase**: Only encrypted ciphertext exists on blockchain
- **Your view**: Numbers stored locally, only visible to you
- **Others' view**: Cannot see your numbers (privacy protected)
- **After draw**: You can privately check if you won
- **Winning numbers**: Anyone can decrypt and view after draw

### User Decryption vs Public Decryption

**User Decryption** (Private):
- Requires user signature
- Only authorized user can decrypt
- Used for: viewing prize level, private data
- Ensures privacy protection

**Public Decryption** (Public):
- No authorization required
- Anyone can decrypt
- Used for: winning numbers after draw
- Ensures transparency

## Contract Address

Sepolia Testnet: `0x002784c1e871843863Ad1086bcf73ff71284eF9c`

## Network Configuration

- **Chain ID**: 11155111 (Sepolia)
- **Gateway Chain ID**: 55815
- **Relayer URL**: https://relayer.testnet.zama.cloud
- **Block Explorer**: https://sepolia.etherscan.io

## References

- [Zama Protocol Documentation](https://docs.zama.ai/protocol)
- [FHEVM Relayer SDK](https://docs.zama.ai/protocol/relayer-sdk-guides/fhevm-relayer)
- [ethers.js Documentation](https://docs.ethers.org/v6/)
- [React Documentation](https://react.dev/)

## License

MIT

