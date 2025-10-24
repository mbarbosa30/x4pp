import express from "express";
import { db } from "../db";
import { users, messages, payments } from "@shared/schema";
import { eq, and, desc, sql } from "drizzle-orm";
import { settlePayment, refundPayment } from "../celo-payment";

const router = express.Router();

/**
 * GET /api/messages/sent
 * Get messages sent by the authenticated user
 */
router.get("/sent", async (req, res) => {
  try {
    const userId = (req as any).session?.userId;
    if (!userId) {
      return res.status(401).json({ error: "Authentication required" });
    }

    // Get user's wallet address
    const [user] = await db
      .select({
        walletAddress: users.walletAddress,
      })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user || !user.walletAddress) {
      return res.status(404).json({ error: "User not found or wallet not configured" });
    }

    console.log('[API /messages/sent] Fetching sent messages for wallet:', user.walletAddress.toLowerCase());

    // Get sent messages with recipient info
    // Note: Both senderWallet and walletAddress are stored in lowercase
    const sentMessages = await db
      .select({
        id: messages.id,
        senderWallet: messages.senderWallet,
        recipientWallet: messages.recipientWallet,
        content: messages.content,
        bidUsd: messages.bidUsd,
        replyBounty: messages.replyBounty,
        status: messages.status,
        sentAt: messages.sentAt,
        expiresAt: messages.expiresAt,
        acceptedAt: messages.acceptedAt,
        declinedAt: messages.declinedAt,
        // Recipient profile info (if registered)
        recipientDisplayName: users.displayName,
        recipientUsername: users.username,
      })
      .from(messages)
      .leftJoin(users, sql`lower(${users.walletAddress}) = lower(${messages.recipientWallet})`)
      .where(eq(messages.senderWallet, user.walletAddress.toLowerCase()))
      .orderBy(desc(messages.sentAt));

    console.log('[API /messages/sent] Found', sentMessages.length, 'sent messages');

    // Serialize timestamps to ISO strings for proper frontend handling
    const serializedMessages = sentMessages.map(msg => ({
      ...msg,
      sentAt: msg.sentAt ? msg.sentAt.toISOString() : null,
      expiresAt: msg.expiresAt ? msg.expiresAt.toISOString() : null,
      acceptedAt: msg.acceptedAt?.toISOString() || null,
      declinedAt: msg.declinedAt?.toISOString() || null,
    }));

    res.json(serializedMessages);
  } catch (error) {
    console.error("Error fetching sent messages:", error);
    res.status(500).json({ error: "Failed to fetch sent messages" });
  }
});

/**
 * GET /api/messages/accepted
 * Get accepted messages for the authenticated user (messages they've received and accepted)
 */
router.get("/accepted", async (req, res) => {
  try {
    const userId = (req as any).session?.userId;
    if (!userId) {
      return res.status(401).json({ error: "Authentication required" });
    }

    // Get user's wallet address for message routing
    const [user] = await db
      .select({
        walletAddress: users.walletAddress,
      })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user || !user.walletAddress) {
      return res.status(404).json({ error: "User not found or wallet not configured" });
    }

    // Get accepted messages with sender info
    const acceptedMessages = await db
      .select({
        id: messages.id,
        senderWallet: messages.senderWallet,
        recipientWallet: messages.recipientWallet,
        senderName: messages.senderName,
        senderEmail: messages.senderEmail,
        content: messages.content,
        bidUsd: messages.bidUsd,
        replyBounty: messages.replyBounty,
        status: messages.status,
        sentAt: messages.sentAt,
        acceptedAt: messages.acceptedAt,
        // Sender profile info (if registered)
        senderDisplayName: users.displayName,
        senderUsername: users.username,
      })
      .from(messages)
      .leftJoin(users, sql`lower(${users.walletAddress}) = ${messages.senderWallet}`)
      .where(
        and(
          eq(messages.recipientWallet, user.walletAddress.toLowerCase()),
          eq(messages.status, "accepted")
        )
      )
      .orderBy(desc(messages.acceptedAt));

    // Serialize timestamps to ISO strings for proper frontend handling
    const serializedMessages = acceptedMessages.map(msg => ({
      ...msg,
      sentAt: msg.sentAt ? msg.sentAt.toISOString() : null,
      acceptedAt: msg.acceptedAt?.toISOString() || null,
    }));

    res.json(serializedMessages);
  } catch (error) {
    console.error("Error fetching accepted messages:", error);
    res.status(500).json({ error: "Failed to fetch accepted messages" });
  }
});

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

    // Get user's wallet address for message routing
    const [user] = await db
      .select({
        walletAddress: users.walletAddress,
      })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user || !user.walletAddress) {
      return res.status(404).json({ error: "User not found or wallet not configured" });
    }

    // Get pending messages sorted by bid descending with sender info
    const pendingMessages = await db
      .select({
        id: messages.id,
        senderWallet: messages.senderWallet,
        recipientWallet: messages.recipientWallet,
        senderName: messages.senderName,
        senderEmail: messages.senderEmail,
        content: messages.content,
        bidUsd: messages.bidUsd,
        replyBounty: messages.replyBounty,
        status: messages.status,
        sentAt: messages.sentAt,
        expiresAt: messages.expiresAt,
        openedAt: messages.openedAt,
        repliedAt: messages.repliedAt,
        // Sender profile info (if registered)
        senderDisplayName: users.displayName,
        senderUsername: users.username,
      })
      .from(messages)
      .leftJoin(users, sql`lower(${users.walletAddress}) = ${messages.senderWallet}`)
      .where(
        and(
          eq(messages.recipientWallet, user.walletAddress.toLowerCase()),
          eq(messages.status, "pending")
        )
      )
      .orderBy(desc(messages.bidUsd));

    // Serialize timestamps to ISO strings for proper frontend handling
    const serializedMessages = pendingMessages.map(msg => ({
      ...msg,
      sentAt: msg.sentAt ? msg.sentAt.toISOString() : null,
      expiresAt: msg.expiresAt ? msg.expiresAt.toISOString() : null,
      openedAt: msg.openedAt?.toISOString() || null,
      repliedAt: msg.repliedAt?.toISOString() || null,
    }));

    res.json(serializedMessages);
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

    // Get user's wallet address for verification
    const [user] = await db
      .select({
        walletAddress: users.walletAddress,
      })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user || !user.walletAddress) {
      return res.status(404).json({ error: "User not found or wallet not configured" });
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

    // Verify ownership (compare wallet addresses - case insensitive)
    if (message.recipientWallet?.toLowerCase() !== user.walletAddress.toLowerCase()) {
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

    // Get user's wallet address for verification
    const [user] = await db
      .select({
        walletAddress: users.walletAddress,
      })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user || !user.walletAddress) {
      return res.status(404).json({ error: "User not found or wallet not configured" });
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

    // Verify ownership (compare wallet addresses - case insensitive)
    if (message.recipientWallet?.toLowerCase() !== user.walletAddress.toLowerCase()) {
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
