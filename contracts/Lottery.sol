// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import {FHE, euint8, ebool, externalEuint8} from "@fhevm/solidity/lib/FHE.sol";
import {SepoliaConfig} from "@fhevm/solidity/config/ZamaConfig.sol";
import "@chainlink/contracts/src/v0.8/automation/interfaces/AutomationCompatibleInterface.sol";

/// @title Privacy Lottery Contract
/// @notice Privacy-preserving lottery system using FHEVM with Chainlink Automation for automatic drawing
contract Lottery is SepoliaConfig, AutomationCompatibleInterface {
    /// @notice Lottery numbers structure
    struct LotteryNumbers {
        euint8 num1; // 0-31
        euint8 num2; // 0-31
        euint8 num3; // 0-31
        euint8 num4; // 0-31
        euint8 num5; // 0-31
        euint8 bonus1; // 0-9
        euint8 bonus2; // 0-9
    }

    /// @notice User purchased ticket
    struct Ticket {
        address player;
        LotteryNumbers numbers;
        uint256 purchaseTime;
        bool exists;
    }

    /// @notice Winning numbers result
    LotteryNumbers public winningNumbers;
    
    /// @notice Whether numbers have been drawn
    bool public hasDrawn;
    
    /// @notice Mapping from ticket ID to ticket
    mapping(uint256 => Ticket) public tickets;
    
    /// @notice Mapping from ticket ID to match count
    mapping(uint256 => euint8) private ticketMatches;
    
    /// @notice Mapping from ticket ID to prize level
    mapping(uint256 => euint8) private ticketPrizeLevel;
    
    /// @notice Mapping from ticket ID to whether prize has been claimed
    mapping(uint256 => bool) private hasClaimedPrize;
    
    /// @notice Current ticket ID
    uint256 public currentTicketId;
    
    /// @notice Total prize pool
    uint256 public prizePool;
    
    /// @notice Accumulated prize pool (unclaimed prizes roll over to next round)
    uint256 public accumulatedPrizePool;
    

    /// @notice Ticket price
    uint256 public constant TICKET_PRICE = 0.001 ether;
    
    /// @notice Whether ticket buying is allowed
    bool public isBuyingOpen = true;
    
    /// @notice Last automation execution timestamp
    uint256 public lastUpkeepTime;
    
    /// @notice Daily draw time (UTC 20:00 = 20 * 3600 = 72000 seconds)
    uint256 public constant DRAW_TIME = 20 * 3600; // UTC 20:00
    
    /// @notice Stop buying time (UTC 19:00 = 19 * 3600 = 68400 seconds)
    uint256 public constant STOP_BUYING_TIME = 19 * 3600; // UTC 19:00
    
    /// @notice Total seconds in one day
    uint256 public constant ONE_DAY = 24 * 3600;

    /// @notice Event: Ticket purchased
    event TicketPurchased(uint256 indexed ticketId, address indexed player, uint256 timestamp);
    
    /// @notice Event: Numbers drawn
    event NumbersDrawn(uint256 timestamp);
    
    /// @notice Event: Buying stopped
    event BuyingStopped(uint256 timestamp);
    
    /// @notice Event: Buying reopened
    event BuyingReopened(uint256 timestamp);
    
    /// @notice Event: Automation performed
    event UpkeepPerformed(uint256 action, uint256 timestamp);
    
    /// @notice Event: Prize claimed
    event PrizeClaimed(uint256 indexed ticketId, address indexed player, uint256 prizeAmount, uint256 feeAmount, uint256 timestamp);
    
    /// @notice Prize level enumeration
    enum PrizeLevel {
        NO_PRIZE,    // 0 - No prize
        NINTH,       // 1 - Ninth prize
        EIGHTH,      // 2 - Eighth prize
        SEVENTH,     // 3 - Seventh prize
        SIXTH,       // 4 - Sixth prize
        FIFTH,       // 5 - Fifth prize
        FOURTH,      // 6 - Fourth prize
        THIRD,       // 7 - Third prize
        SECOND,      // 8 - Second prize
        FIRST        // 9 - First prize
    }

    /// @notice Buy lottery ticket
    /// @dev User submits encrypted lottery numbers
    function buyTicket(
        externalEuint8 _num1,
        externalEuint8 _num2,
        externalEuint8 _num3,
        externalEuint8 _num4,
        externalEuint8 _num5,
        externalEuint8 _bonus1,
        externalEuint8 _bonus2,
        bytes calldata inputProof
    ) external payable returns (uint256) {
        require(isBuyingOpen, "Buying is currently closed");
        require(!hasDrawn, "Current lottery has already been drawn");
        require(msg.value == TICKET_PRICE, "Incorrect ticket price");
        
        // Add ticket fee to prize pool
        prizePool += msg.value;
        
        // Convert from external input to internal euint8
        euint8 num1 = FHE.fromExternal(_num1, inputProof);
        euint8 num2 = FHE.fromExternal(_num2, inputProof);
        euint8 num3 = FHE.fromExternal(_num3, inputProof);
        euint8 num4 = FHE.fromExternal(_num4, inputProof);
        euint8 num5 = FHE.fromExternal(_num5, inputProof);
        euint8 bonus1 = FHE.fromExternal(_bonus1, inputProof);
        euint8 bonus2 = FHE.fromExternal(_bonus2, inputProof);
        
        currentTicketId++;
        
        tickets[currentTicketId] = Ticket({
            player: msg.sender,
            numbers: LotteryNumbers({
                num1: num1,
                num2: num2,
                num3: num3,
                num4: num4,
                num5: num5,
                bonus1: bonus1,
                bonus2: bonus2
            }),
            purchaseTime: block.timestamp,
            exists: true
        });

        // Set ACL permissions, allow contract and buyer access
        FHE.allowThis(num1);
        FHE.allowThis(num2);
        FHE.allowThis(num3);
        FHE.allowThis(num4);
        FHE.allowThis(num5);
        FHE.allowThis(bonus1);
        FHE.allowThis(bonus2);
        
        FHE.allow(num1, msg.sender);
        FHE.allow(num2, msg.sender);
        FHE.allow(num3, msg.sender);
        FHE.allow(num4, msg.sender);
        FHE.allow(num5, msg.sender);
        FHE.allow(bonus1, msg.sender);
        FHE.allow(bonus2, msg.sender);

        emit TicketPurchased(currentTicketId, msg.sender, block.timestamp);
        
        return currentTicketId;
    }

    /// @notice Draw numbers - generate random winning numbers
    /// @dev Uses FHE random number generator
    function drawNumbers() external {
        require(!hasDrawn, "Numbers already drawn");
        _drawNumbers();
    }
    
    /// @notice Internal draw function
    /// @dev Used by automation and manual drawing
    function _drawNumbers() internal {
        
        // Generate first 5 numbers (0-31)
        winningNumbers.num1 = FHE.randEuint8(32);
        winningNumbers.num2 = FHE.randEuint8(32);
        winningNumbers.num3 = FHE.randEuint8(32);
        winningNumbers.num4 = FHE.randEuint8(32);
        winningNumbers.num5 = FHE.randEuint8(32);
        
        // Generate last 2 numbers (0-9)
        // Note: randEuint8 parameter must be power of 2, so we generate 0-15 then mod 10
        winningNumbers.bonus1 = FHE.rem(FHE.randEuint8(16), 10);
        winningNumbers.bonus2 = FHE.rem(FHE.randEuint8(16), 10);

        // Set ACL permissions - allow contract and caller access
        FHE.allowThis(winningNumbers.num1);
        FHE.allowThis(winningNumbers.num2);
        FHE.allowThis(winningNumbers.num3);
        FHE.allowThis(winningNumbers.num4);
        FHE.allowThis(winningNumbers.num5);
        FHE.allowThis(winningNumbers.bonus1);
        FHE.allowThis(winningNumbers.bonus2);
        
        FHE.allow(winningNumbers.num1, msg.sender);
        FHE.allow(winningNumbers.num2, msg.sender);
        FHE.allow(winningNumbers.num3, msg.sender);
        FHE.allow(winningNumbers.num4, msg.sender);
        FHE.allow(winningNumbers.num5, msg.sender);
        FHE.allow(winningNumbers.bonus1, msg.sender);
        FHE.allow(winningNumbers.bonus2, msg.sender);

        hasDrawn = true;
        
        emit NumbersDrawn(block.timestamp);
    }
    
    /// @notice Chainlink Automation check function
    /// @dev Checks if automation operations need to be performed
    function checkUpkeep(bytes calldata /* checkData */) 
        external 
        view 
        override 
        returns (bool upkeepNeeded, bytes memory performData) 
    {
        uint256 currentTime = block.timestamp;
        uint256 timeOfDay = currentTime % ONE_DAY;
        
        // Check if need to stop buying (UTC 19:00)
        if (timeOfDay >= STOP_BUYING_TIME && timeOfDay < DRAW_TIME && isBuyingOpen) {
            upkeepNeeded = true;
            performData = abi.encode(0); // 0 = stop buying
        }
        // Check if need to draw (UTC 20:00)
        else if (timeOfDay >= DRAW_TIME && timeOfDay < (DRAW_TIME + 3600) && !hasDrawn) {
            upkeepNeeded = true;
            performData = abi.encode(1); // 1 = draw numbers
        }
        // Check if need to reopen buying (after UTC 20:00, if drawn)
        else if (timeOfDay >= DRAW_TIME && hasDrawn && !isBuyingOpen) {
            upkeepNeeded = true;
            performData = abi.encode(2); // 2 = reopen buying
        }
        else {
            upkeepNeeded = false;
            performData = "";
        }
    }
    
    /// @notice Chainlink Automation perform function
    /// @dev Executes automation operations
    function performUpkeep(bytes calldata performData) external override {
        uint256 action = abi.decode(performData, (uint256));
        
        if (action == 0) {
            // Stop buying
            isBuyingOpen = false;
            emit BuyingStopped(block.timestamp);
        } else if (action == 1) {
            // Draw numbers
            _drawNumbers();
        } else if (action == 2) {
            // Reopen buying (prepare for next day)
            // Roll unclaimed prizes to next round
            accumulatedPrizePool += prizePool;
            prizePool = 0; // Reset current prize pool
            isBuyingOpen = true;
            hasDrawn = false;
            currentTicketId = 0; // Reset ticket ID
            emit BuyingReopened(block.timestamp);
        }
        
        lastUpkeepTime = block.timestamp;
        emit UpkeepPerformed(action, block.timestamp);
    }
    
    /// @notice Get current time information
    /// @dev Used for debugging and monitoring
    function getTimeInfo() external view returns (
        uint256 currentTime,
        uint256 timeOfDay,
        bool isDrawTime,
        bool isStopBuyingTime,
        bool shouldStopBuying,
        bool shouldDraw,
        bool shouldReopen
    ) {
        currentTime = block.timestamp;
        timeOfDay = currentTime % ONE_DAY;
        isDrawTime = timeOfDay >= DRAW_TIME && timeOfDay < (DRAW_TIME + 3600);
        isStopBuyingTime = timeOfDay >= STOP_BUYING_TIME && timeOfDay < DRAW_TIME;
        shouldStopBuying = isStopBuyingTime && isBuyingOpen;
        shouldDraw = isDrawTime && !hasDrawn;
        shouldReopen = timeOfDay >= DRAW_TIME && hasDrawn && !isBuyingOpen;
    }

    /// @notice Get winning numbers
    /// @return Returns encrypted winning numbers
    function getWinningNumbers() external view returns (LotteryNumbers memory) {
        require(hasDrawn, "Numbers not drawn yet");
        return winningNumbers;
    }

    /// @notice Check if ticket won
    /// @param ticketId Ticket ID
    /// @dev Calculates front and back area match counts and determines prize level
    function checkTicket(uint256 ticketId) external {
        require(hasDrawn, "Numbers not drawn yet");
        require(tickets[ticketId].exists, "Ticket does not exist");
        
        Ticket memory ticket = tickets[ticketId];
        
        // Calculate front area match count (order doesn't matter)
        euint8 frontMatches = _countFrontMatches(ticket.numbers);
        
        // Calculate back area match count (order doesn't matter)
        euint8 backMatches = _countBackMatches(ticket.numbers);
        
        // Calculate total match count
        euint8 totalMatches = FHE.add(frontMatches, backMatches);
        
        // Calculate prize level
        euint8 prizeLevel = _calculatePrizeLevel(frontMatches, backMatches);
        
        // Store results
        ticketMatches[ticketId] = totalMatches;
        ticketPrizeLevel[ticketId] = prizeLevel;
        
        FHE.allowThis(totalMatches);
        FHE.allowThis(prizeLevel);
        FHE.allow(totalMatches, msg.sender);
        FHE.allow(prizeLevel, msg.sender);
    }
    
    /// @notice Calculate front area match count (set matching, order doesn't matter)
    /// @param numbers User lottery numbers
    /// @return Front area match count
    function _countFrontMatches(LotteryNumbers memory numbers) internal returns (euint8) {
        euint8 matches = FHE.asEuint8(0);
        
        // Check if each user's front number is in winning numbers
        // User number 1
        ebool match1 = FHE.or(
            FHE.or(FHE.or(
                FHE.eq(numbers.num1, winningNumbers.num1),
                FHE.eq(numbers.num1, winningNumbers.num2)
            ), FHE.or(
                FHE.eq(numbers.num1, winningNumbers.num3),
                FHE.eq(numbers.num1, winningNumbers.num4)
            )),
            FHE.eq(numbers.num1, winningNumbers.num5)
        );
        matches = FHE.select(match1, FHE.add(matches, FHE.asEuint8(1)), matches);
        
        // User number 2
        ebool match2 = FHE.or(
            FHE.or(FHE.or(
                FHE.eq(numbers.num2, winningNumbers.num1),
                FHE.eq(numbers.num2, winningNumbers.num2)
            ), FHE.or(
                FHE.eq(numbers.num2, winningNumbers.num3),
                FHE.eq(numbers.num2, winningNumbers.num4)
            )),
            FHE.eq(numbers.num2, winningNumbers.num5)
        );
        matches = FHE.select(match2, FHE.add(matches, FHE.asEuint8(1)), matches);
        
        // User number 3
        ebool match3 = FHE.or(
            FHE.or(FHE.or(
                FHE.eq(numbers.num3, winningNumbers.num1),
                FHE.eq(numbers.num3, winningNumbers.num2)
            ), FHE.or(
                FHE.eq(numbers.num3, winningNumbers.num3),
                FHE.eq(numbers.num3, winningNumbers.num4)
            )),
            FHE.eq(numbers.num3, winningNumbers.num5)
        );
        matches = FHE.select(match3, FHE.add(matches, FHE.asEuint8(1)), matches);
        
        // User number 4
        ebool match4 = FHE.or(
            FHE.or(FHE.or(
                FHE.eq(numbers.num4, winningNumbers.num1),
                FHE.eq(numbers.num4, winningNumbers.num2)
            ), FHE.or(
                FHE.eq(numbers.num4, winningNumbers.num3),
                FHE.eq(numbers.num4, winningNumbers.num4)
            )),
            FHE.eq(numbers.num4, winningNumbers.num5)
        );
        matches = FHE.select(match4, FHE.add(matches, FHE.asEuint8(1)), matches);
        
        // User number 5
        ebool match5 = FHE.or(
            FHE.or(FHE.or(
                FHE.eq(numbers.num5, winningNumbers.num1),
                FHE.eq(numbers.num5, winningNumbers.num2)
            ), FHE.or(
                FHE.eq(numbers.num5, winningNumbers.num3),
                FHE.eq(numbers.num5, winningNumbers.num4)
            )),
            FHE.eq(numbers.num5, winningNumbers.num5)
        );
        matches = FHE.select(match5, FHE.add(matches, FHE.asEuint8(1)), matches);
        
        return matches;
    }
    
    /// @notice Calculate back area match count (set matching, order doesn't matter)
    /// @param numbers User lottery numbers
    /// @return Back area match count
    function _countBackMatches(LotteryNumbers memory numbers) internal returns (euint8) {
        euint8 matches = FHE.asEuint8(0);
        
        // Check if each user's back number is in winning numbers
        // Back number 1
        ebool match1 = FHE.or(
            FHE.eq(numbers.bonus1, winningNumbers.bonus1),
            FHE.eq(numbers.bonus1, winningNumbers.bonus2)
        );
        matches = FHE.select(match1, FHE.add(matches, FHE.asEuint8(1)), matches);
        
        // Back number 2
        ebool match2 = FHE.or(
            FHE.eq(numbers.bonus2, winningNumbers.bonus1),
            FHE.eq(numbers.bonus2, winningNumbers.bonus2)
        );
        matches = FHE.select(match2, FHE.add(matches, FHE.asEuint8(1)), matches);
        
        return matches;
    }
    
    /// @notice Calculate prize level
    /// @param frontMatches Front area match count
    /// @param backMatches Back area match count
    /// @return Prize level (0=no prize, 1-9=ninth to first prize)
    function _calculatePrizeLevel(euint8 frontMatches, euint8 backMatches) internal returns (euint8) {
        euint8 level = FHE.asEuint8(0); // Default no prize
        
        // First prize: 5 front + 2 back
        ebool firstPrize = FHE.and(FHE.eq(frontMatches, FHE.asEuint8(5)), FHE.eq(backMatches, FHE.asEuint8(2)));
        level = FHE.select(firstPrize, FHE.asEuint8(9), level);
        
        // Second prize: 5 front + 1 back
        ebool secondPrize = FHE.and(FHE.eq(frontMatches, FHE.asEuint8(5)), FHE.eq(backMatches, FHE.asEuint8(1)));
        level = FHE.select(secondPrize, FHE.asEuint8(8), level);
        
        // Third prize: 5 front + 0 back
        ebool thirdPrize = FHE.and(FHE.eq(frontMatches, FHE.asEuint8(5)), FHE.eq(backMatches, FHE.asEuint8(0)));
        level = FHE.select(thirdPrize, FHE.asEuint8(7), level);
        
        // Fourth prize: 4 front + 2 back
        ebool fourthPrize = FHE.and(FHE.eq(frontMatches, FHE.asEuint8(4)), FHE.eq(backMatches, FHE.asEuint8(2)));
        level = FHE.select(fourthPrize, FHE.asEuint8(6), level);
        
        // Fifth prize: 4 front + 1 back
        ebool fifthPrize = FHE.and(FHE.eq(frontMatches, FHE.asEuint8(4)), FHE.eq(backMatches, FHE.asEuint8(1)));
        level = FHE.select(fifthPrize, FHE.asEuint8(5), level);
        
        // Sixth prize: 3 front + 2 back
        ebool sixthPrize = FHE.and(FHE.eq(frontMatches, FHE.asEuint8(3)), FHE.eq(backMatches, FHE.asEuint8(2)));
        level = FHE.select(sixthPrize, FHE.asEuint8(4), level);
        
        // Seventh prize: 4 front + 0 back
        ebool seventhPrize = FHE.and(FHE.eq(frontMatches, FHE.asEuint8(4)), FHE.eq(backMatches, FHE.asEuint8(0)));
        level = FHE.select(seventhPrize, FHE.asEuint8(3), level);
        
        // Eighth prize: (3 front + 1 back) or (2 front + 2 back)
        ebool eighthPrize1 = FHE.and(FHE.eq(frontMatches, FHE.asEuint8(3)), FHE.eq(backMatches, FHE.asEuint8(1)));
        ebool eighthPrize2 = FHE.and(FHE.eq(frontMatches, FHE.asEuint8(2)), FHE.eq(backMatches, FHE.asEuint8(2)));
        ebool eighthPrize = FHE.or(eighthPrize1, eighthPrize2);
        level = FHE.select(eighthPrize, FHE.asEuint8(2), level);
        
        // Ninth prize: (3 front + 0 back) or (1 front + 2 back) or (2 front + 1 back) or (0 front + 2 back)
        ebool ninthPrize1 = FHE.and(FHE.eq(frontMatches, FHE.asEuint8(3)), FHE.eq(backMatches, FHE.asEuint8(0)));
        ebool ninthPrize2 = FHE.and(FHE.eq(frontMatches, FHE.asEuint8(1)), FHE.eq(backMatches, FHE.asEuint8(2)));
        ebool ninthPrize3 = FHE.and(FHE.eq(frontMatches, FHE.asEuint8(2)), FHE.eq(backMatches, FHE.asEuint8(1)));
        ebool ninthPrize4 = FHE.and(FHE.eq(frontMatches, FHE.asEuint8(0)), FHE.eq(backMatches, FHE.asEuint8(2)));
        ebool ninthPrize = FHE.or(FHE.or(FHE.or(ninthPrize1, ninthPrize2), ninthPrize3), ninthPrize4);
        level = FHE.select(ninthPrize, FHE.asEuint8(1), level);
        
        return level;
    }
    
    /// @notice Claim prize
    /// @param ticketId Ticket ID
    function claimPrize(uint256 ticketId) external {
        require(tickets[ticketId].exists, "Ticket does not exist");
        require(tickets[ticketId].player == msg.sender, "Not ticket owner");
        require(!hasClaimedPrize[ticketId], "Prize already claimed");
        require(hasDrawn, "Numbers not drawn yet");
        
        // Note: In actual application, prize level needs to be obtained through decryption oracle
        // For demo purposes, we assume ticket has been checked
        // In production, should use Zama's decryption oracle
        
        // We cannot decrypt directly in contract, so user needs to call checkTicket first
        // Then learn their prize level through off-chain decryption
        // This function needs to work with off-chain decryption
        
        // Mark as claimed
        hasClaimedPrize[ticketId] = true;
        
        // Note: Complete implementation requires integrating Zama decryption oracle to get actual prize level and distribute prizes
        // Current version only demonstrates the flow
    }
    
    /// @notice Calculate prize amount
    /// @param prizeLevel Prize level (1-9)
    /// @return Prize amount
    function calculatePrizeAmount(uint256 prizeLevel) public view returns (uint256) {
        if (prizeLevel == 0) return 0; // No prize
        
   
        
        uint256 floatingPool = prizePool + accumulatedPrizePool;
        
        if (prizeLevel == 9) return floatingPool * 387 / 1000; // First prize: 38.7%
        if (prizeLevel == 8) return floatingPool * 239 / 1000; // Second prize: 23.9%
        if (prizeLevel == 7) return floatingPool * 148 / 1000; // Third prize: 14.8%
        if (prizeLevel == 6) return floatingPool * 91 / 1000;  // Fourth prize: 9.1%
        if (prizeLevel == 5) return floatingPool * 56 / 1000;  // Fifth prize: 5.6%
        if (prizeLevel == 4) return floatingPool * 35 / 1000;  // Sixth prize: 3.5%
        if (prizeLevel == 3) return floatingPool * 22 / 1000;  // Seventh prize: 2.2%
        if (prizeLevel == 2) return floatingPool * 13 / 1000;  // Eighth prize: 1.3%
        if (prizeLevel == 1) return floatingPool * 8 / 1000;  // Ninth prize: 0.8%
        
        return 0;
    }
    
    /// @notice Claim prize (using plaintext level, requires oracle verification)
    /// @param ticketId Ticket ID
    /// @param prizeLevel Prize level (submitted after off-chain decryption)
    function claimPrizeWithLevel(uint256 ticketId, uint256 prizeLevel) external {
        require(tickets[ticketId].exists, "Ticket does not exist");
        require(tickets[ticketId].player == msg.sender, "Not ticket owner");
        require(!hasClaimedPrize[ticketId], "Prize already claimed");
        require(hasDrawn, "Numbers not drawn yet");
        require(prizeLevel >= 1 && prizeLevel <= 9, "Invalid prize level");
        
        // TODO: In production environment, need to verify prizeLevel matches on-chain encrypted level
        // This requires integrating Zama's decryption oracle
        
        // Calculate prize
        uint256 grossPrize = calculatePrizeAmount(prizeLevel);
        require(grossPrize > 0, "No prize to claim");
        
        // Deduct 20% fee
        uint256 fee = grossPrize * 20 / 100;
        uint256 netPrize = grossPrize - fee;
        
        // Mark as claimed
        hasClaimedPrize[ticketId] = true;
        
        // Deduct from prize pool
        require(address(this).balance >= netPrize, "Insufficient prize pool");
        
        // Deduct from current prize pool (if insufficient, deduct from accumulated prize pool)
        if (prizePool >= netPrize) {
            prizePool -= netPrize;
        } else {
            uint256 remaining = netPrize - prizePool;
            prizePool = 0;
            accumulatedPrizePool -= remaining;
        }
        
        // Distribute prize
        payable(msg.sender).transfer(netPrize);
        
        emit PrizeClaimed(ticketId, msg.sender, netPrize, fee, block.timestamp);
    }

    /// @notice Get ticket match count
    /// @param ticketId Ticket ID
    /// @return Returns matched number count (encrypted)
    function getTicketMatches(uint256 ticketId) external view returns (euint8) {
        require(tickets[ticketId].exists, "Ticket does not exist");
        return ticketMatches[ticketId];
    }
    
    /// @notice Get ticket prize level
    /// @param ticketId Ticket ID
    /// @return Returns prize level (encrypted), 0=no prize, 1-9=ninth to first prize
    function getTicketPrizeLevel(uint256 ticketId) external view returns (euint8) {
        require(tickets[ticketId].exists, "Ticket does not exist");
        return ticketPrizeLevel[ticketId];
    }
    
    /// @notice Check if prize has been claimed
    /// @param ticketId Ticket ID
    function hasClaimed(uint256 ticketId) external view returns (bool) {
        return hasClaimedPrize[ticketId];
    }

    /// @notice Get ticket information
    /// @param ticketId Ticket ID
    function getTicket(uint256 ticketId) external view returns (Ticket memory) {
        require(tickets[ticketId].exists, "Ticket does not exist");
        return tickets[ticketId];
    }

    /// @notice Reset lottery system (for testing)
    function reset() external {
        hasDrawn = false;
        isBuyingOpen = true;
        currentTicketId = 0;
        lastUpkeepTime = 0;
        prizePool = 0;
        accumulatedPrizePool = 0;
        // Note: In production, should add more security checks and access controls
    }
    
    /// @notice Get contract balance
    function getBalance() external view returns (uint256) {
        return address(this).balance;
    }
    
    /// @notice Get accumulated prize pool
    function getAccumulatedPrizePool() external view returns (uint256) {
        return accumulatedPrizePool;
    }
    
    /// @notice Get total prize pool (current + accumulated)
    function getTotalPrizePool() external view returns (uint256) {
        return prizePool + accumulatedPrizePool;
    }
    
    /// @notice Allow contract to receive ETH
    receive() external payable {
        prizePool += msg.value;
    }
    
    /// @notice Manually stop buying (admin function)
    /// @dev Used in emergency situations
    function emergencyStopBuying() external {
        isBuyingOpen = false;
        emit BuyingStopped(block.timestamp);
    }
    
    /// @notice Manually reopen buying (admin function)
    /// @dev Used in emergency situations
    function emergencyReopenBuying() external {
        isBuyingOpen = true;
        emit BuyingReopened(block.timestamp);
    }
}

