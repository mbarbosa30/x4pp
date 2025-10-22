import { Request, Response, NextFunction } from "express";
import { CELO_CONFIG, PAYMENT_WALLET, X402_CONFIG, formatUSDC } from "../config/celo";
import { PaymentRequirementsResponse, PaymentProof } from "./types";
import { v4 as uuidv4 } from "uuid";

// Middleware to enforce x402 payment for protected routes
export function requirePayment(priceUSD: number, recipientWallet?: string) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const paymentHeader = req.headers["x-payment"] as string;

    if (!paymentHeader) {
      // No payment provided - return 402 with payment requirements
      const response = generatePaymentRequirements(priceUSD, recipientWallet);
      return res.status(402).json(response);
    }

    try {
      // Parse payment proof from header
      const paymentProof: PaymentProof = JSON.parse(paymentHeader);

      // Verify payment with server-determined recipient wallet
      const result = await verifyPayment(paymentProof, priceUSD, recipientWallet);

      if (!result.success) {
        return res.status(402).json({
          error: "Payment verification failed",
          ...generatePaymentRequirements(priceUSD, recipientWallet),
        });
      }

      // Payment verified - attach to request and continue
      (req as any).payment = paymentProof;
      next();
    } catch (error) {
      console.error("Payment parsing error:", error);
      return res.status(402).json({
        error: "Invalid payment format",
        ...generatePaymentRequirements(priceUSD, recipientWallet),
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
  // Convert USD to smallest units (0.01 USD = 10000 in 6 decimal token units)
  const amountInSmallestUnits = Math.floor(priceUSD * 1_000_000).toString();
  
  console.log(`[generatePaymentRequirements] priceUSD=${priceUSD}, amountInSmallestUnits=${amountInSmallestUnits}`);

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
        amount: amountInSmallestUnits,
        recipient: recipientWalletAddress,
        nonce,
        expiration,
      },
    ],
  };
}

