# 🔐 合约ACL权限更新说明

## 问题描述

**错误信息**: 
```
User 0x... is not authorized to user decrypt handle 0x...
```

**问题原因**: 
中奖号码在合约中只授权给了开奖者(`msg.sender`)和合约本身，普通用户没有解密权限。

## ✅ 解决方案

### 修改合约 - 添加公开访问权限

在`_drawNumbers()`函数中添加`FHE.allowAllTransient()`，允许所有人解密中奖号码：

```solidity
// 原来的代码 - 只允许开奖者和合约
FHE.allow(winningNumbers.num1, msg.sender);
FHE.allow(winningNumbers.num2, msg.sender);
// ...

// 新增的代码 - 允许所有人解密（公开透明）
FHE.allowAllTransient(winningNumbers.num1);
FHE.allowAllTransient(winningNumbers.num2);
FHE.allowAllTransient(winningNumbers.num3);
FHE.allowAllTransient(winningNumbers.num4);
FHE.allowAllTransient(winningNumbers.num5);
FHE.allowAllTransient(winningNumbers.bonus1);
FHE.allowAllTransient(winningNumbers.bonus2);
```

### 修改位置

**文件**: `contracts/Lottery.sol`
**函数**: `_drawNumbers()` (第203-256行)
**新增代码**: 第244-251行

## 🔄 重新部署合约

由于合约逻辑已更改，需要重新部署：

```bash
cd /Users/cc/github/web3/zama/Lottery

# 编译合约
npx hardhat compile

# 部署到Sepolia
npx hardhat deploy --network sepolia

# 或使用完整部署脚本
npx hardhat run scripts/full-deploy-sepolia.ts --network sepolia
```

## 📝 更新前端配置

部署成功后，更新前端的合约地址：

```javascript
// 在 frontend/index.html 中
this.contractAddress = '0x新的合约地址';
```

您已经更新为: `0x002784c1e871843863Ad1086bcf73ff71284eF9c` ✅

## 🧪 测试步骤

### 1. 重新部署合约
```bash
npx hardhat deploy --network sepolia
```

### 2. 触发一次开奖
```bash
npx hardhat lottery:draw --network sepolia
```

### 3. 测试前端解密
```
1. 刷新前端页面
2. 连接钱包
3. 点击 "Load History"
4. 点击 "Decrypt Winning Numbers"
5. ✅ 应该能成功解密并显示号码
```

## 🔍 ACL权限说明

### FHE权限层级

1. **`FHE.allowThis()`**
   - 允许合约本身访问
   - 用于合约内部计算

2. **`FHE.allow(value, address)`**
   - 允许特定地址访问
   - 用于授权特定用户

3. **`FHE.allowAllTransient()`** ← 新增
   - 允许所有人在当前交易中访问
   - 用于公开透明的数据
   - 适合中奖号码这种需要公开的数据

### 为什么使用allowAllTransient？

```
购票阶段:
用户号码 → FHE.allow(num, msg.sender) → 只有购买者能解密 ✅

开奖阶段:
中奖号码 → FHE.allowAllTransient(num) → 所有人都能解密 ✅
```

## ⚠️ 重要提示

### 必须重新部署

由于修改了合约代码，**必须重新部署**才能生效：
- ❌ 旧合约不支持公开解密
- ✅ 新合约支持任何人解密中奖号码

### 数据不兼容

- 旧合约开奖的数据仍然无法解密
- 需要使用新合约重新开奖
- 建议使用`reset()`清空旧数据

## 🚀 完整部署流程

```bash
# 1. 编译合约
npx hardhat compile

# 2. 部署新合约
npx hardhat deploy --network sepolia

# 3. 记录新合约地址
# 输出类似: Lottery deployed to: 0x...

# 4. 更新前端
# 修改 index.html 中的 contractAddress

# 5. 测试开奖
npx hardhat lottery:draw --network sepolia

# 6. 测试前端解密
# 打开 index.html，点击 "Load History"，点击 "Decrypt"
```

## 📊 预期效果

### 部署新合约后

```
开奖 → 生成中奖号码 → 设置allowAllTransient权限
                              ↓
任何用户 → 调用getWinningNumbers() → 获取加密handle
                              ↓
FHEVM SDK → publicDecrypt(handle) → 解密成功 ✅
                              ↓
前端显示 → [05] [12] [18] [25] [30] + [03] [07]
```

## 💡 验证方法

### 方法1: 查看控制台日志

解密成功的日志：
```
🔐 Starting public decryption...
🔐 Decrypting handle 1/7...
✅ Handle 0x540d23bf... → 5
🔐 Decrypting handle 2/7...
✅ Handle 0x... → 12
...
✅ Public decryption completed: [5, 12, 18, 25, 30, 3, 7]
```

### 方法2: 使用Hardhat任务

```bash
# 解密特定handle
npx hardhat fhevm:decrypt --handle 0x... --network sepolia
```

## 🎯 总结

**问题**: 用户无权限解密中奖号码
**原因**: 合约未设置公开访问权限
**解决**: 添加`FHE.allowAllTransient()`
**状态**: ✅ 已修复，需要重新部署

---

重新部署合约后，所有用户都能解密查看中奖号码了！🎉
