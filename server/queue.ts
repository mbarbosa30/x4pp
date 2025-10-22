import { db } from "./db";
import { messages, messageQueue } from "@shared/schema";
import { eq, and, gte, lte, desc, sql } from "drizzle-orm";

/**
 * Get current queue count for a recipient within their time window
 * Uses recipient ID (not nullifier or username) to match how messages are stored
 */
export async function getQueuedMessageCount(recipientId: string): Promise<number> {
  const now = new Date();
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

  const result = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(messages)
    .where(
      and(
        eq(messages.recipientNullifier, recipientId),
        eq(messages.status, "pending"),
        gte(messages.sentAt, oneHourAgo)
      )
    );

  return result[0]?.count ?? 0;
}

/**
 * Calculate message priority score
 * score = price × weights (currently just using price)
 */
export function calculateMessageScore(amount: number): number {
  return amount;
}

/**
 * Add message to queue with priority
 * Uses same recipientId as messages table for consistency
 */
export async function enqueueMessage(
  messageId: string,
  recipientIdentifier: string,
  amount: number,
  expiresAt: Date
): Promise<void> {
  const priority = calculateMessageScore(amount);

  await db.insert(messageQueue).values({
    messageId,
    recipientId: recipientIdentifier, // Use same identifier as messages.recipientNullifier
    priority: priority.toString(),
    slotExpiry: expiresAt,
    status: "queued",
  });
}

/**
 * Get top N messages from queue for a recipient
 * Uses recipientId for consistency across all queue operations
 */
export async function getTopQueuedMessages(
  recipientId: string,
  limit: number = 10
) {
  const result = await db
    .select()
    .from(messages)
    .where(
      and(
        eq(messages.recipientNullifier, recipientId),
        eq(messages.status, "pending")
      )
    )
    .orderBy(desc(messages.amount))
    .limit(limit);

  return result;
}
