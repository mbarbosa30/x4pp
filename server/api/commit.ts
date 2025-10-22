import { Router } from "express";
import { db } from "../db";
import { users, messages, payments, tokens } from "@shared/schema";
import { eq } from "drizzle-orm";
import { verifyPayment } from "../x402/middleware";
import { logReputationEvent } from "../reputation";

const router = Router();

/**
 * POST /api/commit
 * Commit a message with x402 payment flow (open bidding model)
 * 
 * - Sender provides bidUsd parameter (their bid amount)
 * - If no X-PAYMENT header: return HTTP 402 with PaymentRequirements
 * - If X-PAYMENT header present: verify payment, create PENDING message (not settled)
 * - Payment is escrowed until receiver accepts/declines
 */
router.post("/", async (req, res) => {
  try {
    const { recipientUsername, content, senderNullifier, senderName, senderEmail, replyBounty, bidUsd } = req.body;

    if (!recipientUsername || !content || !senderName || !bidUsd) {
      return res.status(400).json({ 
        error: "recipientUsername, content, senderName, and bidUsd are required" 
      });
    }
    
    const bidAmount = parseFloat(bidUsd);
    if (isNaN(bidAmount) || bidAmount <= 0) {
      return res.status(400).json({ 
        error: "bidUsd must be a positive number" 
      });
    }

    // Find recipient with their selected payment token
    const result = await db
      .select({
        user: users,
        token: tokens,
      })
      .from(users)
      .leftJoin(tokens, eq(users.tokenId, tokens.id))
      .where(eq(users.username, recipientUsername))
      .limit(1);

    if (result.length === 0) {
      return res.status(404).json({ error: "Recipient not found" });
    }

    const { user: recipient, token: paymentToken } = result[0];

    if (!recipient.walletAddress) {
      return res.status(400).json({ 
        error: "Recipient has not configured a payment wallet" 
      });
    }

    if (!paymentToken || !paymentToken.isActive) {
      return res.status(400).json({ 
        error: "Recipient's selected payment token is not available" 
      });
    }
    
    // Check that bid meets minimum base price
    const minBasePrice = parseFloat(recipient.minBasePrice || "0.05");
    if (bidAmount < minBasePrice) {
      return res.status(400).json({
        error: "Bid too low",
        message: `Bid must be at least $${minBasePrice.toFixed(2)} (recipient's minimum)`,
        minBasePrice,
      });
    }

    const recipientIdentifier = recipient.selfNullifier || recipient.id;

    // Check for payment header
    const paymentHeader = req.headers['x-payment'] as string;

    if (!paymentHeader) {
      // No payment yet - return HTTP 402 with PaymentRequirements
      // Generate bytes32 nonce for EIP-3009 compatibility
      const { createHash } = await import('crypto');
      const nonceString = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const nonce = `0x${createHash('sha256').update(nonceString).digest('hex')}`;
      
      // Convert USD to smallest token units (e.g., 0.01 USD = 10000 for 6-decimal token)
      const amountInSmallestUnits = Math.floor(bidAmount * Math.pow(10, paymentToken.decimals));
      
      return res.status(402).json({
        error: "Payment required",
        paymentRequirements: [{
          amount: amountInSmallestUnits.toString(),
          network: {
            chainId: paymentToken.chainId,
          },
          asset: {
            address: paymentToken.address,
            symbol: paymentToken.symbol,
          },
          recipient: recipient.walletAddress,
          nonce,
          expiration: Math.floor(Date.now() / 1000) + 15 * 60, // 15 minutes in seconds
        }],
        quote: {
          bidUsd: bidAmount,
          price: amountInSmallestUnits.toString(),
          tokenSymbol: paymentToken.symbol,
        },
      });
    }

    // Payment header present - verify it
    let paymentProof;
    try {
      paymentProof = JSON.parse(paymentHeader);
    } catch {
      return res.status(400).json({ error: "Invalid X-PAYMENT header format" });
    }

    // SECURITY: Pass server-determined recipient wallet and token details to prevent payment theft
    const paymentResult = await verifyPayment(
      paymentProof, 
      bidAmount, 
      recipient.walletAddress,
      paymentToken.address,
      paymentToken.chainId,
      paymentToken.decimals
    );

    if (!paymentResult.success) {
      // Return 402 with PaymentRequirements for retry (x402 protocol compliance)
      // Generate bytes32 nonce for EIP-3009 compatibility
      const { createHash } = await import('crypto');
      const nonceString = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const nonce = `0x${createHash('sha256').update(nonceString).digest('hex')}`;
      
      // Convert USD to smallest token units
      const amountInSmallestUnits = Math.floor(bidAmount * Math.pow(10, paymentToken.decimals));
      
      return res.status(402).json({ 
        error: "Payment verification failed",
        paymentRequirements: [{
          amount: amountInSmallestUnits.toString(),
          network: {
            chainId: paymentToken.chainId,
          },
          asset: {
            address: paymentToken.address,
            symbol: paymentToken.symbol,
          },
          recipient: recipient.walletAddress,
          nonce,
          expiration: Math.floor(Date.now() / 1000) + 15 * 60, // 15 minutes in seconds
        }],
        quote: {
          bidUsd: bidAmount,
          price: amountInSmallestUnits.toString(),
          tokenSymbol: paymentToken.symbol,
        },
      });
    }

    // Payment verified - create PENDING message (not auto-accepted in open bidding model)
    const finalSenderNullifier = senderNullifier || `anon_${Date.now()}`;
    const expiresAt = new Date(Date.now() + (recipient.slaHours * 60 * 60 * 1000));

    const [newMessage] = await db
      .insert(messages)
      .values({
        senderNullifier: finalSenderNullifier,
        recipientNullifier: recipientIdentifier,
        senderName,
        senderEmail: senderEmail || null,
        content,
        bidUsd: bidAmount.toFixed(2),
        replyBounty: replyBounty ? parseFloat(replyBounty).toFixed(2) : null,
        status: "pending", // Stays pending until receiver accepts/declines
        expiresAt,
      })
      .returning();

    // Store payment record as SETTLED (payment already executed on-chain)
    // Store complete signature object with validAfter/validBefore for later refunds if needed
    const signatureWithParams = JSON.stringify({
      ...paymentProof.signature,
      validAfter: paymentProof.validAfter || 0,
      validBefore: paymentProof.validBefore || Math.floor(Date.now() / 1000) + 3600,
    });
    
    await db.insert(payments).values({
      messageId: newMessage.id,
      chainId: paymentProof.chainId || paymentToken.chainId,
      tokenAddress: paymentProof.tokenAddress || paymentToken.address,
      amount: bidAmount.toFixed(paymentToken.decimals),
      sender: paymentProof.sender || senderNullifier,
      recipient: recipient.walletAddress,
      txHash: paymentResult.txHash,
      status: "settled", // Payment already settled on-chain
      nonce: paymentProof.nonce,
      signature: signatureWithParams,
      settledAt: new Date(),
    });

    // Log reputation event
    await logReputationEvent(finalSenderNullifier, "sent", newMessage.id);

    res.status(200).json({
      messageId: newMessage.id,
      status: "pending",
      bidUsd: bidAmount,
      expiresAt: expiresAt.toISOString(),
    });

  } catch (error) {
    console.error("Error committing message:", error);
    res.status(500).json({ error: "Failed to commit message" });
  }
});

export default router;
