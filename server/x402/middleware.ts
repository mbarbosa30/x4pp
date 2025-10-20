import { Request, Response, NextFunction } from "express";
import { CELO_CONFIG, PAYMENT_WALLET, X402_CONFIG, formatUSDC } from "../config/celo";
import { PaymentRequirementsResponse, PaymentProof } from "./types";
import { v4 as uuidv4 } from "uuid";

// Middleware to enforce x402 payment for protected routes
export function requirePayment(priceUSD: number) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const paymentHeader = req.headers["x-payment"] as string;

    if (!paymentHeader) {
      // No payment provided - return 402 with payment requirements
      const response = generatePaymentRequirements(priceUSD);
      return res.status(402).json(response);
    }

    try {
      // Parse payment proof from header
      const paymentProof: PaymentProof = JSON.parse(paymentHeader);

      // Verify payment (this would call facilitator in production)
      const isValid = await verifyPayment(paymentProof, priceUSD);

      if (!isValid) {
        return res.status(402).json({
          error: "Payment verification failed",
          ...generatePaymentRequirements(priceUSD),
        });
      }

      // Payment verified - attach to request and continue
      (req as any).payment = paymentProof;
      next();
    } catch (error) {
      console.error("Payment parsing error:", error);
      return res.status(402).json({
        error: "Invalid payment format",
        ...generatePaymentRequirements(priceUSD),
      });
    }
  };
}

// Generate x402 PaymentRequirements response
export function generatePaymentRequirements(
  priceUSD: number,
  recipientWalletAddress: string | undefined,
  expirationMinutes: number = 5
): PaymentRequirementsResponse {
  // Validate recipient address if provided
  if (recipientWalletAddress) {
    // Validate it looks like an Ethereum/Celo address
    if (!recipientWalletAddress.match(/^0x[a-fA-F0-9]{40}$/)) {
      throw new Error("Invalid Celo wallet address format");
    }
  } else {
    // Fall back to payment wallet (for generic middleware use)
    recipientWalletAddress = PAYMENT_WALLET.address || "";
    if (!recipientWalletAddress) {
      throw new Error("No recipient wallet address available");
    }
  }

  const nonce = uuidv4();
  const expiration = Math.floor(Date.now() / 1000) + expirationMinutes * 60;
  const amountUSDC = formatUSDC(priceUSD);

  return {
    x402Version: X402_CONFIG.version,
    paymentRequirements: [
      {
        scheme: "exact",
        network: {
          chainId: CELO_CONFIG.chainId,
          name: CELO_CONFIG.name,
        },
        asset: {
          address: CELO_CONFIG.usdcAddress,
          symbol: "USDC",
          decimals: CELO_CONFIG.decimals,
        },
        amount: amountUSDC,
        recipient: recipientWalletAddress,
        nonce,
        expiration,
      },
    ],
  };
}

// Verify payment proof (simplified for MVP - production would call facilitator)
async function verifyPayment(
  proof: PaymentProof,
  expectedAmountUSD: number
): Promise<boolean> {
  try {
    console.log("[Payment Verification] Starting verification...");
    console.log("[Payment Verification] Proof:", JSON.stringify(proof, null, 2));
    console.log("[Payment Verification] Expected amount USD:", expectedAmountUSD);

    // Basic validation
    if (!proof.signature || !proof.nonce) {
      console.log("[Payment Verification] FAILED: Missing signature or nonce");
      return false;
    }

    // Verify chain ID matches Celo
    if (proof.chainId !== CELO_CONFIG.chainId) {
      console.log(`[Payment Verification] FAILED: Chain ID mismatch. Got ${proof.chainId}, expected ${CELO_CONFIG.chainId}`);
      return false;
    }

    // Verify token is USDC
    if (proof.tokenAddress.toLowerCase() !== CELO_CONFIG.usdcAddress.toLowerCase()) {
      console.log(`[Payment Verification] FAILED: Token address mismatch. Got ${proof.tokenAddress}, expected ${CELO_CONFIG.usdcAddress}`);
      return false;
    }

    // Verify amount matches (with small tolerance for rounding)
    const expectedAmount = formatUSDC(expectedAmountUSD);
    const tolerance = "1000"; // 0.001 USDC tolerance
    const amountDiff = Math.abs(parseInt(proof.amount) - parseInt(expectedAmount));
    console.log(`[Payment Verification] Amount check: proof=${proof.amount}, expected=${expectedAmount}, diff=${amountDiff}, tolerance=${tolerance}`);
    if (amountDiff > parseInt(tolerance)) {
      console.log("[Payment Verification] FAILED: Amount mismatch");
      return false;
    }

    // Verify expiration
    const now = Math.floor(Date.now() / 1000);
    console.log(`[Payment Verification] Expiration check: proof=${proof.expiration}, now=${now}, valid=${proof.expiration >= now}`);
    if (proof.expiration < now) {
      console.log("[Payment Verification] FAILED: Payment expired");
      return false;
    }

    // TODO: In production, verify EIP-712 signature
    // TODO: Call facilitator to settle payment on-chain
    // For now, accept if basic checks pass
    console.log("[Payment Verification] SUCCESS: All checks passed");
    return true;
  } catch (error) {
    console.error("Payment verification error:", error);
    return false;
  }
}

// Helper to extract payment from request
export function getPaymentFromRequest(req: Request): PaymentProof | null {
  return (req as any).payment || null;
}

// Verify payment proof from header (exported for x402 routes)
export async function verifyPaymentProof(paymentHeader: string): Promise<PaymentProof> {
  try {
    const proof = JSON.parse(paymentHeader) as PaymentProof;
    
    // Basic structure validation
    if (!proof.chainId || !proof.tokenAddress || !proof.amount || !proof.sender ||  
        !proof.recipient || !proof.nonce || !proof.expiration || !proof.signature) {
      throw new Error("Invalid payment proof structure");
    }

    // Note: We can't verify against expected amount here since we don't have it
    // The routes.ts will call verifyPayment with the expected amount
    
    return proof;
  } catch (error) {
    console.error("Payment proof parsing error:", error);
    throw new Error("Invalid payment proof format");
  }
}

// Export verifyPayment for routes to validate payment against expected amount
export { verifyPayment };
