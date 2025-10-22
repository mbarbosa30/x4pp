import express from "express";
import { db } from "../db";
import { users, messages, payments } from "@shared/schema";
import { eq, and, desc } from "drizzle-orm";
import { settlePayment, refundPayment } from "../celo-payment";

const router = express.Router();

/**
 * GET /api/messages/pending
 * Get pending messages for the authenticated user sorted by bid (descending)
 */
router.get("/pending", async (req, res) => {
  try {
    const userId = (req as any).session?.userId;
    if (!userId) {
      return res.status(401).json({ error: "Authentication required" });
    }

    // Get user's nullifier
    const [user] = await db
      .select({
        selfNullifier: users.selfNullifier,
      })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user || !user.selfNullifier) {
      return res.status(404).json({ error: "User not found" });
    }

    // Get pending messages sorted by bid descending
    const pendingMessages = await db
      .select()
      .from(messages)
      .where(
        and(
          eq(messages.recipientNullifier, user.selfNullifier),
          eq(messages.status, "pending")
        )
      )
      .orderBy(desc(messages.bidUsd));

    res.json(pendingMessages);
  } catch (error) {
    console.error("Error fetching pending messages:", error);
    res.status(500).json({ error: "Failed to fetch pending messages" });
  }
});

/**
 * POST /api/messages/:messageId/accept
 * Accept a pending message and settle the escrowed payment
 */
router.post("/:messageId/accept", async (req, res) => {
  try {
    const userId = (req as any).session?.userId;
    if (!userId) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const { messageId } = req.params;

    // Get user's nullifier
    const [user] = await db
      .select({
        selfNullifier: users.selfNullifier,
        walletAddress: users.walletAddress,
      })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user || !user.selfNullifier) {
      return res.status(404).json({ error: "User not found" });
    }

    // Get message
    const [message] = await db
      .select()
      .from(messages)
      .where(eq(messages.id, messageId))
      .limit(1);

    if (!message) {
      return res.status(404).json({ error: "Message not found" });
    }

    // Verify ownership
    if (message.recipientNullifier !== user.selfNullifier) {
      return res.status(403).json({ error: "Not authorized to accept this message" });
    }

    // Verify status
    if (message.status !== "pending") {
      return res.status(400).json({ 
        error: `Cannot accept message with status: ${message.status}` 
      });
    }

    // Get payment record
    const [payment] = await db
      .select()
      .from(payments)
      .where(eq(payments.messageId, messageId))
      .limit(1);

    if (!payment) {
      return res.status(404).json({ error: "Payment not found" });
    }

    // Check payment status (should be 'authorized' in deferred settlement model)
    if (payment.status !== "authorized") {
      return res.status(400).json({ 
        error: `Payment cannot be settled - status is ${payment.status}` 
      });
    }

    // Execute deferred payment settlement on-chain (transferWithAuthorization)
    const settlementTxHash = await settlePayment(payment);

    // Update message status
    await db
      .update(messages)
      .set({
        status: "accepted",
        acceptedAt: new Date(),
      })
      .where(eq(messages.id, messageId));

    // Update payment status
    await db
      .update(payments)
      .set({
        status: "settled",
        txHash: settlementTxHash,
        settledAt: new Date(),
      })
      .where(eq(payments.id, payment.id));

    res.json({
      messageId,
      status: "accepted",
      settlementTxHash,
    });
  } catch (error) {
    console.error("Error accepting message:", error);
    res.status(500).json({ error: "Failed to accept message" });
  }
});

/**
 * POST /api/messages/:messageId/decline
 * Decline a pending message and refund the escrowed payment
 */
router.post("/:messageId/decline", async (req, res) => {
  try {
    const userId = (req as any).session?.userId;
    if (!userId) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const { messageId } = req.params;
    const { reason } = req.body;

    // Get user's nullifier
    const [user] = await db
      .select({
        selfNullifier: users.selfNullifier,
      })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user || !user.selfNullifier) {
      return res.status(404).json({ error: "User not found" });
    }

    // Get message
    const [message] = await db
      .select()
      .from(messages)
      .where(eq(messages.id, messageId))
      .limit(1);

    if (!message) {
      return res.status(404).json({ error: "Message not found" });
    }

    // Verify ownership
    if (message.recipientNullifier !== user.selfNullifier) {
      return res.status(403).json({ error: "Not authorized to decline this message" });
    }

    // Verify status
    if (message.status !== "pending") {
      return res.status(400).json({ 
        error: `Cannot decline message with status: ${message.status}` 
      });
    }

    // Get payment record
    const [payment] = await db
      .select()
      .from(payments)
      .where(eq(payments.messageId, messageId))
      .limit(1);

    if (!payment) {
      return res.status(404).json({ error: "Payment not found" });
    }

    // Check payment status (should be 'authorized' in deferred settlement model)
    if (payment.status !== "authorized") {
      return res.status(400).json({ 
        error: `Payment cannot be declined - status is ${payment.status}` 
      });
    }

    // In deferred settlement model: mark authorization as unused (no on-chain tx needed)
    // Funds never left sender's wallet, so no refund transaction required

    // Update message status
    await db
      .update(messages)
      .set({
        status: "declined",
        declinedAt: new Date(),
        refundReason: reason || "declined",
      })
      .where(eq(messages.id, messageId));

    // Update payment status to unused (authorization not executed)
    await db
      .update(payments)
      .set({
        status: "unused",
      })
      .where(eq(payments.id, payment.id));

    res.json({
      messageId,
      status: "declined",
      note: "Authorization marked as unused (no on-chain transaction - funds remained in sender wallet)",
    });
  } catch (error) {
    console.error("Error declining message:", error);
    res.status(500).json({ error: "Failed to decline message" });
  }
});

export default router;
