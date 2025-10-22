import { FhevmType } from "@fhevm/hardhat-plugin";
import { task } from "hardhat/config";
import type { TaskArguments } from "hardhat/types";

/**
 * 大乐透彩票任务
 * ===========================================================
 *
 * 使用示例 (本地网络 --network localhost):
 *
 * 1. 启动本地节点:
 *   npx hardhat node
 *
 * 2. 部署合约:
 *   npx hardhat --network localhost deploy --tags Lottery
 *
 * 3. 购买彩票:
 *   npx hardhat --network localhost task:lottery:buy --num1 5 --num2 12 --num3 18 --num4 25 --num5 30 --bonus1 3 --bonus2 7
 *   (票价: 0.001 ETH)
 *
 * 4. 开奖:
 *   npx hardhat --network localhost task:lottery:draw
 *
 * 5. 查看中奖号码:
 *   npx hardhat --network localhost task:lottery:winning-numbers
 *
 * 6. 检查彩票:
 *   npx hardhat --network localhost task:lottery:check --ticket-id 1
 */

/**
 * 获取Lottery合约地址
 */
task("task:lottery:address", "显示Lottery合约地址").setAction(async function (_taskArguments: TaskArguments, hre) {
  const { deployments } = hre;

  const lottery = await deployments.get("Lottery");
  console.log("Lottery合约地址: " + lottery.address);
});

/**
 * 购买彩票
 * 示例:
 *   npx hardhat --network localhost task:lottery:buy --num1 5 --num2 12 --num3 18 --num4 25 --num5 30 --bonus1 3 --bonus2 7
 */
task("task:lottery:buy", "购买彩票")
  .addOptionalParam("address", "可选：指定Lottery合约地址")
  .addParam("num1", "第1个数字 (0-31)")
  .addParam("num2", "第2个数字 (0-31)")
  .addParam("num3", "第3个数字 (0-31)")
  .addParam("num4", "第4个数字 (0-31)")
  .addParam("num5", "第5个数字 (0-31)")
  .addParam("bonus1", "第1个后区数字 (0-9)")
  .addParam("bonus2", "第2个后区数字 (0-9)")
  .setAction(async function (taskArguments: TaskArguments, hre) {
    const { ethers, deployments, fhevm } = hre;

    // 验证输入
    const num1 = parseInt(taskArguments.num1);
    const num2 = parseInt(taskArguments.num2);
    const num3 = parseInt(taskArguments.num3);
    const num4 = parseInt(taskArguments.num4);
    const num5 = parseInt(taskArguments.num5);
    const bonus1 = parseInt(taskArguments.bonus1);
    const bonus2 = parseInt(taskArguments.bonus2);

    if (num1 < 0 || num1 > 31 || num2 < 0 || num2 > 31 || num3 < 0 || num3 > 31 || 
        num4 < 0 || num4 > 31 || num5 < 0 || num5 > 31) {
      throw new Error("前5个数字必须在0-31之间");
    }

    if (bonus1 < 0 || bonus1 > 9 || bonus2 < 0 || bonus2 > 9) {
      throw new Error("后2个数字必须在0-9之间");
    }

    await fhevm.initializeCLIApi();

    const lotteryDeployment = taskArguments.address
      ? { address: taskArguments.address }
      : await deployments.get("Lottery");
    console.log(`Lottery合约: ${lotteryDeployment.address}`);

    const signers = await ethers.getSigners();
    const lotteryContract = await ethers.getContractAt("Lottery", lotteryDeployment.address);

    // 加密输入
    const encryptedInput = await fhevm
      .createEncryptedInput(lotteryDeployment.address, signers[0].address)
      .add8(num1)
      .add8(num2)
      .add8(num3)
      .add8(num4)
      .add8(num5)
      .add8(bonus1)
      .add8(bonus2)
      .encrypt();

    const tx = await lotteryContract
      .connect(signers[0])
      .buyTicket(
        encryptedInput.handles[0],
        encryptedInput.handles[1],
        encryptedInput.handles[2],
        encryptedInput.handles[3],
        encryptedInput.handles[4],
        encryptedInput.handles[5],
        encryptedInput.handles[6],
        encryptedInput.inputProof
      );

    console.log(`等待交易: ${tx.hash}...`);
    const receipt = await tx.wait();
    console.log(`交易状态: ${receipt?.status}`);

    const ticketId = await lotteryContract.currentTicketId();
    console.log(`\n✅ 购买成功！`);
    console.log(`彩票ID: ${ticketId}`);
    console.log(`票价: 0.001 ETH`);
    console.log(`你选择的号码: ${num1}, ${num2}, ${num3}, ${num4}, ${num5} + ${bonus1}, ${bonus2}`);
  });

