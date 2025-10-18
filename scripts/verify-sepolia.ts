import { run } from "hardhat";

async function main() {
  console.log("🔍 开始验证合约...\n");

  // 从命令行参数获取合约地址
  const contractAddress = process.argv[2];
  
  if (!contractAddress) {
    console.log("❌ 请提供合约地址作为参数");
    console.log("💡 使用方法: npx hardhat --network sepolia run scripts/verify-sepolia.ts <合约地址>");
    console.log("💡 示例: npx hardhat --network sepolia run scripts/verify-sepolia.ts 0x1234567890123456789012345678901234567890");
    return;
  }
  
  console.log(`📋 合约地址: ${contractAddress}`);
  console.log("⏳ 等待验证...");
  
  try {
    // 验证合约
    await run("verify:verify", {
      address: contractAddress,
      constructorArguments: [],
    });
    
    console.log("✅ 合约验证成功！");
    console.log(`🔗 Etherscan: https://sepolia.etherscan.io/address/${contractAddress}`);
    
  } catch (error) {
    console.error("❌ 验证失败:", error);
    
    // 如果验证失败，提供手动验证命令
    console.log("\n💡 手动验证命令:");
    console.log(`npx hardhat --network sepolia verify ${contractAddress}`);
    
    // 提供故障排除建议
    console.log("\n🔧 故障排除:");
    console.log("1. 确保合约已成功部署");
    console.log("2. 等待几个区块确认后再验证");
    console.log("3. 检查Etherscan API密钥是否正确设置");
    console.log("4. 确认网络连接正常");
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ 验证失败:", error);
    process.exit(1);
  });
