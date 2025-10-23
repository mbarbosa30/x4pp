import { db } from "../db";
import { messages, payments } from "@shared/schema";
import { eq, and, isNull, lt } from "drizzle-orm";
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
    // Find messages past expiration that haven't been accepted or refunded
    // In the new system: messages have status 'pending', 'accepted', 'declined', 'expired'
    const expiredMessages = await db
      .select({
        message: messages,
        payment: payments,
      })
      .from(messages)
      .leftJoin(payments, eq(payments.messageId, messages.id))
      .where(
        and(
          eq(messages.status, "pending"),
          isNull(messages.refundedAt),
          lt(messages.expiresAt, now)
        )
      );

    for (const row of expiredMessages) {
      const { message, payment } = row;

      try {
        // Execute refund
        const refundSuccess = await executeRefund(message.id, payment, "Bid expired - message not accepted");

        if (refundSuccess) {
          // Mark message as expired and refunded
          await db
            .update(messages)
            .set({
              status: "expired",
              refundedAt: now,
              refundReason: "Bid expired - message not accepted",
            })
            .where(eq(messages.id, message.id));

          // Log reputation event
          await logReputationEvent(message.senderWallet, "refunded", message.id, {
            reason: "bid_expired",
          });
          await logReputationEvent(message.recipientWallet, "missed_sla", message.id);

          results.push({
            messageId: message.id,
            amount: parseFloat(message.bidUsd),
            sender: message.senderWallet,
            reason: "Bid expired",
            success: true,
          });
        }
      } catch (error) {
        console.error(`Refund failed for message ${message.id}:`, error);
        results.push({
          messageId: message.id,
          amount: parseFloat(message.bidUsd),
          sender: message.senderWallet,
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

// Mark expired authorization as unused (EIP-3009 deferred payment model)
// In this model, funds never left sender's wallet, so no on-chain refund needed
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

    // In EIP-3009 deferred settlement model:
    // - Funds never left sender's wallet (authorization not executed)
    // - Simply mark authorization as "unused" - no on-chain transaction needed
    // - This is gas-free and instant
    
    await db
      .update(payments)
      .set({
        status: "unused", // Authorization was never executed
      })
      .where(eq(payments.id, payment.id));

    console.log(`Authorization marked unused for message ${messageId}: ${payment.amount} USDC (funds never left sender wallet)`);
    return true;
  } catch (error) {
    console.error(`Error marking authorization unused for message ${messageId}:`, error);
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
          status: "expired",
          refundedAt: new Date(),
          refundReason: reason,
        })
        .where(eq(messages.id, messageId));

      await logReputationEvent(message.senderWallet, "refunded", messageId, {
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