/**
 * 开奖
 * 示例:
 *   npx hardhat --network localhost task:lottery:draw
 */
task("task:lottery:draw", "开奖")
  .addOptionalParam("address", "可选：指定Lottery合约地址")
  .setAction(async function (taskArguments: TaskArguments, hre) {
    const { ethers, deployments } = hre;

    const lotteryDeployment = taskArguments.address
      ? { address: taskArguments.address }
      : await deployments.get("Lottery");
    console.log(`Lottery合约: ${lotteryDeployment.address}`);

    const lotteryContract = await ethers.getContractAt("Lottery", lotteryDeployment.address);

    const tx = await lotteryContract.drawNumbers();
    console.log(`等待交易: ${tx.hash}...`);
    const receipt = await tx.wait();
    console.log(`交易状态: ${receipt?.status}`);

    console.log("\n🎰 开奖成功！中奖号码已生成（加密状态）");
  });

/**
 * 查看中奖号码
 * 示例:
 *   npx hardhat --network localhost task:lottery:winning-numbers
 */
task("task:lottery:winning-numbers", "查看中奖号码")
  .addOptionalParam("address", "可选：指定Lottery合约地址")
  .setAction(async function (taskArguments: TaskArguments, hre) {
    const { ethers, deployments, fhevm } = hre;

    await fhevm.initializeCLIApi();

    const lotteryDeployment = taskArguments.address
      ? { address: taskArguments.address }
      : await deployments.get("Lottery");
    console.log(`Lottery合约: ${lotteryDeployment.address}`);

    const signers = await ethers.getSigners();
    const lotteryContract = await ethers.getContractAt("Lottery", lotteryDeployment.address);

    const winningNumbers = await lotteryContract.getWinningNumbers();

    // 解密所有号码
    const num1 = await fhevm.userDecryptEuint(
      FhevmType.euint8,
      winningNumbers.num1,
      lotteryDeployment.address,
      signers[0]
    );

    const num2 = await fhevm.userDecryptEuint(
      FhevmType.euint8,
      winningNumbers.num2,
      lotteryDeployment.address,
      signers[0]
    );

    const num3 = await fhevm.userDecryptEuint(
      FhevmType.euint8,
      winningNumbers.num3,
      lotteryDeployment.address,
      signers[0]
    );

    const num4 = await fhevm.userDecryptEuint(
      FhevmType.euint8,
      winningNumbers.num4,
      lotteryDeployment.address,
      signers[0]
    );

    const num5 = await fhevm.userDecryptEuint(
      FhevmType.euint8,
      winningNumbers.num5,
      lotteryDeployment.address,
      signers[0]
    );

    const bonus1 = await fhevm.userDecryptEuint(
      FhevmType.euint8,
      winningNumbers.bonus1,
      lotteryDeployment.address,
      signers[0]
    );

    const bonus2 = await fhevm.userDecryptEuint(
      FhevmType.euint8,
      winningNumbers.bonus2,
      lotteryDeployment.address,
      signers[0]
    );

    console.log("\n🎰 中奖号码:");
    console.log(`   前区: ${num1}, ${num2}, ${num3}, ${num4}, ${num5}`);
    console.log(`   后区: ${bonus1}, ${bonus2}`);
  });

/**
 * 检查彩票
 * 示例:
 *   npx hardhat --network localhost task:lottery:check --ticket-id 1
 */
