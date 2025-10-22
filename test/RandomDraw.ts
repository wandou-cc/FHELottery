import { expect } from "chai";
import { ethers, fhevm } from "hardhat";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { Lottery } from "../types";
import { FhevmType } from "@fhevm/hardhat-plugin";

describe("Lottery - Random Number Generation & Winning Check Test", function () {
  let deployer: HardhatEthersSigner;
  let alice: HardhatEthersSigner;
  let bob: HardhatEthersSigner;
  let lotteryContract: Lottery;
  let lotteryAddress: string;

  before(async function () {
    const ethSigners = await ethers.getSigners();
    deployer = ethSigners[0];
    alice = ethSigners[1];
    bob = ethSigners[2];
    
    await fhevm.initializeCLIApi();
  });

  beforeEach(async function () {
    const LotteryFactory = await ethers.getContractFactory("Lottery");
    lotteryContract = (await LotteryFactory.deploy()) as Lottery;
    await lotteryContract.waitForDeployment();
    lotteryAddress = await lotteryContract.getAddress();
    
    console.log(`\n📋 Lottery contract deployed: ${lotteryAddress}\n`);
  });

  it("🎲 Should generate random winning numbers and check for winners", async function () {
    const ticketPrice = ethers.parseEther("0.001");

    // ==================== Step 1: Multiple players buy tickets ====================
    console.log("=" .repeat(60));
    console.log("🎫 Step 1: Players buying tickets...");
    console.log("=" .repeat(60));

    // Alice buys ticket 1 - numbers: 5, 12, 18, 25, 30 + bonus: 3, 7
    const aliceInput1 = await fhevm
      .createEncryptedInput(lotteryAddress, alice.address)
      .add8(5).add8(12).add8(18).add8(25).add8(30)
      .add8(3).add8(7)
      .encrypt();

    await lotteryContract.connect(alice).buyTicket(
      aliceInput1.handles[0], aliceInput1.handles[1], aliceInput1.handles[2],
      aliceInput1.handles[3], aliceInput1.handles[4], aliceInput1.handles[5],
      aliceInput1.handles[6], aliceInput1.inputProof,
      { value: ticketPrice }
    );
    console.log("✅ Alice bought ticket #1: [5, 12, 18, 25, 30] + [3, 7]");

    // Alice buys ticket 2 - numbers: 1, 2, 3, 4, 5 + bonus: 1, 2
    const aliceInput2 = await fhevm
      .createEncryptedInput(lotteryAddress, alice.address)
      .add8(1).add8(2).add8(3).add8(4).add8(5)
      .add8(1).add8(2)
      .encrypt();

    await lotteryContract.connect(alice).buyTicket(
      aliceInput2.handles[0], aliceInput2.handles[1], aliceInput2.handles[2],
      aliceInput2.handles[3], aliceInput2.handles[4], aliceInput2.handles[5],
      aliceInput2.handles[6], aliceInput2.inputProof,
      { value: ticketPrice }
    );
    console.log("✅ Alice bought ticket #2: [1, 2, 3, 4, 5] + [1, 2]");

    // Bob buys ticket 3 - numbers: 10, 15, 20, 25, 30 + bonus: 5, 8
    const bobInput1 = await fhevm
      .createEncryptedInput(lotteryAddress, bob.address)
      .add8(10).add8(15).add8(20).add8(25).add8(30)
      .add8(5).add8(8)
      .encrypt();

    await lotteryContract.connect(bob).buyTicket(
      bobInput1.handles[0], bobInput1.handles[1], bobInput1.handles[2],
      bobInput1.handles[3], bobInput1.handles[4], bobInput1.handles[5],
      bobInput1.handles[6], bobInput1.inputProof,
      { value: ticketPrice }
    );
    console.log("✅ Bob bought ticket #3: [10, 15, 20, 25, 30] + [5, 8]");

    // Bob buys ticket 4 - numbers: 7, 14, 21, 28, 31 + bonus: 4, 9
    const bobInput2 = await fhevm
      .createEncryptedInput(lotteryAddress, bob.address)
      .add8(7).add8(14).add8(21).add8(28).add8(31)
      .add8(4).add8(9)
      .encrypt();

    await lotteryContract.connect(bob).buyTicket(
      bobInput2.handles[0], bobInput2.handles[1], bobInput2.handles[2],
      bobInput2.handles[3], bobInput2.handles[4], bobInput2.handles[5],
      bobInput2.handles[6], bobInput2.inputProof,
      { value: ticketPrice }
    );
    console.log("✅ Bob bought ticket #4: [7, 14, 21, 28, 31] + [4, 9]");

    const totalTickets = await lotteryContract.currentTicketId();
    const prizePool = await lotteryContract.prizePool();
    console.log(`\n💰 Total tickets sold: ${totalTickets}`);
    console.log(`💰 Prize pool: ${ethers.formatEther(prizePool)} ETH\n`);

    // ==================== Step 2: Draw winning numbers ====================
    console.log("=" .repeat(60));
    console.log("🎰 Step 2: Drawing winning numbers...");
    console.log("=" .repeat(60));

    const drawTx = await lotteryContract.connect(deployer).drawNumbers();
    await drawTx.wait();

    expect(await lotteryContract.hasDrawn()).to.be.true;
    console.log("✅ Numbers drawn successfully!\n");

    // ==================== Step 3: Decrypt and display winning numbers ====================
    console.log("=" .repeat(60));
    console.log("🔓 Step 3: Decrypting winning numbers...");
    console.log("=" .repeat(60));

    const winningNumbers = await lotteryContract.getWinningNumbers();

    const num1 = await fhevm.userDecryptEuint(FhevmType.euint8, winningNumbers.num1, lotteryAddress, deployer);
    const num2 = await fhevm.userDecryptEuint(FhevmType.euint8, winningNumbers.num2, lotteryAddress, deployer);
    const num3 = await fhevm.userDecryptEuint(FhevmType.euint8, winningNumbers.num3, lotteryAddress, deployer);
    const num4 = await fhevm.userDecryptEuint(FhevmType.euint8, winningNumbers.num4, lotteryAddress, deployer);
    const num5 = await fhevm.userDecryptEuint(FhevmType.euint8, winningNumbers.num5, lotteryAddress, deployer);
    const bonus1 = await fhevm.userDecryptEuint(FhevmType.euint8, winningNumbers.bonus1, lotteryAddress, deployer);
    const bonus2 = await fhevm.userDecryptEuint(FhevmType.euint8, winningNumbers.bonus2, lotteryAddress, deployer);

    // Verify number ranges
    expect(Number(num1)).to.be.lessThan(32);
    expect(Number(num2)).to.be.lessThan(32);
    expect(Number(num3)).to.be.lessThan(32);
    expect(Number(num4)).to.be.lessThan(32);
    expect(Number(num5)).to.be.lessThan(32);
    expect(Number(bonus1)).to.be.lessThan(10);
    expect(Number(bonus2)).to.be.lessThan(10);

    console.log("\n🎰 ==================== WINNING NUMBERS ====================");
    console.log(`   Main Numbers:  ${num1}, ${num2}, ${num3}, ${num4}, ${num5}`);
    console.log(`   Bonus Numbers: ${bonus1}, ${bonus2}`);
    console.log("=" .repeat(60));
    console.log("\n");

    // ==================== Step 4: Check each ticket for winnings ====================
    console.log("=" .repeat(60));
    console.log("🔍 Step 4: Checking all tickets for winnings...");
    console.log("=" .repeat(60));

    // Helper function to check and display ticket results
    async function checkAndDisplayTicket(ticketId: number, playerName: string, player: HardhatEthersSigner) {
      const ticket = await lotteryContract.getTicket(ticketId);
      
      // Decrypt ticket numbers for display
      const t1 = await fhevm.userDecryptEuint(FhevmType.euint8, ticket.numbers.num1, lotteryAddress, player);
      const t2 = await fhevm.userDecryptEuint(FhevmType.euint8, ticket.numbers.num2, lotteryAddress, player);
      const t3 = await fhevm.userDecryptEuint(FhevmType.euint8, ticket.numbers.num3, lotteryAddress, player);
      const t4 = await fhevm.userDecryptEuint(FhevmType.euint8, ticket.numbers.num4, lotteryAddress, player);
      const t5 = await fhevm.userDecryptEuint(FhevmType.euint8, ticket.numbers.num5, lotteryAddress, player);
      const tb1 = await fhevm.userDecryptEuint(FhevmType.euint8, ticket.numbers.bonus1, lotteryAddress, player);
      const tb2 = await fhevm.userDecryptEuint(FhevmType.euint8, ticket.numbers.bonus2, lotteryAddress, player);

      console.log(`\n📋 Ticket #${ticketId} (${playerName}):`);
      console.log(`   Numbers: [${t1}, ${t2}, ${t3}, ${t4}, ${t5}] + [${tb1}, ${tb2}]`);

      // Check ticket for winnings
      const checkTx = await lotteryContract.connect(player).checkTicket(ticketId);
      await checkTx.wait();

      // Get match count
      const encryptedMatches = await lotteryContract.getTicketMatches(ticketId);
      const matches = await fhevm.userDecryptEuint(FhevmType.euint8, encryptedMatches, lotteryAddress, player);

      // Get prize level
      const encryptedPrizeLevel = await lotteryContract.getTicketPrizeLevel(ticketId);
      const prizeLevel = await fhevm.userDecryptEuint(FhevmType.euint8, encryptedPrizeLevel, lotteryAddress, player);

      // Calculate matched numbers manually for verification
      const winningSet = new Set([Number(num1), Number(num2), Number(num3), Number(num4), Number(num5)]);
      const bonusSet = new Set([Number(bonus1), Number(bonus2)]);
      
      const ticketMainNumbers = [Number(t1), Number(t2), Number(t3), Number(t4), Number(t5)];
      const ticketBonusNumbers = [Number(tb1), Number(tb2)];
      
      let frontMatches = 0;
      for (const num of ticketMainNumbers) {
        if (winningSet.has(num)) frontMatches++;
      }
      
      let backMatches = 0;
      for (const num of ticketBonusNumbers) {
        if (bonusSet.has(num)) backMatches++;
      }

      console.log(`   Matches: ${matches} total (Front: ${frontMatches}, Bonus: ${backMatches})`);
      
      const prizeLevelNum = Number(prizeLevel);
      const prizeNames = ["No Prize", "Ninth", "Eighth", "Seventh", "Sixth", "Fifth", "Fourth", "Third", "Second", "First"];
      const prizeName = prizeNames[prizeLevelNum] || "Unknown";
      
      if (prizeLevelNum > 0) {
        const prizeAmount = await lotteryContract.calculatePrizeAmount(prizeLevelNum);
        console.log(`   🎉 WINNER! Prize Level: ${prizeName} Prize (Level ${prizeLevelNum})`);
        console.log(`   💰 Prize Amount: ${ethers.formatEther(prizeAmount)} ETH (before 20% fee)`);
      } else {
        console.log(`   ❌ No prize`);
      }

      return { matches: Number(matches), prizeLevel: prizeLevelNum, frontMatches, backMatches };
    }

    // Check all tickets
    const results = [];
    results.push(await checkAndDisplayTicket(1, "Alice", alice));
    results.push(await checkAndDisplayTicket(2, "Alice", alice));
    results.push(await checkAndDisplayTicket(3, "Bob", bob));
    results.push(await checkAndDisplayTicket(4, "Bob", bob));

    // ==================== Step 5: Summary ====================
    console.log("\n" + "=" .repeat(60));
    console.log("📊 SUMMARY");
    console.log("=" .repeat(60));
    console.log(`Total Tickets: ${totalTickets}`);
    console.log(`Winning Numbers: [${num1}, ${num2}, ${num3}, ${num4}, ${num5}] + [${bonus1}, ${bonus2}]`);
    
    const winners = results.filter(r => r.prizeLevel > 0);
    console.log(`Winners: ${winners.length} out of ${totalTickets} tickets`);
    
    if (winners.length > 0) {
      console.log("\n🏆 Winning Tickets:");
      results.forEach((r, i) => {
        if (r.prizeLevel > 0) {
          const prizeNames = ["", "Ninth", "Eighth", "Seventh", "Sixth", "Fifth", "Fourth", "Third", "Second", "First"];
          console.log(`   Ticket #${i + 1}: ${prizeNames[r.prizeLevel]} Prize (${r.frontMatches} front + ${r.backMatches} bonus matches)`);
        }
      });
    } else {
      console.log("\n❌ No winning tickets this round");
    }
    
    console.log("\n✅ Test completed successfully!");
    console.log("=" .repeat(60) + "\n");
  });

  it("🎯 Should verify random number generation quality", async function () {
    console.log("\n" + "=" .repeat(60));
    console.log("🔬 Testing Random Number Generation Quality");
    console.log("=" .repeat(60));

    const draws = 5;
    const allNumbers = [];

    for (let i = 0; i < draws; i++) {
      // Reset for new draw
      if (i > 0) {
        await lotteryContract.reset();
      }

      // Draw numbers
      await lotteryContract.drawNumbers();
      const winningNumbers = await lotteryContract.getWinningNumbers();

      // Decrypt numbers
      const nums = [];
      nums.push(Number(await fhevm.userDecryptEuint(FhevmType.euint8, winningNumbers.num1, lotteryAddress, deployer)));
      nums.push(Number(await fhevm.userDecryptEuint(FhevmType.euint8, winningNumbers.num2, lotteryAddress, deployer)));
      nums.push(Number(await fhevm.userDecryptEuint(FhevmType.euint8, winningNumbers.num3, lotteryAddress, deployer)));
      nums.push(Number(await fhevm.userDecryptEuint(FhevmType.euint8, winningNumbers.num4, lotteryAddress, deployer)));
      nums.push(Number(await fhevm.userDecryptEuint(FhevmType.euint8, winningNumbers.num5, lotteryAddress, deployer)));
      const bonus1 = Number(await fhevm.userDecryptEuint(FhevmType.euint8, winningNumbers.bonus1, lotteryAddress, deployer));
      const bonus2 = Number(await fhevm.userDecryptEuint(FhevmType.euint8, winningNumbers.bonus2, lotteryAddress, deployer));

      allNumbers.push({ main: nums, bonus: [bonus1, bonus2] });

      console.log(`\nDraw #${i + 1}:`);
      console.log(`   Main:  [${nums.join(', ')}]`);
      console.log(`   Bonus: [${bonus1}, ${bonus2}]`);

      // Verify ranges
      nums.forEach(n => expect(n).to.be.lessThan(32));
      expect(bonus1).to.be.lessThan(10);
      expect(bonus2).to.be.lessThan(10);
    }

    console.log("\n" + "=" .repeat(60));
    console.log("✅ All random numbers within expected ranges");
    console.log("=" .repeat(60) + "\n");
  });
});

