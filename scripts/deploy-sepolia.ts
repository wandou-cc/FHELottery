import { ethers } from "hardhat";
import { Lottery } from "../types";

async function main() {
  console.log("🚀 开始部署到Ethereum Sepolia测试网...\n");

  // 获取部署者账户
  const [deployer] = await ethers.getSigners();
  console.log("📋 部署者信息:");
  console.log(`   地址: ${deployer.address}`);
  
  // 检查余额
  const balance = await ethers.provider.getBalance(deployer.address);
  const balanceInEth = ethers.formatEther(balance);
  console.log(`   余额: ${balanceInEth} ETH`);
  
  if (balance < ethers.parseEther("0.01")) {
    console.log("⚠️  余额不足！需要至少0.01 ETH用于部署");
    console.log("💡 请访问以下水龙头获取测试ETH:");
    console.log("   - https://sepoliafaucet.com/");
    console.log("   - https://faucets.chain.link/sepolia");
    console.log("   - https://www.infura.io/faucet/sepolia");
    return;
  }
  
  console.log("✅ 余额充足，开始部署...\n");

  // 部署合约
  console.log("📦 部署Lottery合约...");
  const Lottery = await ethers.getContractFactory("Lottery");
  const lottery = await Lottery.deploy();
  
  console.log("⏳ 等待部署确认...");
  await lottery.waitForDeployment();
  
  const lotteryAddress = await lottery.getAddress();
  console.log("🎉 部署成功！");
  console.log(`   合约地址: ${lotteryAddress}`);
  console.log(`   部署者: ${deployer.address}`);
  console.log(`   交易哈希: ${lottery.deploymentTransaction()?.hash}`);
  
  // 验证合约信息
  console.log("\n📊 合约信息:");
  const ticketPrice = await lottery.TICKET_PRICE();
  const isBuyingOpen = await lottery.isBuyingOpen();
  const hasDrawn = await lottery.hasDrawn();
  
  console.log(`   票价: ${ethers.formatEther(ticketPrice)} ETH`);
  console.log(`   购票状态: ${isBuyingOpen ? "开放" : "关闭"}`);
  console.log(`   开奖状态: ${hasDrawn ? "已开奖" : "未开奖"}`);
  
  // 获取网络信息
  const network = await ethers.provider.getNetwork();
  console.log(`   网络: ${network.name} (Chain ID: ${network.chainId})`);
  
  console.log("\n🔗 有用的链接:");
  console.log(`   Etherscan: https://sepolia.etherscan.io/address/${lotteryAddress}`);
  console.log(`   Chainlink Automation: https://automation.chain.link/`);
  
  console.log("\n📋 下一步操作:");
  console.log("1. 访问 https://automation.chain.link/ 注册Upkeep");
  console.log("2. 合约地址:", lotteryAddress);
  console.log("3. 检查间隔: 每分钟");
  console.log("4. Gas限制: 500,000");
  console.log("5. 需要LINK代币: 5 LINK");
  
  console.log("\n🎯 测试命令:");
  console.log(`npx hardhat --network sepolia task:lottery:buy --num1 5 --num2 12 --num3 18 --num4 25 --num5 30 --bonus1 3 --bonus2 7`);
  console.log(`npx hardhat --network sepolia task:lottery:draw`);
  console.log(`npx hardhat --network sepolia task:lottery:winning-numbers`);
  
  console.log("\n✅ 部署完成！");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ 部署失败:", error);
    process.exit(1);
  });
