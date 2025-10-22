import { db } from "./db";
import { messages, payments } from "@shared/schema";
import { eq, and, lt } from "drizzle-orm";
import { logReputationEvent } from "./reputation";
import { refundPayment } from "./celo-payment";

/**
 * Scan for expired pending messages (open bidding model) and issue refunds
 * Called by cron job every 5 minutes
 */
export async function processAutoRefunds(): Promise<void> {
  try {
    const now = new Date();

    // Find expired pending messages (not accepted before SLA deadline)
    const expiredMessages = await db
      .select()
      .from(messages)
      .where(
        and(
          eq(messages.status, "pending"),
          lt(messages.expiresAt, now)
        )
      );

    console.log(`[Refunds] Found ${expiredMessages.length} expired pending messages`);

    for (const message of expiredMessages) {
      await processRefund(message.id, "expired");
    }
  } catch (error) {
    console.error("[Refunds] Error processing auto-refunds:", error);
  }
}

/**
 * Process a single refund (open bidding model)
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

    if (!payment) {
      console.log(`[Refunds] No payment found for message ${messageId}`);
      return;
    }

    // Check if payment can be refunded (should be settled, not already refunded/failed)
    if (payment.status === "refunded" || payment.status === "failed") {
      console.log(`[Refunds] Payment already ${payment.status} for message ${messageId}`);
      return;
    }

    // Execute on-chain refund
    console.log(`[Refunds] Processing refund for message ${messageId}`);
    const refundTxHash = await refundPayment(payment, reason);

    // Update message status
    await db
      .update(messages)
      .set({
        status: "expired",
        refundedAt: new Date(),
        refundReason: reason,
      })
      .where(eq(messages.id, messageId));

    // Update payment status
    await db
      .update(payments)
      .set({
        status: "refunded",
        refundTxHash,
      })
      .where(eq(payments.id, payment.id));

    // Log reputation events
    await logReputationEvent(message.senderNullifier, "refunded", messageId);
    await logReputationEvent(message.recipientNullifier, "refunded", messageId);

    console.log(`[Refunds] Refund processed successfully for message ${messageId}, txHash: ${refundTxHash}`);
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
