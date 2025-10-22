import { ethers } from "hardhat";
import { Lottery } from "../types";

async function main() {
  console.log("🚀 完整部署流程 - Ethereum Sepolia测试网\n");

  // 1. 检查环境
  console.log("🔍 检查部署环境...");
  const [deployer] = await ethers.getSigners();
  const balance = await ethers.provider.getBalance(deployer.address);
  const balanceInEth = ethers.formatEther(balance);
  
  console.log(`📋 部署者: ${deployer.address}`);
  console.log(`💰 余额: ${balanceInEth} ETH`);
  
  if (balance < ethers.parseEther("0.01")) {
    console.log("❌ 余额不足！需要至少0.01 ETH");
    console.log("💡 请访问以下水龙头获取测试ETH:");
    console.log("   - https://sepoliafaucet.com/");
    console.log("   - https://faucets.chain.link/sepolia");
    console.log("   - https://www.infura.io/faucet/sepolia");
    return;
  }
  
  console.log("✅ 环境检查通过\n");

  // 2. 部署合约
  console.log("📦 部署Lottery合约...");
  const Lottery = await ethers.getContractFactory("Lottery");
  const lottery = await Lottery.deploy();
  
  console.log("⏳ 等待部署确认...");
  await lottery.waitForDeployment();
  
  const lotteryAddress = await lottery.getAddress();
  console.log("🎉 部署成功！");
  console.log(`   合约地址: ${lotteryAddress}`);
  console.log(`   交易哈希: ${lottery.deploymentTransaction()?.hash}`);
  
  // 3. 等待几个区块确认
  console.log("\n⏳ 等待区块确认...");
  await new Promise(resolve => setTimeout(resolve, 30000)); // 等待30秒
  
  // 4. 验证合约
  console.log("🔍 开始验证合约...");
  try {
    await lottery.verify();
    console.log("✅ 合约验证成功！");
  } catch (error) {
    console.log("⚠️  自动验证失败，请手动验证:");
    console.log(`npx hardhat --network sepolia verify ${lotteryAddress}`);
  }
  
  // 5. 显示合约信息
  console.log("\n📊 合约信息:");
  const ticketPrice = await lottery.TICKET_PRICE();
  const isBuyingOpen = await lottery.isBuyingOpen();
  const hasDrawn = await lottery.hasDrawn();
  const prizePool = await lottery.prizePool();
  const accumulatedPrizePool = await lottery.getAccumulatedPrizePool();
  
  console.log(`   票价: ${ethers.formatEther(ticketPrice)} ETH`);
  console.log(`   购票状态: ${isBuyingOpen ? "开放" : "关闭"}`);
  console.log(`   开奖状态: ${hasDrawn ? "已开奖" : "未开奖"}`);
  console.log(`   当前奖金池: ${ethers.formatEther(prizePool)} ETH`);
  console.log(`   累积奖金池: ${ethers.formatEther(accumulatedPrizePool)} ETH`);
  
  // 6. 显示有用链接
  console.log("\n🔗 有用的链接:");
  console.log(`   Etherscan: https://sepolia.etherscan.io/address/${lotteryAddress}`);
  console.log(`   Chainlink Automation: https://automation.chain.link/`);
  console.log(`   LINK Faucet: https://faucets.chain.link/link-token`);
  
  // 7. 显示下一步操作
  console.log("\n📋 下一步操作:");
  console.log("1. 获取LINK代币:");
  console.log("   - 访问 https://faucets.chain.link/link-token");
  console.log("   - 输入你的钱包地址");
  console.log("   - 申请LINK代币");
  
  console.log("\n2. 注册Chainlink Automation:");
  console.log("   - 访问 https://automation.chain.link/");
  console.log("   - 点击 'Register new Upkeep'");
  console.log("   - 合约地址:", lotteryAddress);
  console.log("   - 检查间隔: 每分钟");
  console.log("   - Gas限制: 500,000");
  console.log("   - 初始LINK余额: 5 LINK");
  
  console.log("\n3. 测试合约功能:");
  console.log("   购买彩票:");
  console.log(`   npx hardhat --network sepolia task:lottery:buy --num1 5 --num2 12 --num3 18 --num4 25 --num5 30 --bonus1 3 --bonus2 7`);
  console.log("   开奖:");
  console.log(`   npx hardhat --network sepolia task:lottery:draw`);
  console.log("   查看中奖号码:");
  console.log(`   npx hardhat --network sepolia task:lottery:winning-numbers`);
  
  console.log("\n🎯 部署完成！合约已成功部署到Sepolia测试网");
  console.log(`📍 合约地址: ${lotteryAddress}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ 部署失败:", error);
    process.exit(1);
  });
