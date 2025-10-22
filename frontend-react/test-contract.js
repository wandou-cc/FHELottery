// 简单的合约测试脚本
// 在浏览器控制台中运行此脚本来测试合约连接

async function testContract() {
  if (!window.ethereum) {
    console.error('MetaMask not found');
    return;
  }

  try {
    const { BrowserProvider, Contract } = await import('https://cdn.ethers.io/lib/ethers-6.15.0.esm.min.js');
    
    const provider = new BrowserProvider(window.ethereum);
    const network = await provider.getNetwork();
    
    console.log('Current network:', network);
    
    if (network.chainId !== 11155111n) {
      console.error('Wrong network! Please switch to Sepolia (Chain ID: 11155111)');
      return;
    }

    const contractAddress = '0x002784c1e871843863Ad1086bcf73ff71284eF9c';
    
    // 检查合约是否存在
    const code = await provider.getCode(contractAddress);
    console.log('Contract code:', code === '0x' ? 'NOT FOUND' : 'FOUND');
    
    if (code === '0x') {
      console.error('Contract not deployed at address:', contractAddress);
      return;
    }

    // 尝试调用合约方法
    const contractABI = [
      "function isBuyingOpen() view returns (bool)",
      "function hasDrawn() view returns (bool)",
      "function currentTicketId() view returns (uint256)",
      "function getTotalPrizePool() view returns (uint256)"
    ];
    
    const contract = new Contract(contractAddress, contractABI, provider);
    
    try {
      const isBuyingOpen = await contract.isBuyingOpen();
      console.log('✅ isBuyingOpen:', isBuyingOpen);
    } catch (err) {
      console.error('❌ isBuyingOpen failed:', err.message);
    }

    try {
      const hasDrawn = await contract.hasDrawn();
      console.log('✅ hasDrawn:', hasDrawn);
    } catch (err) {
      console.error('❌ hasDrawn failed:', err.message);
    }

    try {
      const currentTicketId = await contract.currentTicketId();
      console.log('✅ currentTicketId:', currentTicketId.toString());
    } catch (err) {
      console.error('❌ currentTicketId failed:', err.message);
    }

    try {
      const totalPrizePool = await contract.getTotalPrizePool();
      console.log('✅ totalPrizePool:', totalPrizePool.toString());
    } catch (err) {
      console.error('❌ totalPrizePool failed:', err.message);
    }

  } catch (error) {
    console.error('Test failed:', error);
  }
}

// 运行测试
testContract();
