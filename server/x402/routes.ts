import { Router } from "express";
import { db } from "../db";
import { users, messages, payments, messageQueue } from "@shared/schema";
import { eq } from "drizzle-orm";
import { calculateDynamicPrice, calculateSlotExpiry, getPriorityScore } from "../services/pricing";
import { generatePaymentRequirements, getPaymentFromRequest, verifyPaymentProof, verifyPayment } from "./middleware";
import { PriceQuoteRequest, MessageCommitRequest, PriceQuoteResponse } from "./types";
import { formatUSDC, CELO_CONFIG } from "../config/celo";
import { logReputationEvent } from "../reputation";

const router = Router();

// POST /api/x402/quote - Get price quote for sending a message
router.post("/quote", async (req, res) => {
  try {
    const quoteReq: PriceQuoteRequest = req.body;

    // Find recipient by username or ID
    let recipient;
    if (quoteReq.recipientUsername) {
      [recipient] = await db
        .select()
        .from(users)
        .where(eq(users.username, quoteReq.recipientUsername))
        .limit(1);
    } else if (quoteReq.recipientId) {
      [recipient] = await db
        .select()
        .from(users)
        .where(eq(users.id, quoteReq.recipientId))
        .limit(1);
    }

    if (!recipient) {
      return res.status(404).json({ error: "Recipient not found" });
    }

    // TODO: Verify Self proof if provided to determine human status
    const isVerifiedHuman = false; // For MVP, treat all as unverified

    // Calculate dynamic price
    const pricing = await calculateDynamicPrice({
      recipientId: recipient.id,
      recipientUsername: recipient.username,
      isVerifiedHuman,
    });

    const response: PriceQuoteResponse = {
      priceUSD: pricing.priceUSD,
      priceUSDC: formatUSDC(pricing.priceUSD),
      basePrice: pricing.basePrice,
      surgeFactor: pricing.surgeFactor,
      humanDiscount: pricing.humanDiscount,
      discountReason: isVerifiedHuman ? "Self-verified human" : undefined,
      requiresProof: false, // For MVP, verification is optional
      utilizationRate: pricing.utilizationRate,
      slotsAvailable: pricing.slotsAvailable,
      expiresAt: Math.floor(Date.now() / 1000) + 300, // Quote valid for 5 minutes
    };

    res.json(response);
  } catch (error) {
    console.error("Quote generation error:", error);
    res.status(500).json({ error: "Failed to generate quote" });
  }
});

