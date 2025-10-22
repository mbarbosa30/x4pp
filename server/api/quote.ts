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
    const { recipientId, selfProof } = req.body;

    if (!recipientId) {
      return res.status(400).json({ error: "recipientId is required" });
    }

    // Find recipient by username or nullifier
    const [recipient] = await db
      .select()
      .from(users)
      .where(eq(users.username, recipientId))
      .limit(1);

    if (!recipient) {
      return res.status(404).json({ error: "Recipient not found" });
    }

    // Get current queue count
    const queuedMessages = await getQueuedMessageCount(recipient.selfNullifier || recipientId);

    // Check if sender is verified human (simplified - in production, validate selfProof)
    const isHuman = !!selfProof;

    // Calculate price
    const quote = calculatePriceForUser(recipient, queuedMessages, isHuman);

    res.json(quote);
  } catch (error) {
    console.error("Error generating quote:", error);
    res.status(500).json({ error: "Failed to generate quote" });
  }
});

export default router;
