import { Router } from "express";
import { db } from "../db";
import { users } from "@shared/schema";
import { eq } from "drizzle-orm";
import { calculatePriceForUser } from "../pricing";
import { getQueuedMessageCount } from "../queue";
import { generatePaymentRequirements } from "../celo-payment";

const router = Router();

/**
 * POST /api/quote
 * Calculate price quote for sending a message to a recipient
 */
router.post("/", async (req, res) => {
  try {
    const { recipientUsername, senderNullifier } = req.body;

    if (!recipientUsername) {
      return res.status(400).json({ error: "recipientUsername is required" });
    }

    // Find recipient by username
    const [recipient] = await db
      .select()
      .from(users)
      .where(eq(users.username, recipientUsername))
      .limit(1);

    if (!recipient) {
      return res.status(404).json({ error: "Recipient not found" });
    }

    // Get current queue count (use recipient.id for consistent tracking)
    const queuedMessages = await getQueuedMessageCount(recipient.selfNullifier || recipient.id);

    // Check if sender is verified human
    // MVP: Check if user exists in database with verified flag
    // Production: Validate actual Self proof
    let isHuman = false;
    if (senderNullifier) {
      const [sender] = await db
        .select()
        .from(users)
        .where(eq(users.selfNullifier, senderNullifier))
        .limit(1);
      isHuman = sender?.verified || false;
    }

    // Calculate price
    const quote = calculatePriceForUser(recipient, queuedMessages, isHuman);

    if (!recipient.walletAddress) {
      return res.status(400).json({ 
        error: "Recipient has not configured a payment wallet address" 
      });
    }

    const paymentRequirements = generatePaymentRequirements(
      recipient.walletAddress,
      parseFloat(quote.priceUSD)
    );

    // Return format that frontend expects, now with x402 payment requirements
    res.json({
      priceUSD: parseFloat(quote.priceUSD),
      priceUSDC: quote.priceUSD,
      surgeMultiplier: quote.surge.multiplier,
      humanDiscountApplied: quote.humanDiscountApplied,
      surge: quote.surge,
      payment: paymentRequirements,
    });
  } catch (error) {
    console.error("Error generating quote:", error);
    res.status(500).json({ error: "Failed to generate quote" });
  }
});

export default router;