// POST /api/x402/commit - Commit a message (requires payment via x402)
router.post("/commit", async (req, res) => {
  try {
    const commitReq: MessageCommitRequest = req.body;

    // Find recipient
    let recipient;
    if (commitReq.recipientUsername) {
      [recipient] = await db
        .select()
        .from(users)
        .where(eq(users.username, commitReq.recipientUsername))
        .limit(1);
    } else if (commitReq.recipientId) {
      [recipient] = await db
        .select()
        .from(users)
        .where(eq(users.id, commitReq.recipientId))
        .limit(1);
    }

    if (!recipient) {
      return res.status(404).json({ error: "Recipient not found" });
    }

    // Verify recipient has a wallet address
    if (!recipient.walletAddress) {
      return res.status(400).json({
        error: "Recipient has not configured a payment wallet address",
      });
    }

    // Parse payment proof first to get authenticated sender wallet address
    let paymentProof;
    const paymentHeader = req.headers["x-payment"] as string;
    
    if (!paymentHeader) {
      // No payment yet - calculate price assuming not verified for quote
      const pricing = await calculateDynamicPrice({
        recipientId: recipient.id,
        isVerifiedHuman: false,
      });

      // Return 402 with payment requirements
      const paymentReqs = generatePaymentRequirements(
        pricing.priceUSD,
        recipient.walletAddress
      );
      return res.status(402).json({
        message: "Payment required",
        quote: {
          priceUSD: pricing.priceUSD,
          priceUSDC: formatUSDC(pricing.priceUSD),
        },
        ...paymentReqs,
      });
    }

    // Parse and verify payment proof structure
    try {
      paymentProof = await verifyPaymentProof(paymentHeader);
    } catch (error) {
      return res.status(400).json({
        error: "Invalid payment proof",
        details: error instanceof Error ? error.message : "Unknown error",
      });
    }
    
    // Verify payment amount and other details (needs to happen after pricing calculation)
    // This is done below after we calculate the expected price

    // Look up sender by their authenticated wallet address from payment proof
    // This prevents spoofing since wallet address is cryptographically verified
    let isVerifiedHuman = false;
    const [sender] = await db
      .select({ verified: users.verified })
      .from(users)
      .where(eq(users.walletAddress, paymentProof.sender.toLowerCase()))
      .limit(1);
    
    if (sender) {
      isVerifiedHuman = sender.verified;
    }
    
    // Calculate pricing with authenticated verification status
    const pricing = await calculateDynamicPrice({
      recipientId: recipient.id,
      isVerifiedHuman,
    });

    // In the simplified bid model, we just verify that the bid amount >= minimum base price
    // The bid amount comes from the payment proof, not from dynamic pricing
    const bidAmount = parseFloat(paymentProof.amount) / 1_000_000; // Convert from token units (6 decimals) to USD
    
    if (bidAmount < pricing.priceUSD) {
      return res.status(400).json({
        error: "Bid too low",
        minimum: pricing.priceUSD,
        received: bidAmount,
      });
    }

    // Verify payment signature and details
    const isValidPayment = await verifyPayment(paymentProof, bidAmount);
    if (!isValidPayment) {
      return res.status(400).json({
        error: "Payment verification failed",
        details: "Check server logs for details",
      });
    }

    // Calculate expiry time based on recipient's SLA
    const expiresAt = await calculateSlotExpiry(recipient.id);

    // Create message
    const [message] = await db
      .insert(messages)
      .values({
        senderNullifier: commitReq.senderNullifier,
        recipientNullifier: recipient.selfNullifier || recipient.id,
        senderName: commitReq.senderName,
        senderEmail: commitReq.senderEmail,
        content: commitReq.content,
        bidUsd: bidAmount.toString(),
        replyBounty: commitReq.replyBounty?.toString(),
        expiresAt,
      })
      .returning();

    // Verify payment recipient matches
    if (paymentProof.recipient.toLowerCase() !== recipient.walletAddress.toLowerCase()) {
      return res.status(400).json({
        error: "Payment recipient mismatch",
        expected: recipient.walletAddress,
        received: paymentProof.recipient,
      });
    }

    // Record payment
    await db.insert(payments).values({
      messageId: message.id,
      chainId: CELO_CONFIG.chainId,
      tokenAddress: CELO_CONFIG.usdcAddress,
      amount: bidAmount.toString(),
      sender: paymentProof.sender,
      recipient: recipient.walletAddress,
      nonce: paymentProof.nonce,
      signature: paymentProof.signature,
      status: "pending", // Payment will be settled when recipient accepts
    });

    // Add to message queue with priority
    const priority = await getPriorityScore(bidAmount);

    await db.insert(messageQueue).values({
      messageId: message.id,
      recipientId: recipient.id,
      priority: priority.toString(),
      slotExpiry: expiresAt,
      status: "queued",
    });

    // Log reputation event
    await logReputationEvent(commitReq.senderNullifier, "sent", message.id);

    res.status(200).json({
      success: true,
      messageId: message.id,
      status: "pending",
      expiresAt: expiresAt.toISOString(),
      payment: {
        status: "pending",
        amount: bidAmount,
      },
    });
  } catch (error) {
    console.error("Message commit error:", error);
    res.status(500).json({ error: "Failed to commit message" });
  }
});

export default router;
