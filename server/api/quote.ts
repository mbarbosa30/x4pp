import { Router } from "express";
import { db } from "../db";
import { users } from "@shared/schema";
import { eq } from "drizzle-orm";
import { calculatePriceForUser } from "../pricing";
import { getQueuedMessageCount } from "../queue";

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

    // Check if sender is verified human (in MVP, check if nullifier indicates verification)
    // In production, validate actual Self proof
    const isHuman = senderNullifier && senderNullifier.includes("verified");

    // Calculate price
    const quote = calculatePriceForUser(recipient, queuedMessages, isHuman);

    // Return format that frontend expects
    res.json({
      priceUSD: parseFloat(quote.priceUSD),
      priceUSDC: quote.priceUSD,
      surgeMultiplier: quote.surge.multiplier,
      humanDiscountApplied: quote.humanDiscountApplied,
      surge: quote.surge,
    });
  } catch (error) {
    console.error("Error generating quote:", error);
    res.status(500).json({ error: "Failed to generate quote" });
  }
});

export default router;
