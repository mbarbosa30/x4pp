import { db } from "./db";
import { messages, messageQueue } from "@shared/schema";
import { eq, and, gte, lte, desc } from "drizzle-orm";

/**
 * Get current queue count for a recipient within their time window
 * Uses recipient ID (not nullifier or username) to match how messages are stored
 */
export async function getQueuedMessageCount(recipientId: string): Promise<number> {
  const now = new Date();
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

  const result = await db
    .select({ count: messages.id })
    .from(messages)
    .where(
      and(
        eq(messages.recipientNullifier, recipientId),
        eq(messages.status, "pending"),
        gte(messages.sentAt, oneHourAgo)
      )
    );

  return result.length;
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
 */
export async function enqueueMessage(
  messageId: string,
  recipientId: string,
  amount: number,
  expiresAt: Date
): Promise<void> {
  const priority = calculateMessageScore(amount);

  await db.insert(messageQueue).values({
    messageId,
    recipientId,
    priority: priority.toString(),
    slotExpiry: expiresAt,
    status: "queued",
  });
}

/**
 * Get top N messages from queue for a recipient
 */
export async function getTopQueuedMessages(
  recipientNullifier: string,
  limit: number = 10
) {
  const result = await db
    .select()
    .from(messages)
    .where(
      and(
        eq(messages.recipientNullifier, recipientNullifier),
        eq(messages.status, "pending")
      )
    )
    .orderBy(desc(messages.amount))
    .limit(limit);

  return result;
}
