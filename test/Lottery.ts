import { expect } from "chai";
import { ethers, deployments, fhevm } from "hardhat";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { Lottery } from "../types";
import { FhevmType } from "@fhevm/hardhat-plugin";

type Signers = {
  deployer: HardhatEthersSigner;
  alice: HardhatEthersSigner;
  bob: HardhatEthersSigner;
};

describe("Lottery - Privacy Lottery Tests", function () {
  let signers: Signers;
  let lotteryContract: Lottery;
  let lotteryAddress: string;

  before(async function () {
    const ethSigners: HardhatEthersSigner[] = await ethers.getSigners();
    signers = { deployer: ethSigners[0], alice: ethSigners[1], bob: ethSigners[2] };
    
    // Initialize FHEVM
    await fhevm.initializeCLIApi();
  });

  beforeEach(async function () {
    // Deploy contract
    const LotteryFactory = await ethers.getContractFactory("Lottery");
    lotteryContract = (await LotteryFactory.deploy()) as Lottery;
    await lotteryContract.waitForDeployment();
    lotteryAddress = await lotteryContract.getAddress();
    
    console.log(`Lottery contract deployed to: ${lotteryAddress}`);
  });

  it("should deploy contract successfully", async function () {
    expect(ethers.isAddress(lotteryAddress)).to.be.true;
    expect(await lotteryContract.hasDrawn()).to.be.false;
    expect(await lotteryContract.currentTicketId()).to.equal(0);
  });

  it("should be able to buy lottery tickets", async function () {
    // Create encrypted input
    const input = await fhevm
      .createEncryptedInput(lotteryAddress, signers.alice.address)
      .add8(5)   // num1: 5 (0-31)
      .add8(12)  // num2: 12 (0-31)
      .add8(18)  // num3: 18 (0-31)
      .add8(25)  // num4: 25 (0-31)
      .add8(30)  // num5: 30 (0-31)
      .add8(3)   // bonus1: 3 (0-9)
      .add8(7)   // bonus2: 7 (0-9)
      .encrypt();

    // Buy lottery ticket (pay 0.001 ETH)
    const ticketPrice = ethers.parseEther("0.001");
    const tx = await lotteryContract
      .connect(signers.alice)
      .buyTicket(
        input.handles[0],
        input.handles[1],
        input.handles[2],
        input.handles[3],
        input.handles[4],
        input.handles[5],
        input.handles[6],
        input.inputProof,
        { value: ticketPrice }
      );

    await tx.wait();

    // Verify ticket ID has increased
    expect(await lotteryContract.currentTicketId()).to.equal(1);

    // Get ticket information
    const ticket = await lotteryContract.getTicket(1);
    expect(ticket.player).to.equal(signers.alice.address);
    expect(ticket.exists).to.be.true;

    console.log("✅ Alice successfully bought ticket, ID: 1");
  });

  it("should be able to draw numbers and generate random winning numbers", async function () {
    // Draw numbers
    const tx = await lotteryContract.drawNumbers();
    await tx.wait();

    // Verify numbers have been drawn
    expect(await lotteryContract.hasDrawn()).to.be.true;

    // Get winning numbers
    const winningNumbers = await lotteryContract.getWinningNumbers();
    expect(winningNumbers.num1).to.not.equal(ethers.ZeroHash);

    console.log("✅ Draw successful, random winning numbers generated");
  });

  it("should be able to decrypt winning numbers", async function () {
    // Draw numbers
    const drawTx = await lotteryContract.drawNumbers();
    await drawTx.wait();

    // Get encrypted winning numbers
    const winningNumbers = await lotteryContract.getWinningNumbers();

    // Decrypt first 5 numbers
    const num1 = await fhevm.userDecryptEuint(
      FhevmType.euint8,
      winningNumbers.num1,
      lotteryAddress,
      signers.deployer
    );

    const num2 = await fhevm.userDecryptEuint(
      FhevmType.euint8,
      winningNumbers.num2,
      lotteryAddress,
      signers.deployer
    );

    const num3 = await fhevm.userDecryptEuint(
      FhevmType.euint8,
      winningNumbers.num3,
      lotteryAddress,
      signers.deployer
    );

    const num4 = await fhevm.userDecryptEuint(
      FhevmType.euint8,
      winningNumbers.num4,
      lotteryAddress,
      signers.deployer
    );

    const num5 = await fhevm.userDecryptEuint(
      FhevmType.euint8,
      winningNumbers.num5,
      lotteryAddress,
      signers.deployer
    );

    // Decrypt last 2 numbers
    const bonus1 = await fhevm.userDecryptEuint(
      FhevmType.euint8,
      winningNumbers.bonus1,
      lotteryAddress,
      signers.deployer
    );

    const bonus2 = await fhevm.userDecryptEuint(
      FhevmType.euint8,
      winningNumbers.bonus2,
      lotteryAddress,
      signers.deployer
    );

    // Verify number ranges
    expect(Number(num1)).to.be.lessThan(32);
    expect(Number(num2)).to.be.lessThan(32);
    expect(Number(num3)).to.be.lessThan(32);
    expect(Number(num4)).to.be.lessThan(32);
    expect(Number(num5)).to.be.lessThan(32);
    expect(Number(bonus1)).to.be.lessThan(10);
    expect(Number(bonus2)).to.be.lessThan(10);

    console.log("\n🎰 Winning numbers:");
    console.log(`   Main: ${num1}, ${num2}, ${num3}, ${num4}, ${num5}`);
    console.log(`   Bonus: ${bonus1}, ${bonus2}`);
  });

  it("should be able to buy tickets and check for winnings", async function () {
    // Alice buys ticket
    const aliceInput = await fhevm
      .createEncryptedInput(lotteryAddress, signers.alice.address)
      .add8(5)
      .add8(12)
      .add8(18)
      .add8(25)
      .add8(30)
      .add8(3)
      .add8(7)
      .encrypt();

    const ticketPrice = ethers.parseEther("0.001");
    const buyTx = await lotteryContract
      .connect(signers.alice)
      .buyTicket(
        aliceInput.handles[0],
        aliceInput.handles[1],
        aliceInput.handles[2],
        aliceInput.handles[3],
        aliceInput.handles[4],
        aliceInput.handles[5],
        aliceInput.handles[6],
        aliceInput.inputProof,
        { value: ticketPrice }
      );

    await buyTx.wait();

    // Draw numbers
    const drawTx = await lotteryContract.drawNumbers();
    await drawTx.wait();

    // Check ticket
    const checkTx = await lotteryContract
      .connect(signers.alice)
      .checkTicket(1);
    await checkTx.wait();

    // Get match results
    const encryptedMatches = await lotteryContract.getTicketMatches(1);

    // Decrypt match count
    const matches = await fhevm.userDecryptEuint(
      FhevmType.euint8,
      encryptedMatches,
      lotteryAddress,
      signers.alice
    );

    console.log(`\n🎫 Alice's ticket matched ${matches} numbers`);
    expect(Number(matches)).to.be.greaterThanOrEqual(0);
    expect(Number(matches)).to.be.lessThanOrEqual(7);
  });

  it("multiple players should be able to buy tickets", async function () {
    // Alice buys ticket
    const aliceInput = await fhevm
      .createEncryptedInput(lotteryAddress, signers.alice.address)
      .add8(1)
      .add8(2)
      .add8(3)
      .add8(4)
      .add8(5)
      .add8(1)
      .add8(2)
      .encrypt();

    const ticketPrice = ethers.parseEther("0.001");
    await lotteryContract
      .connect(signers.alice)
      .buyTicket(
        aliceInput.handles[0],
        aliceInput.handles[1],
        aliceInput.handles[2],
        aliceInput.handles[3],
        aliceInput.handles[4],
        aliceInput.handles[5],
        aliceInput.handles[6],
        aliceInput.inputProof,
        { value: ticketPrice }
      );

    // Bob buys ticket
    const bobInput = await fhevm
      .createEncryptedInput(lotteryAddress, signers.bob.address)
      .add8(10)
      .add8(11)
      .add8(12)
      .add8(13)
      .add8(14)
      .add8(5)
      .add8(6)
      .encrypt();

    await lotteryContract
      .connect(signers.bob)
      .buyTicket(
        bobInput.handles[0],
        bobInput.handles[1],
        bobInput.handles[2],
        bobInput.handles[3],
        bobInput.handles[4],
        bobInput.handles[5],
        bobInput.handles[6],
        bobInput.inputProof,
        { value: ticketPrice }
      );

    // Verify ticket count
    expect(await lotteryContract.currentTicketId()).to.equal(2);

    const ticket1 = await lotteryContract.getTicket(1);
    const ticket2 = await lotteryContract.getTicket(2);

    expect(ticket1.player).to.equal(signers.alice.address);
    expect(ticket2.player).to.equal(signers.bob.address);

    console.log("✅ Both Alice and Bob successfully bought tickets");
  });

  it("should not be able to get winning numbers before draw", async function () {
    await expect(lotteryContract.getWinningNumbers()).to.be.revertedWith(
      "Numbers not drawn yet"
    );
  });

  it("should not be able to check tickets before draw", async function () {
    // First buy a ticket
    const input = await fhevm
      .createEncryptedInput(lotteryAddress, signers.alice.address)
      .add8(1)
      .add8(2)
      .add8(3)
      .add8(4)
      .add8(5)
      .add8(1)
      .add8(2)
      .encrypt();

    const ticketPrice = ethers.parseEther("0.001");
    const buyTx = await lotteryContract
      .connect(signers.alice)
      .buyTicket(
        input.handles[0],
        input.handles[1],
        input.handles[2],
        input.handles[3],
        input.handles[4],
        input.handles[5],
        input.handles[6],
        input.inputProof,
        { value: ticketPrice }
      );
    await buyTx.wait();

    // Try to check ticket (should fail)
    await expect(
      lotteryContract.connect(signers.alice).checkTicket(1)
    ).to.be.revertedWith("Numbers not drawn yet");
  });

  it("should not allow duplicate draws", async function () {
    await lotteryContract.drawNumbers();
    await expect(lotteryContract.drawNumbers()).to.be.revertedWith(
      "Numbers already drawn"
    );
  });

  it("users should be able to buy multiple tickets", async function () {
    const ticketPrice = ethers.parseEther("0.001");
    
    // Alice buys first ticket
    const input1 = await fhevm
      .createEncryptedInput(lotteryAddress, signers.alice.address)
      .add8(1)
      .add8(2)
      .add8(3)
      .add8(4)
      .add8(5)
      .add8(1)
      .add8(2)
      .encrypt();

    const tx1 = await lotteryContract
      .connect(signers.alice)
      .buyTicket(
        input1.handles[0],
        input1.handles[1],
        input1.handles[2],
        input1.handles[3],
        input1.handles[4],
        input1.handles[5],
        input1.handles[6],
        input1.inputProof,
        { value: ticketPrice }
      );
    await tx1.wait();

    // Alice buys second ticket
    const input2 = await fhevm
      .createEncryptedInput(lotteryAddress, signers.alice.address)
      .add8(10)
      .add8(11)
      .add8(12)
      .add8(13)
      .add8(14)
      .add8(5)
      .add8(6)
      .encrypt();

    const tx2 = await lotteryContract
      .connect(signers.alice)
      .buyTicket(
        input2.handles[0],
        input2.handles[1],
        input2.handles[2],
        input2.handles[3],
        input2.handles[4],
        input2.handles[5],
        input2.handles[6],
        input2.inputProof,
        { value: ticketPrice }
      );
    await tx2.wait();

    // Alice buys third ticket
    const input3 = await fhevm
      .createEncryptedInput(lotteryAddress, signers.alice.address)
      .add8(20)
      .add8(21)
      .add8(22)
      .add8(23)
      .add8(24)
      .add8(7)
      .add8(8)
      .encrypt();

    const tx3 = await lotteryContract
      .connect(signers.alice)
      .buyTicket(
        input3.handles[0],
        input3.handles[1],
        input3.handles[2],
        input3.handles[3],
        input3.handles[4],
        input3.handles[5],
        input3.handles[6],
        input3.inputProof,
        { value: ticketPrice }
      );
    await tx3.wait();

    // Verify ticket count
    expect(await lotteryContract.currentTicketId()).to.equal(3);

    // Verify prize pool
    const balance = await lotteryContract.getBalance();
    expect(balance).to.equal(ethers.parseEther("0.003")); // 3 tickets × 0.001 ETH

    // Verify all tickets belong to Alice
    const ticket1 = await lotteryContract.getTicket(1);
    const ticket2 = await lotteryContract.getTicket(2);
    const ticket3 = await lotteryContract.getTicket(3);

    expect(ticket1.player).to.equal(signers.alice.address);
    expect(ticket2.player).to.equal(signers.alice.address);
    expect(ticket3.player).to.equal(signers.alice.address);

    console.log("✅ Alice successfully bought 3 tickets");
    console.log(`   Ticket IDs: 1, 2, 3`);
    console.log(`   Total cost: 0.003 ETH`);
    console.log(`   Prize pool: ${ethers.formatEther(balance)} ETH`);
  });

  it("should validate ticket price", async function () {
    const input = await fhevm
      .createEncryptedInput(lotteryAddress, signers.alice.address)
      .add8(1)
      .add8(2)
      .add8(3)
      .add8(4)
      .add8(5)
      .add8(1)
      .add8(2)
      .encrypt();

    // Try to buy with wrong amount (should fail)
    await expect(
      lotteryContract
        .connect(signers.alice)
        .buyTicket(
          input.handles[0],
          input.handles[1],
          input.handles[2],
          input.handles[3],
          input.handles[4],
          input.handles[5],
          input.handles[6],
          input.inputProof,
          { value: ethers.parseEther("0.002") } // Wrong amount
        )
    ).to.be.revertedWith("Incorrect ticket price");

    // Buy with correct amount (should succeed)
    const tx = await lotteryContract
      .connect(signers.alice)
      .buyTicket(
        input.handles[0],
        input.handles[1],
        input.handles[2],
        input.handles[3],
        input.handles[4],
        input.handles[5],
        input.handles[6],
        input.inputProof,
        { value: ethers.parseEther("0.001") } // Correct amount
      );
    await tx.wait();

    expect(await lotteryContract.currentTicketId()).to.equal(1);
    console.log("✅ Ticket price validation passed");
  });

  it("should support prize pool accumulation mechanism", async function () {
    const ticketPrice = ethers.parseEther("0.001");
    
    // First round: buy tickets
    const input1 = await fhevm
      .createEncryptedInput(lotteryAddress, signers.alice.address)
      .add8(1)
      .add8(2)
      .add8(3)
      .add8(4)
      .add8(5)
      .add8(1)
      .add8(2)
      .encrypt();

    const tx1 = await lotteryContract
      .connect(signers.alice)
      .buyTicket(
        input1.handles[0],
        input1.handles[1],
        input1.handles[2],
        input1.handles[3],
        input1.handles[4],
        input1.handles[5],
        input1.handles[6],
        input1.inputProof,
        { value: ticketPrice }
      );
    await tx1.wait();

    // Draw numbers
    const drawTx = await lotteryContract.drawNumbers();
    await drawTx.wait();

    // Check first round prize pool
    const firstRoundPrizePool = await lotteryContract.prizePool();
    const firstRoundAccumulated = await lotteryContract.getAccumulatedPrizePool();
    const firstRoundTotal = await lotteryContract.getTotalPrizePool();
    
    expect(firstRoundPrizePool).to.equal(ethers.parseEther("0.001"));
    expect(firstRoundAccumulated).to.equal(0);
    expect(firstRoundTotal).to.equal(ethers.parseEther("0.001"));

    // Simulate next round start (prize accumulation)
    await lotteryContract.performUpkeep(ethers.AbiCoder.defaultAbiCoder().encode(["uint256"], [2]));

    // Check state after accumulation
    const secondRoundPrizePool = await lotteryContract.prizePool();
    const secondRoundAccumulated = await lotteryContract.getAccumulatedPrizePool();
    const secondRoundTotal = await lotteryContract.getTotalPrizePool();
    
    expect(secondRoundPrizePool).to.equal(0); // Current prize pool reset
    expect(secondRoundAccumulated).to.equal(ethers.parseEther("0.001")); // Accumulated prize pool
    expect(secondRoundTotal).to.equal(ethers.parseEther("0.001")); // Total prize pool

    // Second round: buy more tickets
    const input2 = await fhevm
      .createEncryptedInput(lotteryAddress, signers.bob.address)
      .add8(10)
      .add8(11)
      .add8(12)
      .add8(13)
      .add8(14)
      .add8(5)
      .add8(6)
      .encrypt();

    const tx2 = await lotteryContract
      .connect(signers.bob)
      .buyTicket(
        input2.handles[0],
        input2.handles[1],
        input2.handles[2],
        input2.handles[3],
        input2.handles[4],
        input2.handles[5],
        input2.handles[6],
        input2.inputProof,
        { value: ticketPrice }
      );
    await tx2.wait();

    // Check second round prize pool
    const finalPrizePool = await lotteryContract.prizePool();
    const finalAccumulated = await lotteryContract.getAccumulatedPrizePool();
    const finalTotal = await lotteryContract.getTotalPrizePool();
    
    expect(finalPrizePool).to.equal(ethers.parseEther("0.001")); // Second round ticket fees
    expect(finalAccumulated).to.equal(ethers.parseEther("0.001")); // First round accumulation
    expect(finalTotal).to.equal(ethers.parseEther("0.002")); // Total

    console.log("✅ Prize pool accumulation mechanism test passed");
    console.log(`   First round prize pool: ${ethers.formatEther(firstRoundPrizePool)} ETH`);
    console.log(`   Accumulated prize pool: ${ethers.formatEther(finalAccumulated)} ETH`);
    console.log(`   Second round prize pool: ${ethers.formatEther(finalPrizePool)} ETH`);
    console.log(`   Total prize pool: ${ethers.formatEther(finalTotal)} ETH`);
  });
});

