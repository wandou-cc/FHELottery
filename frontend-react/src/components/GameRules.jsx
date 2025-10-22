import React from 'react';
import { Card, CardBody } from '@heroui/react';

const Section = ({ title, children }) => (
  <Card className="card-flat mb-4">
    <CardBody className="p-5">
      <h3 className="text-xl font-extrabold text-black mb-2">{title}</h3>
      <div className="text-sm text-black/80 leading-relaxed">
        {children}
      </div>
    </CardBody>
  </Card>
);

const GameRules = () => {
  return (
    <div className="max-w-3xl mx-auto">
      <Card className="card-flat mb-5">
        <CardBody className="p-6 text-center">
          <h2 className="text-title mb-1">Game Rules</h2>
          <p className="text-subtitle">Understand how to participate and how winners are decided.</p>
        </CardBody>
      </Card>

      <Section title="Overview">
        <p>
          This is a privacy-preserving lottery powered by Fully Homomorphic Encryption (FHE). Your ticket numbers are
          encrypted before submission, and winning checks happen in the encrypted space. No one, including the contract,
          can see your actual numbers.
        </p>
      </Section>

      <Section title="Ticket Composition">
        <ul className="list-disc pl-5 space-y-1">
          <li>Pick 5 main numbers from 0–31.</li>
          <li>Pick 2 bonus numbers from 0–9.</li>
          <li>Ticket price: 0.001 ETH (testnet).</li>
        </ul>
      </Section>

      <Section title="How To Play">
        <ol className="list-decimal pl-5 space-y-1">
          <li>Connect your wallet on Sepolia testnet.</li>
          <li>Open “Buy Tickets”, choose 5 main + 2 bonus numbers.</li>
          <li>Submit. Your numbers are encrypted locally and sent to the contract.</li>
        </ol>
      </Section>

      <Section title="Drawing & Verification">
        <ul className="list-disc pl-5 space-y-1">
          <li>The winning set contains 5 main numbers (0–31) and 2 bonus numbers (0–9).</li>
          <li>Draws are conducted automatically using Chainlink Automation's AutomationCompatibleInterface.</li>
          <li>The system runs periodic checks to trigger draws at scheduled intervals.</li>
          <li>After the draw, your ticket is checked homomorphically against the winning set.</li>
          <li>Use "My Tickets → Check Prize Status" to decrypt your prize tier locally and privately.</li>
        </ul>
      </Section>

      <Section title="Automated Drawing System">
        <p className="mb-2">The lottery uses Chainlink Automation for reliable, decentralized drawing:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li><strong>AutomationCompatibleInterface</strong>: Implements Chainlink's automation standard for reliable execution.</li>
          <li><strong>Scheduled Draws</strong>: The system automatically triggers draws at predetermined intervals.</li>
          <li><strong>Decentralized Execution</strong>: No single entity controls when draws occur - it's fully automated.</li>
          <li><strong>Gas Optimization</strong>: Automation nodes handle gas costs, ensuring draws happen even during network congestion.</li>
          <li><strong>Transparency</strong>: All draw triggers and results are recorded on-chain for public verification.</li>
        </ul>
        <p className="mt-2 text-xs text-black/60">
          The automation system ensures fair and timely draws without requiring manual intervention or centralized control.
        </p>
      </Section>

      <Section title="Winning Tiers">
        <p className="mb-2">Prize tiers are determined by how many numbers match the winning set.</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Tier 1 (Jackpot): 5 main + 2 bonus correct</li>
          <li>Tier 2: 5 main + 1 bonus correct</li>
          <li>Tier 3: 5 main correct</li>
          <li>Tier 4: 4 main + 2 bonus correct</li>
          <li>Tier 5: 4 main + 1 bonus correct</li>
          <li>Tier 6: 4 main correct</li>
          <li>Tier 7: 3 main + 2 bonus correct</li>
          <li>Tier 8: 3 main + 1 bonus correct</li>
          <li>Tier 9: 3 main correct</li>
          <li>No Prize: fewer than 3 main correct</li>
        </ul>
        <p className="mt-2 text-xs text-black/60">Note: A “main” match is prioritized for tiering. Bonus matches only elevate tiers when the required main matches are met.</p>
      </Section>

      <Section title="Prize Pool & Distribution">
        <p className="mb-2">Each round aggregates ticket fees to form the prize pool. The default distribution is:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Protocol fee: 5% (maintenance, randomness, infra)</li>
          <li>Net prize pool: 95% of all ticket fees in the round</li>
        </ul>
        <p className="mt-2 mb-2">The net prize pool is split among tiers if there are winners:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Tier 1: 60% of net pool</li>
          <li>Tier 2: 15% of net pool</li>
          <li>Tier 3: 10% of net pool</li>
          <li>Tier 4: 6% of net pool</li>
          <li>Tier 5: 4% of net pool</li>
          <li>Tier 6: 3% of net pool</li>
          <li>Tier 7: 1.2% of net pool</li>
          <li>Tier 8: 0.6% of net pool</li>
          <li>Tier 9: 0.2% of net pool</li>
        </ul>
        <p className="mt-2 text-xs text-black/60">If a tier has multiple winners, the tier’s allocation is split equally among winners. If a tier has no winners, its share rolls down to the next lower tier with winners (or accumulates to the jackpot by policy in future rounds, depending on deployment settings).</p>
      </Section>

      <Section title="Claiming & Settlement">
        <ul className="list-disc pl-5 space-y-1">
          <li>After prize tiers are computed, payouts are available automatically.</li>
          <li>Winners can trigger settlement; funds are transferred to the connected wallet.</li>
          <li>All prize calculations occur under encryption; only the final payout is public.</li>
        </ul>
      </Section>

      <Section title="Notes">
        <ul className="list-disc pl-5 space-y-1">
          <li>Your plaintext numbers are stored only on your device (localStorage) for display.</li>
          <li>All on-chain operations use encrypted handles; privacy is preserved end-to-end.</li>
          <li>Please ensure sufficient test ETH for gas and ticket price.</li>
        </ul>
      </Section>
    </div>
  );
};

export default GameRules;
