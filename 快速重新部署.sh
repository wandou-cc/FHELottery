#!/bin/bash

echo "🚀 快速重新部署大乐透合约（支持公开解密）"
echo "=================================================="

# 检查是否在正确的目录
if [ ! -f "hardhat.config.ts" ]; then
    echo "❌ 错误: 请在Lottery目录下运行此脚本"
    exit 1
fi

echo ""
echo "📝 更新说明:"
echo "  ✅ 已添加 FHE.allowAllTransient() 权限"
echo "  ✅ 中奖号码现在可以被任何人解密"
echo "  ✅ 确保开奖结果公开透明"
echo ""

# 步骤1: 清理旧编译文件
echo "🧹 步骤1: 清理旧编译文件..."
rm -rf artifacts cache
echo "✅ 清理完成"
echo ""

# 步骤2: 编译合约
echo "🔨 步骤2: 编译合约..."
npx hardhat compile
if [ $? -ne 0 ]; then
    echo "❌ 编译失败"
    exit 1
fi
echo "✅ 编译成功"
echo ""

# 步骤3: 部署到Sepolia
echo "🚀 步骤3: 部署到Sepolia测试网..."
echo "⚠️  请确保："
echo "   1. .env 文件已配置 SEPOLIA_PRIVATE_KEY"
echo "   2. 账户有足够的 SepoliaETH"
echo ""
read -p "按Enter继续部署，或Ctrl+C取消: "

npx hardhat deploy --network sepolia --reset

if [ $? -ne 0 ]; then
    echo "❌ 部署失败"
    exit 1
fi

echo ""
echo "✅ 部署成功！"
echo ""

# 步骤4: 获取合约地址
echo "📋 步骤4: 检查部署信息..."
if [ -f "deployments/sepolia/Lottery.json" ]; then
    CONTRACT_ADDRESS=$(cat deployments/sepolia/Lottery.json | grep -o '"address": "[^"]*' | grep -o '[^"]*$')
    echo "✅ 新合约地址: $CONTRACT_ADDRESS"
    echo ""
    echo "📝 请更新前端配置:"
    echo "   文件: frontend/index.html"
    echo "   找到: this.contractAddress = '0x...'"
    echo "   改为: this.contractAddress = '$CONTRACT_ADDRESS'"
    echo ""
else
    echo "⚠️  未找到部署信息文件"
fi

# 步骤5: 提醒测试
echo ""
echo "🧪 下一步测试:"
echo "  1. 更新前端的合约地址"
echo "  2. 触发一次开奖: npx hardhat lottery:draw --network sepolia"
echo "  3. 打开前端测试解密功能"
echo ""

echo "✅ 重新部署完成！"
echo "=================================================="