task("task:lottery:check", "检查彩票是否中奖")
  .addOptionalParam("address", "可选：指定Lottery合约地址")
  .addParam("ticketId", "彩票ID")
  .setAction(async function (taskArguments: TaskArguments, hre) {
    const { ethers, deployments, fhevm } = hre;

    const ticketId = parseInt(taskArguments.ticketId);
    if (!Number.isInteger(ticketId) || ticketId <= 0) {
      throw new Error("彩票ID必须是正整数");
    }

    await fhevm.initializeCLIApi();

    const lotteryDeployment = taskArguments.address
      ? { address: taskArguments.address }
      : await deployments.get("Lottery");
    console.log(`Lottery合约: ${lotteryDeployment.address}`);

    const signers = await ethers.getSigners();
    const lotteryContract = await ethers.getContractAt("Lottery", lotteryDeployment.address);

    // 获取彩票信息
    const ticket = await lotteryContract.getTicket(ticketId);
    console.log(`\n彩票ID: ${ticketId}`);
    console.log(`购买者: ${ticket.player}`);

    // 检查匹配数量
    const checkTx = await lotteryContract
      .connect(signers[0])
      .checkTicket(ticketId);
    await checkTx.wait();

    // 获取匹配结果
    const encryptedMatches = await lotteryContract.getTicketMatches(ticketId);

    const matches = await fhevm.userDecryptEuint(
      FhevmType.euint8,
      encryptedMatches,
      lotteryDeployment.address,
      signers[0]
    );

    console.log(`\n🎫 匹配数量: ${matches}/7`);
    
    if (matches === 7n) {
      console.log("🎉 恭喜！全部匹配！");
    } else if (matches >= 5n) {
      console.log("👏 很棒！大部分匹配！");
    } else if (matches >= 3n) {
      console.log("😊 不错，有一些匹配！");
    } else {
      console.log("😔 很遗憾，匹配较少");
    }
  });

/**
 * 获取彩票信息
 * 示例:
 *   npx hardhat --network localhost task:lottery:ticket --ticket-id 1
 */
task("task:lottery:ticket", "查看彩票信息")
  .addOptionalParam("address", "可选：指定Lottery合约地址")
  .addParam("ticketId", "彩票ID")
  .setAction(async function (taskArguments: TaskArguments, hre) {
    const { ethers, deployments, fhevm } = hre;

    const ticketId = parseInt(taskArguments.ticketId);
    if (!Number.isInteger(ticketId) || ticketId <= 0) {
      throw new Error("彩票ID必须是正整数");
    }

    await fhevm.initializeCLIApi();

    const lotteryDeployment = taskArguments.address
      ? { address: taskArguments.address }
      : await deployments.get("Lottery");
    console.log(`Lottery合约: ${lotteryDeployment.address}`);

    const signers = await ethers.getSigners();
    const lotteryContract = await ethers.getContractAt("Lottery", lotteryDeployment.address);

    const ticket = await lotteryContract.getTicket(ticketId);
    
    console.log(`\n彩票ID: ${ticketId}`);
    console.log(`购买者: ${ticket.player}`);
    console.log(`购买时间: ${new Date(Number(ticket.purchaseTime) * 1000).toLocaleString()}`);

    // 解密彩票号码
    const num1 = await fhevm.userDecryptEuint(
      FhevmType.euint8,
      ticket.numbers.num1,
      lotteryDeployment.address,
      signers[0]
    );

    const num2 = await fhevm.userDecryptEuint(
      FhevmType.euint8,
      ticket.numbers.num2,
      lotteryDeployment.address,
      signers[0]
    );

    const num3 = await fhevm.userDecryptEuint(
      FhevmType.euint8,
      ticket.numbers.num3,
      lotteryDeployment.address,
      signers[0]
    );

    const num4 = await fhevm.userDecryptEuint(
      FhevmType.euint8,
      ticket.numbers.num4,
      lotteryDeployment.address,
      signers[0]
    );

    const num5 = await fhevm.userDecryptEuint(
      FhevmType.euint8,
      ticket.numbers.num5,
      lotteryDeployment.address,
      signers[0]
    );

    const bonus1 = await fhevm.userDecryptEuint(
      FhevmType.euint8,
      ticket.numbers.bonus1,
      lotteryDeployment.address,
      signers[0]
    );

    const bonus2 = await fhevm.userDecryptEuint(
      FhevmType.euint8,
      ticket.numbers.bonus2,
      lotteryDeployment.address,
      signers[0]
    );

    console.log(`\n你的号码:`);
    console.log(`   前区: ${num1}, ${num2}, ${num3}, ${num4}, ${num5}`);
    console.log(`   后区: ${bonus1}, ${bonus2}`);
  });