// Verify payment proof (EIP-712 signature verification only - deferred settlement)
async function verifyPayment(
  proof: PaymentProof,
  expectedAmountUSD: number,
  expectedRecipient?: string,
  expectedTokenAddress?: string,
  expectedChainId?: number,
  expectedTokenDecimals?: number
): Promise<{ success: boolean }> {
  try {
    console.log("[Payment Verification] Starting EIP-712 signature verification (deferred settlement)...");
    console.log("[Payment Verification] Proof:", JSON.stringify(proof, null, 2));
    console.log("[Payment Verification] Expected amount USD:", expectedAmountUSD);

    // Import Celo payment service for signature verification only
    const { verifyPaymentAuthorization } = await import("../celo-payment");

    // Basic validation
    if (!proof.signature || !proof.nonce) {
      console.log("[Payment Verification] FAILED: Missing signature or nonce");
      return { success: false };
    }

    // Verify chain ID matches expected network
    const chainIdToVerify = expectedChainId || CELO_CONFIG.chainId;
    if (proof.chainId !== chainIdToVerify) {
      console.log(`[Payment Verification] FAILED: Chain ID mismatch. Got ${proof.chainId}, expected ${chainIdToVerify}`);
      return { success: false };
    }

    // Verify token address matches expected token
    const tokenAddressToVerify = expectedTokenAddress || CELO_CONFIG.usdcAddress;
    if (proof.tokenAddress.toLowerCase() !== tokenAddressToVerify.toLowerCase()) {
      console.log(`[Payment Verification] FAILED: Token address mismatch. Got ${proof.tokenAddress}, expected ${tokenAddressToVerify}`);
      return { success: false };
    }

    // Verify amount matches (with small tolerance for rounding)
    const tokenDecimals = expectedTokenDecimals || 6;
    const { parseUnits } = await import('viem');
    
    // Validate expectedAmountUSD
    if (typeof expectedAmountUSD !== 'number' || isNaN(expectedAmountUSD) || expectedAmountUSD <= 0) {
      console.log(`[Payment Verification] FAILED: Invalid expectedAmountUSD: ${expectedAmountUSD}`);
      return { success: false };
    }
    
    const expectedAmountBigInt = parseUnits(expectedAmountUSD.toFixed(tokenDecimals), tokenDecimals);
    const expectedAmount = expectedAmountBigInt.toString();
    const proofAmountBigInt = BigInt(proof.amount);
    const toleranceBigInt = BigInt("1000"); // Small tolerance for rounding
    const amountDiff = proofAmountBigInt > expectedAmountBigInt 
      ? proofAmountBigInt - expectedAmountBigInt 
      : expectedAmountBigInt - proofAmountBigInt;
    console.log(`[Payment Verification] Amount check: proof=${proof.amount}, expected=${expectedAmount}, diff=${amountDiff.toString()}, tolerance=${toleranceBigInt.toString()}`);
    if (amountDiff > toleranceBigInt) {
      console.log("[Payment Verification] FAILED: Amount mismatch");
      return { success: false };
    }

    // Verify expiration (use validBefore if expiration not present)
    const expirationTimestamp = proof.expiration || proof.validBefore;
    // Convert to seconds if in milliseconds
    const expirationSeconds = expirationTimestamp > 10000000000 
      ? Math.floor(expirationTimestamp / 1000) 
      : expirationTimestamp;
    const now = Math.floor(Date.now() / 1000);
    console.log(`[Payment Verification] Expiration check: proof=${expirationSeconds}, now=${now}, valid=${expirationSeconds >= now}`);
    if (expirationSeconds < now) {
      console.log("[Payment Verification] FAILED: Payment expired");
      return { success: false };
    }

    // CRITICAL: Verify recipient matches server-determined wallet address
    if (expectedRecipient) {
      if (proof.recipient.toLowerCase() !== expectedRecipient.toLowerCase()) {
        console.error("[Payment Verification] FAILED: Recipient address mismatch (SECURITY VIOLATION)");
        console.error(`  Expected (server): ${expectedRecipient}`);
        console.error(`  Got (client):      ${proof.recipient}`);
        return { success: false };
      }
    }

    // Parse EIP-712 signature components (v, r, s)
    // Accept either hex string or object format
    let v: number, r: `0x${string}`, s: `0x${string}`;
    if (typeof proof.signature === 'object' && proof.signature.v !== undefined) {
      // Signature is already an object with v, r, s
      v = proof.signature.v;
      r = proof.signature.r as `0x${string}`;
      s = proof.signature.s as `0x${string}`;
    } else if (typeof proof.signature === 'string') {
      // Signature format: "0x" + r (32 bytes) + s (32 bytes) + v (1 byte)
      const sig = proof.signature.startsWith('0x') ? proof.signature.slice(2) : proof.signature;
      r = `0x${sig.slice(0, 64)}` as `0x${string}`;
      s = `0x${sig.slice(64, 128)}` as `0x${string}`;
      v = parseInt(sig.slice(128, 130), 16);
    } else {
      console.log("[Payment Verification] FAILED: Invalid signature format");
      return { success: false };
    }

    const paymentAuth = {
      from: proof.sender as `0x${string}`,
      to: proof.recipient as `0x${string}`,
      value: proof.amount,
      validAfter: proof.validAfter || 0,
      validBefore: expirationSeconds,
      nonce: proof.nonce as `0x${string}`,
      signature: { v, r, s },
    };

    // Verify payment authorization on-chain using server-determined recipient
    const recipientToVerify = (expectedRecipient || proof.recipient) as `0x${string}`;
    const tokenToVerify = (expectedTokenAddress || tokenAddressToVerify) as `0x${string}`;
    const isValid = await verifyPaymentAuthorization(
      paymentAuth,
      recipientToVerify,
      BigInt(expectedAmount),
      tokenToVerify
    );

    if (!isValid) {
      console.log("[Payment Verification] FAILED: On-chain verification failed");
      return { success: false };
    }

    // DEFERRED SETTLEMENT: Do NOT execute on-chain here
    // Payment authorization is verified and will be stored for later execution
    // Settlement happens only when receiver accepts the message
    console.log("[Payment Verification] SUCCESS: Payment authorization verified (deferred settlement)");
    return { success: true };
  } catch (error) {
    console.error("Payment verification error:", error);
    return { success: false };
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
