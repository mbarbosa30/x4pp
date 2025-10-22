import { Router } from "express";
import { db } from "../db";
import { users, messages, payments, insertMessageSchema } from "@shared/schema";
import { eq } from "drizzle-orm";
import { calculatePriceForUser } from "../pricing";
import { getQueuedMessageCount, enqueueMessage } from "../queue";
import { verifyPayment } from "../x402/middleware";
import { logReputationEvent } from "../reputation";

const router = Router();

/**
 * POST /api/commit
 * Commit a message with x402 payment flow
 * 
 * - If no X-PAYMENT header: return HTTP 402 with PaymentRequirements
 * - If X-PAYMENT header present: verify payment, create message, enqueue
 */
router.post("/", async (req, res) => {
  try {
    const { recipientUsername, content, senderNullifier, senderName, senderEmail, replyBounty } = req.body;

    if (!recipientUsername || !content || !senderName) {
      return res.status(400).json({ 
        error: "recipientUsername, content, and senderName are required" 
      });
    }

    // Find recipient
    const [recipient] = await db
      .select()
      .from(users)
      .where(eq(users.username, recipientUsername))
      .limit(1);

    if (!recipient) {
      return res.status(404).json({ error: "Recipient not found" });
    }

    if (!recipient.walletAddress) {
      return res.status(400).json({ 
        error: "Recipient has not configured a payment wallet" 
      });
    }

    // Calculate price (use recipient.id for consistent queue tracking)
    const recipientIdentifier = recipient.selfNullifier || recipient.id;
    const queuedMessages = await getQueuedMessageCount(recipientIdentifier);
    
    // Check if sender is verified human
    let isHuman = false;
    if (senderNullifier) {
      const [sender] = await db
        .select()
        .from(users)
        .where(eq(users.selfNullifier, senderNullifier))
        .limit(1);
      isHuman = sender?.verified || false;
    }
    
    const quote = calculatePriceForUser(recipient, queuedMessages, isHuman);
    const amountUSD = parseFloat(quote.priceUSD);
    
    // Check slot capacity before accepting payment
    if (queuedMessages >= recipient.slotsPerWindow) {
      return res.status(503).json({
        error: "Recipient inbox is full",
        message: `All ${recipient.slotsPerWindow} attention slots are currently occupied. Try again later.`
      });
    }

    // Check for payment header
    const paymentHeader = req.headers['x-payment'] as string;

    if (!paymentHeader) {
      // No payment yet - return HTTP 402 with PaymentRequirements
      const nonce = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      const paymentRequirements = {
        amount: amountUSD.toFixed(2),
        currency: "USDC",
        chainId: 42220, // Celo mainnet
        tokenAddress: process.env.USDC_ADDRESS || "0x765DE816845861e75A25fCA122bb6898B8B1282a",
        payee: recipient.walletAddress,
        nonce,
        facilitatorUrl: process.env.FACILITATOR_URL || "https://facilitator.x402.org",
        memo: `Message to ${recipient.displayName}`,
      };

      return res.status(402).json({
        error: "Payment required",
        paymentRequirements: [{
          amount: paymentRequirements.amount,
          network: {
            chainId: paymentRequirements.chainId,
          },
          asset: {
            address: paymentRequirements.tokenAddress,
            symbol: paymentRequirements.currency,
          },
          recipient: paymentRequirements.payee,
          nonce: paymentRequirements.nonce,
          expiration: Date.now() + 15 * 60 * 1000, // 15 minutes
        }],
        quote: {
          priceUSD: amountUSD,
          priceUSDC: amountUSD.toFixed(6),
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

    // SECURITY: Pass server-determined recipient wallet to prevent payment theft
    const paymentValid = await verifyPayment(paymentProof, amountUSD, recipient.walletAddress);

    if (!paymentValid) {
      // Return 402 with PaymentRequirements for retry (x402 protocol compliance)
      const nonce = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      return res.status(402).json({ 
        error: "Payment verification failed",
        paymentRequirements: [{
          amount: amountUSD.toFixed(2),
          network: {
            chainId: 42220,
          },
          asset: {
            address: process.env.USDC_ADDRESS || "0x765DE816845861e75A25fCA122bb6898B8B1282a",
            symbol: "USDC",
          },
          recipient: recipient.walletAddress,
          nonce,
          expiration: Date.now() + 15 * 60 * 1000,
        }],
        quote: {
          priceUSD: amountUSD,
          priceUSDC: amountUSD.toFixed(6),
        },
      });
    }

    // Payment verified - create message with consistent recipient identifier
    const finalSenderNullifier = senderNullifier || `anon_${Date.now()}`;
    const expiresAt = new Date(Date.now() + (recipient.slaHours * 60 * 60 * 1000));

    const [newMessage] = await db
      .insert(messages)
      .values({
        senderNullifier: finalSenderNullifier,
        recipientNullifier: recipientIdentifier, // Use same identifier as queue counting
        senderName,
        senderEmail: senderEmail || null,
        content,
        amount: amountUSD.toFixed(2),
        replyBounty: replyBounty ? parseFloat(replyBounty).toFixed(2) : null,
        status: "pending",
        expiresAt,
      })
      .returning();

    // Store payment record
    await db.insert(payments).values({
      messageId: newMessage.id,
      chainId: paymentProof.chainId || 42220,
      tokenAddress: paymentProof.tokenAddress || process.env.USDC_ADDRESS!,
      amount: amountUSD.toFixed(6),
      sender: paymentProof.sender || senderNullifier,
      recipient: recipient.walletAddress,
      txHash: paymentProof.txHash,
      status: "settled",
      nonce: paymentProof.nonce,
      signature: paymentProof.signature,
      settledAt: new Date(),
    });

    // Enqueue message (use same identifier as message storage)
    await enqueueMessage(newMessage.id, recipientIdentifier, amountUSD, expiresAt);

    // Log reputation event
    await logReputationEvent(finalSenderNullifier, "sent", newMessage.id);

    res.status(200).json({
      messageId: newMessage.id,
      status: "delivered",
      expiresAt: expiresAt.toISOString(),
    });

  } catch (error) {
    console.error("Error committing message:", error);
    res.status(500).json({ error: "Failed to commit message" });
  }
});

export default router;
