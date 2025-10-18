# FHEVM Privacy Lottery - Frontend

A privacy-preserving lottery system frontend application built with Zama's FHEVM (Fully Homomorphic Encryption Virtual Machine) technology.

## Features

### 🔐 Privacy Protection
- **Full Homomorphic Encryption**: Lottery numbers are fully encrypted on-chain
- **Zero-Knowledge Proofs**: Verify numbers without revealing their values
- **Privacy Computation**: Prize matching performed on encrypted data

### 🎲 Lottery Features
- **Main Numbers**: Select 5 numbers (range 0-31)
- **Bonus Numbers**: Select 2 numbers (range 0-9)
- **Ticket Price**: 0.001 ETH
- **Auto Draw**: Daily at UTC 20:00
- **Prize Tiers**: 9 levels from ninth to first prize

### 🎨 Modern UI
- Responsive design for desktop and mobile
- Beautiful gradient colors and animations
- Intuitive number selection interface
- Real-time status updates

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

## Tech Stack

- **Frontend**: Vanilla JavaScript + HTML5 + CSS3
- **Blockchain**: Ethereum + FHEVM
- **Encryption**: Zama FHEVM SDK
- **Wallet**: MetaMask integration
- **Network**: Sepolia Testnet

## Quick Start

### Prerequisites

- Node.js 16+
- MetaMask wallet
- Sepolia testnet ETH (from faucets)

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd Lottery/frontend

# Install dependencies (if needed)
npm install
```

### Configuration

The application is pre-configured for Sepolia testnet:

```javascript
// Contract address (Sepolia Testnet)
this.contractAddress = '0xDc5E597cd37d0E17E050bB3E8B2C0fF99511B199';
```

### Run Application

```bash
# Start local server
python3 -m http.server 8001

# Or use npm
npm start

# Visit
http://localhost:8001
```

## Usage Guide

### 1. Connect Wallet
- Click "Connect Wallet" button
- Application will auto-switch to Sepolia testnet
- Confirm connection in MetaMask

### 2. Buy Lottery Ticket
- Select 5 main numbers (0-31)
- Select 2 bonus numbers (0-9)
- Click "Buy Ticket"
- Confirm transaction in MetaMask

### 3. Check Your Tickets
- Click "Refresh" in "My Tickets" section
- View all your purchased tickets
- Check prize status after draw

### 4. Claim Prize
- Click "Check Prize" on ticket after draw
- If won, prize level will be displayed
- Follow instructions to claim

## Project Structure

```
frontend/
├── index.html          # Main application
├── styles.css          # Stylesheet
├── package.json        # Project configuration
└── README.md           # Documentation
```

## FHEVM SDK Integration

### Initialization

```javascript
import { initSDK, createInstance, SepoliaConfig } from 
  'https://cdn.zama.ai/relayer-sdk-js/0.2.0/relayer-sdk-js.js';

// Initialize SDK
await initSDK();

// Create FHEVM instance
const fhevmInstance = await createInstance({
    ...SepoliaConfig,
    network: window.ethereum
});
```

### Encrypt Input

```javascript
// Create encrypted input buffer
const buffer = fhevmInstance.createEncryptedInput(
    contractAddress,
    userAddress
);

// Add 7 euint8 numbers
buffer.add8(BigInt(num1));
buffer.add8(BigInt(num2));
// ... add all 7 numbers

// Encrypt and upload
const encryptedData = await buffer.encrypt();
```

### Call Contract

```javascript
await contract.buyTicket(
    encryptedData.handles[0],
    encryptedData.handles[1],
    // ... all 7 handles
    encryptedData.inputProof,
    { value: ethers.utils.parseEther('0.001') }
);
```

### Decrypt Result

```javascript
// Generate keypair
const keypair = fhevmInstance.generateKeypair();

// Create EIP712 signature
const eip712 = fhevmInstance.createEIP712(...);

// Sign
const signature = await signer.signTypedData(...);

// Decrypt
const result = await fhevmInstance.userDecrypt(...);
```

## Prize Tiers

- **First Prize**: 5 main + 2 bonus (38.7% of pool)
- **Second Prize**: 5 main + 1 bonus (23.9% of pool)
- **Third Prize**: 5 main + 0 bonus (14.8% of pool)
- **Fourth Prize**: 4 main + 2 bonus (9.1% of pool)
- **Fifth Prize**: 4 main + 1 bonus (5.6% of pool)
- **Sixth Prize**: 3 main + 2 bonus (3.5% of pool)
- **Seventh Prize**: 4 main + 0 bonus (2.2% of pool)
- **Eighth Prize**: (3 main + 1 bonus) or (2 main + 2 bonus) (1.3% of pool)
- **Ninth Prize**: Other winning combinations (0.8% of pool)

## Security

### Privacy Protection
- Lottery numbers fully encrypted on-chain
- Only ticket owner can decrypt their numbers
- Prize matching performed on encrypted data
- No sensitive information revealed

### Safety Measures
- Input validation and error handling
- Transaction confirmation and status checks
- Private key security (via MetaMask)
- HTTPS deployment (production)

## Troubleshooting

### Common Issues

**1. "Please install MetaMask"**
- Install MetaMask browser extension
- Refresh page

**2. "Contract execution failed"**
- Ensure buying is open (check status)
- Ensure round not drawn yet
- Check you have enough ETH

**3. "Network switch failed"**
- Manually switch to Sepolia in MetaMask
- Add network if not exists

**4. Transaction cancelled**
- This is normal if you rejected in MetaMask
- Click "Buy Ticket" again to retry

### Get Testnet ETH

- https://sepoliafaucet.com/
- https://faucet.sepolia.dev/
- https://sepolia-faucet.pk910.de/

## Resources

### Zama Documentation
- [FHEVM Docs](https://docs.zama.ai/fhevm)
- [Relayer SDK Guide](https://docs.zama.ai/protocol/relayer-sdk-guides)
- [Initialization](https://docs.zama.ai/protocol/relayer-sdk-guides/fhevm-relayer/initialization)
- [Input Encryption](https://docs.zama.ai/protocol/relayer-sdk-guides/fhevm-relayer/input)
- [User Decryption](https://docs.zama.ai/protocol/relayer-sdk-guides/fhevm-relayer/decryption/user-decryption)

### Community
- [Zama Discord](https://discord.gg/zama)
- [GitHub](https://github.com/zama-ai/fhevm)

## License

MIT License

## Support

For issues or questions:
1. Check this documentation
2. Review browser console for errors
3. Contact development team

---

**Version**: 2.0.0 - Full FHEVM Integration  
**Last Updated**: October 18, 2025  
**Status**: Production Ready
