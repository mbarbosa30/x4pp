import { Router } from "express";
import { db } from "../db";
import { messages, payments, messageQueue } from "@shared/schema";
import { eq } from "drizzle-orm";
import { logReputationEvent } from "../reputation";

const router = Router();

/**
 * POST /api/open/:messageId
 * Mark message as opened and release earnings to recipient
 */
router.post("/:messageId", async (req, res) => {
  try {
    const { messageId } = req.params;

    // Find the message
    const [existingMessage] = await db
      .select()
      .from(messages)
      .where(eq(messages.id, messageId))
      .limit(1);

    if (!existingMessage) {
      return res.status(404).json({ error: "Message not found" });
    }

    if (existingMessage.openedAt) {
      return res.json({
        ...existingMessage,
        message: "Message already opened",
        earningsReleased: parseFloat(existingMessage.amount),
      });
    }

    // Check if message has expired
    if (new Date() > new Date(existingMessage.expiresAt)) {
      return res.status(410).json({
        error: "Message has expired",
        message: "This message has passed its SLA deadline and will be auto-refunded",
      });
    }

    // Mark as opened and update queue status
    const [openedMessage] = await db
      .update(messages)
      .set({
        openedAt: new Date(),
        status: "opened",
      })
      .where(eq(messages.id, messageId))
      .returning();

    // Update queue status
    await db
      .update(messageQueue)
      .set({ status: "delivered" })
      .where(eq(messageQueue.messageId, messageId));

    // Find associated payment
    const [payment] = await db
      .select()
      .from(payments)
      .where(eq(payments.messageId, messageId))
      .limit(1);

    if (payment && payment.status === "settled") {
      // TODO: In production, execute USDC transfer to recipient wallet
      // For MVP, just log that earnings are released
      console.log(`[Open] Earnings released: ${payment.amount} USDC to recipient for message ${messageId}`);
    }

    // Log reputation events
    await logReputationEvent(openedMessage.senderNullifier, "opened", messageId);
    await logReputationEvent(openedMessage.recipientNullifier, "delivered", messageId);

    res.json({
      ...openedMessage,
      earningsReleased: payment ? parseFloat(payment.amount) : 0,
      message: "Message opened successfully",
    });
  } catch (error) {
    console.error("Error opening message:", error);
    res.status(500).json({ error: "Failed to open message" });
  }
});

export default router;
