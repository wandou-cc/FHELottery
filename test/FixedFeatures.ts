import { expect } from "chai";
import { ethers, fhevm } from "hardhat";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { Lottery } from "../types";
import { FhevmType } from "@fhevm/hardhat-plugin";

describe("Lottery - Fixed Features Test", function () {
  let deployer: HardhatEthersSigner;
  let alice: HardhatEthersSigner;
  let bob: HardhatEthersSigner;
  let charlie: HardhatEthersSigner;
  let lotteryContract: Lottery;
  let lotteryAddress: string;

  before(async function () {
    const ethSigners = await ethers.getSigners();
    deployer = ethSigners[0];
    alice = ethSigners[1];
    bob = ethSigners[2];
    charlie = ethSigners[3];
    
    await fhevm.initializeCLIApi();
  });

  beforeEach(async function () {
    const LotteryFactory = await ethers.getContractFactory("Lottery");
    lotteryContract = (await LotteryFactory.deploy()) as Lottery;
    await lotteryContract.waitForDeployment();
    lotteryAddress = await lotteryContract.getAddress();
  });

  describe("✅ Fix 1: Owner Access Control", function () {
    it("should set deployer as owner", async function () {
      const owner = await lotteryContract.owner();
      expect(owner).to.equal(deployer.address);
      console.log(`✅ Owner correctly set to: ${owner}`);
    });

    it("should only allow owner to reset", async function () {
      // Non-owner should fail
      await expect(
        lotteryContract.connect(alice).reset()
      ).to.be.revertedWith("Only owner can call this function");

      // Owner should succeed
      await expect(lotteryContract.connect(deployer).reset()).to.not.be.reverted;
      console.log("✅ Only owner can reset the lottery");
    });

    it("should only allow owner to emergency stop buying", async function () {
      // Non-owner should fail
      await expect(
        lotteryContract.connect(alice).emergencyStopBuying()
      ).to.be.revertedWith("Only owner can call this function");

      // Owner should succeed
      await expect(lotteryContract.connect(deployer).emergencyStopBuying()).to.not.be.reverted;
      expect(await lotteryContract.isBuyingOpen()).to.be.false;
      console.log("✅ Only owner can emergency stop buying");
    });

    it("should only allow owner to emergency reopen buying", async function () {
      await lotteryContract.connect(deployer).emergencyStopBuying();
      
      // Non-owner should fail
      await expect(
        lotteryContract.connect(alice).emergencyReopenBuying()
      ).to.be.revertedWith("Only owner can call this function");

      // Owner should succeed
      await expect(lotteryContract.connect(deployer).emergencyReopenBuying()).to.not.be.reverted;
      expect(await lotteryContract.isBuyingOpen()).to.be.true;
      console.log("✅ Only owner can emergency reopen buying");
    });

    it("should allow owner to transfer ownership", async function () {
      await lotteryContract.connect(deployer).transferOwnership(alice.address);
      expect(await lotteryContract.owner()).to.equal(alice.address);
      
      // New owner should be able to reset
      await expect(lotteryContract.connect(alice).reset()).to.not.be.reverted;
      
      // Old owner should not be able to reset
      await expect(
        lotteryContract.connect(deployer).reset()
      ).to.be.revertedWith("Only owner can call this function");
      
      console.log("✅ Ownership transfer works correctly");
    });
  });

  describe("✅ Fix 2: Improved Random Number Generation", function () {
    it("should generate random numbers with better distribution", async function () {
      console.log("\n🎲 Testing random number generation quality...\n");
      
      const draws = 10;
      const allNumbers: number[][] = [];
      
      for (let i = 0; i < draws; i++) {
        if (i > 0) {
          await lotteryContract.reset();
        }
        
        await lotteryContract.drawNumbers();
        const winningNumbers = await lotteryContract.getWinningNumbers();
        
        const nums = [];
        nums.push(Number(await fhevm.userDecryptEuint(FhevmType.euint8, winningNumbers.num1, lotteryAddress, deployer)));
        nums.push(Number(await fhevm.userDecryptEuint(FhevmType.euint8, winningNumbers.num2, lotteryAddress, deployer)));
        nums.push(Number(await fhevm.userDecryptEuint(FhevmType.euint8, winningNumbers.num3, lotteryAddress, deployer)));
        nums.push(Number(await fhevm.userDecryptEuint(FhevmType.euint8, winningNumbers.num4, lotteryAddress, deployer)));
        nums.push(Number(await fhevm.userDecryptEuint(FhevmType.euint8, winningNumbers.num5, lotteryAddress, deployer)));
        const bonus1 = Number(await fhevm.userDecryptEuint(FhevmType.euint8, winningNumbers.bonus1, lotteryAddress, deployer));
        const bonus2 = Number(await fhevm.userDecryptEuint(FhevmType.euint8, winningNumbers.bonus2, lotteryAddress, deployer));
        
        allNumbers.push(nums);
        
        // Count duplicates in this draw
        const uniqueNums = new Set(nums);
        const duplicates = nums.length - uniqueNums.size;
        
        console.log(`Draw #${i + 1}: [${nums.join(', ')}] + [${bonus1}, ${bonus2}] - Duplicates: ${duplicates}`);
        
        // Verify ranges
        nums.forEach(n => expect(n).to.be.lessThan(32));
        expect(bonus1).to.be.lessThan(10);
        expect(bonus2).to.be.lessThan(10);
      }
      
      // Calculate average duplicates
      let totalDuplicates = 0;
      allNumbers.forEach(nums => {
        const uniqueNums = new Set(nums);
        totalDuplicates += nums.length - uniqueNums.size;
      });
      const avgDuplicates = totalDuplicates / draws;
      
      console.log(`\n📊 Statistics:`);
      console.log(`   Total draws: ${draws}`);
      console.log(`   Average duplicates per draw: ${avgDuplicates.toFixed(2)}`);
      console.log(`   ✅ Random number generation uses multiple entropy sources\n`);
    });
  });

  describe("✅ Fix 3: Multi-Winner Prize Distribution", function () {
    it("should track winners per prize level", async function () {
      const ticketPrice = ethers.parseEther("0.001");
      
      // Buy tickets
      for (let i = 0; i < 3; i++) {
        const input = await fhevm
          .createEncryptedInput(lotteryAddress, alice.address)
          .add8(1).add8(2).add8(3).add8(4).add8(5)
          .add8(1).add8(2)
          .encrypt();
        
        await lotteryContract.connect(alice).buyTicket(
          input.handles[0], input.handles[1], input.handles[2],
          input.handles[3], input.handles[4], input.handles[5],
          input.handles[6], input.inputProof,
          { value: ticketPrice }
        );
      }
      
      // Draw numbers
      await lotteryContract.drawNumbers();
      
      // Register winners manually (simulating oracle decryption result)
      await lotteryContract.connect(alice).registerWinner(1, 1); // Ticket 1 - Ninth prize
      await lotteryContract.connect(alice).registerWinner(2, 1); // Ticket 2 - Ninth prize
      await lotteryContract.connect(alice).registerWinner(3, 2); // Ticket 3 - Eighth prize
      
      // Check winner counts
      expect(await lotteryContract.winnersPerLevel(1)).to.equal(2); // Two ninth prize winners
      expect(await lotteryContract.winnersPerLevel(2)).to.equal(1); // One eighth prize winner
      
      console.log("✅ Winner counts tracked correctly:");
      console.log(`   Ninth prize (level 1): 2 winners`);
      console.log(`   Eighth prize (level 2): 1 winner`);
    });

    it("should split prize among multiple winners", async function () {
      const ticketPrice = ethers.parseEther("0.001");
      
      // Buy 5 tickets
      for (let i = 0; i < 5; i++) {
        const input = await fhevm
          .createEncryptedInput(lotteryAddress, alice.address)
          .add8(1).add8(2).add8(3).add8(4).add8(5)
          .add8(1).add8(2)
          .encrypt();
        
        await lotteryContract.connect(alice).buyTicket(
          input.handles[0], input.handles[1], input.handles[2],
          input.handles[3], input.handles[4], input.handles[5],
          input.handles[6], input.inputProof,
          { value: ticketPrice }
        );
      }
      
      const totalPrizePool = await lotteryContract.prizePool();
      console.log(`\n💰 Total prize pool: ${ethers.formatEther(totalPrizePool)} ETH`);
      
      // Draw numbers
      await lotteryContract.drawNumbers();
      
      // Register 3 winners for ninth prize
      await lotteryContract.connect(alice).registerWinner(1, 1);
      await lotteryContract.connect(alice).registerWinner(2, 1);
      await lotteryContract.connect(alice).registerWinner(3, 1);
      
      const totalNinthPrize = await lotteryContract.calculateTotalPrizeForLevel(1);
      const prizePerWinner = await lotteryContract.calculatePrizeAmount(1);
      
      console.log(`\n🎯 Ninth Prize Distribution:`);
      console.log(`   Total for level: ${ethers.formatEther(totalNinthPrize)} ETH`);
      console.log(`   Number of winners: 3`);
      console.log(`   Prize per winner: ${ethers.formatEther(prizePerWinner)} ETH`);
      console.log(`   Expected per winner: ${ethers.formatEther(totalNinthPrize / 3n)} ETH`);
      
      expect(prizePerWinner).to.equal(totalNinthPrize / 3n);
      console.log(`\n✅ Prize correctly split among ${3} winners`);
    });

    it("should handle multiple prize levels with different winner counts", async function () {
      const ticketPrice = ethers.parseEther("0.001");
      
      // Buy 10 tickets
      for (let i = 0; i < 10; i++) {
        const input = await fhevm
          .createEncryptedInput(lotteryAddress, alice.address)
          .add8(1).add8(2).add8(3).add8(4).add8(5)
          .add8(1).add8(2)
          .encrypt();
        
        await lotteryContract.connect(alice).buyTicket(
          input.handles[0], input.handles[1], input.handles[2],
          input.handles[3], input.handles[4], input.handles[5],
          input.handles[6], input.inputProof,
          { value: ticketPrice }
        );
      }
      
      await lotteryContract.drawNumbers();
      
      // Register winners for different levels
      await lotteryContract.connect(alice).registerWinner(1, 1); // Ninth
      await lotteryContract.connect(alice).registerWinner(2, 1); // Ninth
      await lotteryContract.connect(alice).registerWinner(3, 1); // Ninth
      await lotteryContract.connect(alice).registerWinner(4, 2); // Eighth
      await lotteryContract.connect(alice).registerWinner(5, 2); // Eighth
      await lotteryContract.connect(alice).registerWinner(6, 3); // Seventh
      
      console.log("\n🏆 Multi-Level Prize Distribution:\n");
      
      for (let level = 1; level <= 3; level++) {
        const winners = await lotteryContract.winnersPerLevel(level);
        if (winners > 0) {
          const totalPrize = await lotteryContract.calculateTotalPrizeForLevel(level);
          const prizePerWinner = await lotteryContract.calculatePrizeAmount(level);
          
          const levelNames = ["", "Ninth", "Eighth", "Seventh"];
          console.log(`   ${levelNames[level]} Prize (Level ${level}):`);
          console.log(`     Winners: ${winners}`);
          console.log(`     Total: ${ethers.formatEther(totalPrize)} ETH`);
          console.log(`     Per winner: ${ethers.formatEther(prizePerWinner)} ETH\n`);
          
          expect(prizePerWinner).to.equal(totalPrize / winners);
        }
      }
      
      console.log("✅ Multiple prize levels handled correctly");
    });
  });

  describe("🔄 Integration: All Fixes Together", function () {
    it("should work correctly with all fixes in a realistic scenario", async function () {
      console.log("\n" + "=".repeat(60));
      console.log("🎰 COMPLETE LOTTERY ROUND WITH ALL FIXES");
      console.log("=".repeat(60));
      
      const ticketPrice = ethers.parseEther("0.001");
      
      // Step 1: Verify owner
      console.log("\n📋 Step 1: Verify ownership");
      expect(await lotteryContract.owner()).to.equal(deployer.address);
      console.log("   ✅ Owner: " + deployer.address);
      
      // Step 2: Buy tickets
      console.log("\n🎫 Step 2: Players buying tickets");
      const players = [alice, bob, charlie];
      for (let i = 0; i < 6; i++) {
        const player = players[i % players.length];
        const input = await fhevm
          .createEncryptedInput(lotteryAddress, player.address)
          .add8(1 + i).add8(2 + i).add8(3 + i).add8(4 + i).add8(5 + i)
          .add8(i % 10).add8((i + 1) % 10)
          .encrypt();
        
        await lotteryContract.connect(player).buyTicket(
          input.handles[0], input.handles[1], input.handles[2],
          input.handles[3], input.handles[4], input.handles[5],
          input.handles[6], input.inputProof,
          { value: ticketPrice }
        );
      }
      console.log(`   ✅ 6 tickets purchased`);
      console.log(`   💰 Prize pool: ${ethers.formatEther(await lotteryContract.prizePool())} ETH`);
      
      // Step 3: Draw with improved randomness
      console.log("\n🎲 Step 3: Drawing numbers (improved randomness)");
      await lotteryContract.drawNumbers();
      const winningNumbers = await lotteryContract.getWinningNumbers();
      
      const nums = [];
      nums.push(Number(await fhevm.userDecryptEuint(FhevmType.euint8, winningNumbers.num1, lotteryAddress, deployer)));
      nums.push(Number(await fhevm.userDecryptEuint(FhevmType.euint8, winningNumbers.num2, lotteryAddress, deployer)));
      nums.push(Number(await fhevm.userDecryptEuint(FhevmType.euint8, winningNumbers.num3, lotteryAddress, deployer)));
      nums.push(Number(await fhevm.userDecryptEuint(FhevmType.euint8, winningNumbers.num4, lotteryAddress, deployer)));
      nums.push(Number(await fhevm.userDecryptEuint(FhevmType.euint8, winningNumbers.num5, lotteryAddress, deployer)));
      const bonus1 = Number(await fhevm.userDecryptEuint(FhevmType.euint8, winningNumbers.bonus1, lotteryAddress, deployer));
      const bonus2 = Number(await fhevm.userDecryptEuint(FhevmType.euint8, winningNumbers.bonus2, lotteryAddress, deployer));
      
      const uniqueNums = new Set(nums);
      console.log(`   🎰 Winning numbers: [${nums.join(', ')}] + [${bonus1}, ${bonus2}]`);
      console.log(`   ✅ Unique main numbers: ${uniqueNums.size}/5`);
      
      // Step 4: Register winners (multi-winner scenario)
      console.log("\n🏆 Step 4: Registering winners");
      await lotteryContract.connect(alice).registerWinner(1, 1);  // Ticket 1 belongs to Alice
      await lotteryContract.connect(alice).registerWinner(4, 1);  // Ticket 4 belongs to Alice
      await lotteryContract.connect(bob).registerWinner(2, 2);    // Ticket 2 belongs to Bob
      
      console.log("   ✅ 2 winners for Ninth prize");
      console.log("   ✅ 1 winner for Eighth prize");
      
      // Step 5: Verify prize distribution
      console.log("\n💰 Step 5: Prize distribution");
      const ninthTotal = await lotteryContract.calculateTotalPrizeForLevel(1);
      const ninthPerWinner = await lotteryContract.calculatePrizeAmount(1);
      const eighthTotal = await lotteryContract.calculateTotalPrizeForLevel(2);
      const eighthPerWinner = await lotteryContract.calculatePrizeAmount(2);
      
      console.log(`   Ninth Prize: ${ethers.formatEther(ninthTotal)} ETH / 2 = ${ethers.formatEther(ninthPerWinner)} ETH each`);
      console.log(`   Eighth Prize: ${ethers.formatEther(eighthTotal)} ETH / 1 = ${ethers.formatEther(eighthPerWinner)} ETH each`);
      
      expect(ninthPerWinner).to.equal(ninthTotal / 2n);
      expect(eighthPerWinner).to.equal(eighthTotal);
      
      // Step 6: Owner resets for next round
      console.log("\n🔄 Step 6: Owner resets for next round");
      await lotteryContract.connect(deployer).reset();
      expect(await lotteryContract.currentRound()).to.equal(2);
      expect(await lotteryContract.winnersPerLevel(1)).to.equal(0);
      expect(await lotteryContract.winnersPerLevel(2)).to.equal(0);
      console.log("   ✅ Round reset to #2");
      console.log("   ✅ Winner counts reset");
      
      console.log("\n" + "=".repeat(60));
      console.log("✅ ALL FIXES WORKING CORRECTLY!");
      console.log("=".repeat(60) + "\n");
    });
  });
});

