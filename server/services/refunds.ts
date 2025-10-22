import { db } from "../db";
import { messages, payments, messageQueue } from "@shared/schema";
import { eq, and, isNull, lt, sql } from "drizzle-orm";
import { logReputationEvent } from "../reputation";

export interface RefundResult {
  messageId: string;
  amount: number;
  sender: string;
  reason: string;
  success: boolean;
}

// Check for expired messages and issue refunds
export async function processExpiredMessages(): Promise<RefundResult[]> {
  const results: RefundResult[] = [];
  const now = new Date();

  try {
    // Find messages past SLA that haven't been opened
    const expiredMessages = await db
      .select({
        message: messages,
        queue: messageQueue,
        payment: payments,
      })
      .from(messageQueue)
      .innerJoin(messages, eq(messageQueue.messageId, messages.id))
      .leftJoin(payments, eq(payments.messageId, messages.id))
      .where(
        and(
          isNull(messages.openedAt),
          isNull(messages.refundedAt),
          lt(messageQueue.slotExpiry, now),
          eq(messageQueue.status, "delivered")
        )
      );

    for (const row of expiredMessages) {
      const { message, queue, payment } = row;

      try {
        // Execute refund
        const refundSuccess = await executeRefund(message.id, payment, "SLA expired - message not opened");

        if (refundSuccess) {
          // Mark message as refunded
          await db
            .update(messages)
            .set({
              refundedAt: now,
              refundReason: "SLA expired - message not opened",
            })
            .where(eq(messages.id, message.id));

          // Update queue status
          await db
            .update(messageQueue)
            .set({ status: "expired" })
            .where(eq(messageQueue.id, queue.id));

          // Log reputation event
          await logReputationEvent(message.senderNullifier, "refunded", message.id, {
            reason: "sla_expired",
          });
          await logReputationEvent(message.recipientNullifier, "missed_sla", message.id);

          results.push({
            messageId: message.id,
            amount: parseFloat(message.amount),
            sender: message.senderNullifier,
            reason: "SLA expired",
            success: true,
          });
        }
      } catch (error) {
        console.error(`Refund failed for message ${message.id}:`, error);
        results.push({
          messageId: message.id,
          amount: parseFloat(message.amount),
          sender: message.senderNullifier,
          reason: "Refund processing error",
          success: false,
        });
      }
    }

    return results;
  } catch (error) {
    console.error("Error processing expired messages:", error);
    throw error;
  }
}

// Execute a refund with real on-chain USDC transfer on Celo
async function executeRefund(
  messageId: string,
  payment: any,
  reason: string
): Promise<boolean> {
  try {
    if (!payment) {
      console.warn(`No payment record found for message ${messageId}`);
      return false;
    }

    // Import Celo payment service for refunds
    const { executeRefund: executeOnChainRefund } = await import("../celo-payment");

    // Execute on-chain USDC refund
    const refundAmount = parseFloat(payment.amount);
    const result = await executeOnChainRefund(payment.sender as `0x${string}`, refundAmount);

    if (!result.success) {
      console.error(`On-chain refund failed for message ${messageId}:`, result.error);
      return false;
    }

    // Update payment status with transaction hash
    await db
      .update(payments)
      .set({
        status: "refunded",
        refundTxHash: result.txHash,
      })
      .where(eq(payments.id, payment.id));

    console.log(`Refund executed for message ${messageId}: ${payment.amount} USDC to ${payment.sender}`);
    console.log(`Transaction hash: ${result.txHash}`);
    return true;
  } catch (error) {
    console.error(`Refund execution error for message ${messageId}:`, error);
    return false;
  }
}

// Manual refund (for admin or dispute resolution)
export async function issueManualRefund(
  messageId: string,
  reason: string
): Promise<boolean> {
  try {
    const [message] = await db
      .select()
      .from(messages)
      .where(eq(messages.id, messageId))
      .limit(1);

    if (!message) {
      throw new Error("Message not found");
    }

    if (message.refundedAt) {
      throw new Error("Message already refunded");
    }

    const [payment] = await db
      .select()
      .from(payments)
      .where(eq(payments.messageId, messageId))
      .limit(1);

    const success = await executeRefund(messageId, payment, reason);

    if (success) {
      await db
        .update(messages)
        .set({
          refundedAt: new Date(),
          refundReason: reason,
        })
        .where(eq(messages.id, messageId));

      await logReputationEvent(message.senderNullifier, "refunded", messageId, {
        reason: "manual",
        note: reason,
      });
    }

    return success;
  } catch (error) {
    console.error("Manual refund error:", error);
    return false;
  }
}

// Cron job to run refund checks periodically
export function startRefundMonitor(intervalMinutes: number = 5) {
  const intervalMs = intervalMinutes * 60 * 1000;

  console.log(`Starting refund monitor (checking every ${intervalMinutes} minutes)`);

  const checkRefunds = async () => {
    try {
      const results = await processExpiredMessages();
      if (results.length > 0) {
        const successCount = results.filter(r => r.success).length;
        console.log(`Processed ${results.length} expired messages, ${successCount} refunds issued`);
      }
    } catch (error) {
      console.error("Refund monitor error:", error);
    }
  };

  // Run immediately on start
  checkRefunds();

  // Then run at intervals
  setInterval(checkRefunds, intervalMs);
}
