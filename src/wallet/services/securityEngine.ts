import { ethers } from "ethers";
import { riskAPI } from "./riskAPI";

export interface RiskAssessment {
  score: number; // 0 (Safe) to 100 (Critical)
  reasons: string[];
  isHighRisk: boolean;
  actionExplanation: string;
}

const ERC20_ABI = [
  "function approve(address spender, uint256 amount)",
  "function transfer(address to, uint256 amount)",
  "function setApprovalForAll(address operator, boolean approved)",
];

const iface = new ethers.Interface(ERC20_ABI);

export const securityEngine = {
  async analyzeTransaction(
    to: string,
    value: string,
    data: string = "0x",
    interactionDomain?: string,
  ): Promise<RiskAssessment> {
    let score = 0;
    const reasons: string[] = [];
    let actionExplanation = `Sending ${ethers.formatEther(value || "0")} Native Token to ${to.substring(0, 8)}...`;

    // 1. Check Blacklist
    const isMaliciousContract = await riskAPI.checkContract(to);
    if (isMaliciousContract) {
      score += 90;
      reasons.push("Target address is flagged in scam database!");
    }

    if (interactionDomain) {
      const isMaliciousDomain = await riskAPI.checkDomain(interactionDomain);
      if (isMaliciousDomain) {
        score += 80;
        reasons.push("Interaction originates from a known malicious domain.");
      }
    }

    // 2. Decode Data (if present)
    if (data && data !== "0x") {
      try {
        const parsed = iface.parseTransaction({ data });
        if (parsed) {
          if (parsed.name === "approve") {
            const amount = parsed.args[1];
            // Check for MaxUint256 (unlimited approval)
            if (amount === ethers.MaxUint256) {
              score += 60;
              reasons.push(
                "Unlimited token approval requested. They can drain all your tokens of this type.",
              );
              actionExplanation = `Granting unlimited access to your tokens to ${parsed.args[0]}`;
            } else {
              score += 20;
              reasons.push(
                "Token approval requested. Ensure you trust the spender.",
              );
              actionExplanation = `Approving ${parsed.args[0]} to spend some of your tokens.`;
            }
          } else if (parsed.name === "setApprovalForAll") {
            const isApproved = parsed.args[1];
            if (isApproved) {
              score += 70;
              reasons.push(
                "Granting FULL control over ALL your NFTs of this collection.",
              );
              actionExplanation = `Giving ${parsed.args[0]} permission to transfer all your NFTs.`;
            }
          } else if (parsed.name === "transfer") {
            actionExplanation = `Transferring tokens to ${parsed.args[0]}.`;
          }
        }
      } catch (e) {
        // Unrecognized function selector
        score += 30;
        reasons.push(
          "Unrecognized smart contract interaction. Proceed with caution.",
        );
        actionExplanation =
          "Interacting with a smart contract using an unknown function.";
      }
    }

    // Simulate AI heuristic: combining risk factors
    if (score === 0 && data === "0x" && value !== "0" && value !== "") {
      reasons.push(
        "Standard native token transfer. Always verify the recipient address.",
      );
      score = 5;
    }

    // Cap score at 100
    score = Math.min(score, 100);

    return {
      score,
      reasons,
      isHighRisk: score >= 60,
      actionExplanation,
    };
  },
};
