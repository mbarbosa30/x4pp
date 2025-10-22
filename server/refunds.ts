import { db } from "./db";
import { messages, payments, messageQueue } from "@shared/schema";
import { eq, and, lt, isNull } from "drizzle-orm";
import { logReputationEvent } from "./reputation";

const INFRA_FEE_PCT = parseFloat(process.env.INFRA_FEE_PCT || "0.02");

/**
 * Scan for expired unopened messages and issue refunds
 * Called by cron job every 5 minutes
 */
export async function processAutoRefunds(): Promise<void> {
  try {
    const now = new Date();

    // Find expired unopened messages
    const expiredMessages = await db
      .select()
      .from(messages)
      .where(
        and(
          eq(messages.status, "pending"),
          isNull(messages.openedAt),
          lt(messages.expiresAt, now)
        )
      );

    console.log(`[Refunds] Found ${expiredMessages.length} expired unopened messages`);

    for (const message of expiredMessages) {
      await processRefund(message.id, "SLA expired - message not opened");
    }
  } catch (error) {
    console.error("[Refunds] Error processing auto-refunds:", error);
  }
}

/**
 * Process a single refund
 */
async function processRefund(messageId: string, reason: string): Promise<void> {
  try {
    // Get the message
    const [message] = await db
      .select()
      .from(messages)
      .where(eq(messages.id, messageId))
      .limit(1);

    if (!message) {
      console.error(`[Refunds] Message ${messageId} not found`);
      return;
    }

    // Get the payment
    const [payment] = await db
      .select()
      .from(payments)
      .where(eq(payments.messageId, messageId))
      .limit(1);

    if (!payment || payment.status !== "settled") {
      console.log(`[Refunds] No settled payment found for message ${messageId}`);
      return;
    }

    // Calculate refund amount (minus infrastructure fee)
    const originalAmount = parseFloat(payment.amount);
    const refundAmount = originalAmount * (1 - INFRA_FEE_PCT);

    // TODO: In production, execute USDC transfer back to sender
    // For MVP, just log the refund
    console.log(
      `[Refunds] Processing refund for message ${messageId}: ${refundAmount.toFixed(6)} USDC to ${payment.sender}`
    );
    console.log(`[Refunds] Reason: ${reason}`);
    console.log(`[Refunds] Infrastructure fee: ${(originalAmount * INFRA_FEE_PCT).toFixed(6)} USDC`);

    // Update message status
    await db
      .update(messages)
      .set({
        status: "refunded",
        refundedAt: new Date(),
        refundReason: reason,
      })
      .where(eq(messages.id, messageId));

    // Update payment status
    await db
      .update(payments)
      .set({
        status: "refunded",
      })
      .where(eq(payments.id, payment.id));

    // Update queue status
    await db
      .update(messageQueue)
      .set({ status: "expired" })
      .where(eq(messageQueue.messageId, messageId));

    // Log reputation events
    await logReputationEvent(message.senderNullifier, "refunded", messageId);
    await logReputationEvent(message.recipientNullifier, "refunded", messageId);

    console.log(`[Refunds] Refund processed successfully for message ${messageId}`);
  } catch (error) {
    console.error(`[Refunds] Error processing refund for message ${messageId}:`, error);
  }
}

/**
 * Start refund monitor - runs every 5 minutes
 */
export function startRefundMonitor(): void {
  const INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

  console.log("Starting refund monitor (checking every 5 minutes)");

  // Run immediately on startup
  processAutoRefunds();

  // Then run every 5 minutes
  setInterval(() => {
    processAutoRefunds();
  }, INTERVAL_MS);
}
