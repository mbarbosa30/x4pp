import { db } from "./db";
import { reputationEvents, vouches, blocks, messages, reputationScores } from "@shared/schema";
import { eq, and, gte, sql } from "drizzle-orm";

const HALF_LIFE_DAYS = 75;
const Z_SCORE = 1.96; // 95% confidence

// Wilson lower bound for confidence intervals
function wilsonLowerBound(successes: number, total: number): number {
  if (total === 0) return 0;
  
  const p = successes / total;
  const z = Z_SCORE;
  const z2 = z * z;
  
  const numerator = p + z2 / (2 * total) - z * Math.sqrt((p * (1 - p) + z2 / (4 * total)) / total);
  const denominator = 1 + z2 / total;
  
  return Math.max(0, numerator / denominator);
}

// Exponential decay weight for events based on age
function decayWeight(ageInDays: number): number {
  return Math.pow(0.5, ageInDays / HALF_LIFE_DAYS);
}

// Calculate weighted counts with exponential decay
function applyDecay(events: Array<{ sentAt: Date }>) {
  const now = new Date();
  let weightedCount = 0;
  
  for (const event of events) {
    const ageInDays = (now.getTime() - event.sentAt.getTime()) / (1000 * 60 * 60 * 24);
    weightedCount += decayWeight(ageInDays);
  }
  
  return weightedCount;
}

// Apply decay to blocks (use createdAt)
function applyDecayToBlocks(events: Array<{ createdAt: Date }>) {
  const now = new Date();
  let weightedCount = 0;
  
  for (const event of events) {
    const ageInDays = (now.getTime() - event.createdAt.getTime()) / (1000 * 60 * 60 * 24);
    weightedCount += decayWeight(ageInDays);
  }
  
  return weightedCount;
}

interface ReputationMetrics {
  senderScore: number;
  recipientScore: number;
  openRate: number;
  replyRate: number;
  refundRate: number;
  blockRate: number;
  vouchCount: number;
  totalSent: number;
  totalReceived: number;
}

export async function computeReputationScore(walletAddress: string): Promise<ReputationMetrics> {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - 90);

  // Normalize wallet address to lowercase
  const normalizedWallet = walletAddress.toLowerCase();

  // Get messages sent by this user
  const sentMessages = await db
    .select()
    .from(messages)
    .where(and(
      eq(messages.senderWallet, normalizedWallet),
      gte(messages.sentAt, cutoffDate)
    ));

  // Get messages received by this user
  const receivedMessages = await db
    .select()
    .from(messages)
    .where(and(
      eq(messages.recipientWallet, normalizedWallet),
      gte(messages.sentAt, cutoffDate)
    ));

  // Calculate sender metrics
  const sentOpened = sentMessages.filter(m => m.openedAt !== null);
  const sentReplied = sentMessages.filter(m => m.repliedAt !== null);
  const sentRefunded = sentMessages.filter(m => m.refundedAt !== null);

  const weightedSentTotal = applyDecay(sentMessages);
  const weightedSentOpened = applyDecay(sentOpened);
  const weightedSentReplied = applyDecay(sentReplied);
  const weightedSentRefunded = applyDecay(sentRefunded);

  const openRateLB = wilsonLowerBound(weightedSentOpened, weightedSentTotal);
  const replyRateLB = wilsonLowerBound(weightedSentReplied, weightedSentTotal);
  const refundRateSender = weightedSentTotal > 0 ? weightedSentRefunded / weightedSentTotal : 0;

  // Calculate recipient metrics
  const receivedOpened = receivedMessages.filter(m => m.openedAt !== null);
  const receivedReplied = receivedMessages.filter(m => m.repliedAt !== null && m.replyBounty);
  const receivedRefunded = receivedMessages.filter(m => m.refundedAt !== null);

  const weightedReceivedTotal = applyDecay(receivedMessages);
  const weightedReceivedOpened = applyDecay(receivedOpened);
  const weightedReceivedReplied = applyDecay(receivedReplied);
  const weightedReceivedRefunded = applyDecay(receivedRefunded);

  const recipientOpenRateLB = wilsonLowerBound(weightedReceivedOpened, weightedReceivedTotal);
  const recipientReplyRateLB = wilsonLowerBound(weightedReceivedReplied, weightedReceivedTotal);
  const refundRateRecipient = weightedReceivedTotal > 0 ? weightedReceivedRefunded / weightedReceivedTotal : 0;

  // Get blocks given (as sender)
  const blocksGiven = await db
    .select()
    .from(blocks)
    .where(and(
      eq(blocks.blockedWallet, normalizedWallet),
      gte(blocks.createdAt, cutoffDate)
    ));

  const weightedBlocks = applyDecayToBlocks(blocksGiven);
  const blockRate = weightedSentTotal > 0 ? weightedBlocks / weightedSentTotal : 0;

  // Get vouches received
  const vouchesReceived = await db
    .select()
    .from(vouches)
    .where(and(
      eq(vouches.voucheeWallet, normalizedWallet),
      gte(vouches.createdAt, cutoffDate)
    ));

  // Calculate weighted vouch score (capped at 10 points)
  let vouchScore = 0;
  for (const vouch of vouchesReceived) {
    const weight = parseFloat(vouch.weight || "1.0");
    vouchScore += weight;
  }
  vouchScore = Math.min(vouchScore, 10);

  // Contribution score (simplified - could track actual net contribution)
  const contributionScore = Math.min(sentMessages.length * 0.1, 5);

  // Calculate sender score (0-100)
  const senderScore = Math.max(0, Math.min(100,
    45 * replyRateLB +
    20 * openRateLB +
    8 * vouchScore / 10 +
    5 * contributionScore / 5 +
    -6 * refundRateSender +
    -7 * blockRate
  ));

  // Calculate recipient score (0-100)
  const recipientScore = Math.max(0, Math.min(100,
    40 * recipientOpenRateLB +
    30 * recipientReplyRateLB +
    -10 * refundRateRecipient +
    10 * (vouchesReceived.length > 0 ? 1 : 0)
  ));

  return {
    senderScore: Math.round(senderScore * 100) / 100,
    recipientScore: Math.round(recipientScore * 100) / 100,
    openRate: Math.round(openRateLB * 10000) / 10000,
    replyRate: Math.round(replyRateLB * 10000) / 10000,
    refundRate: Math.round(refundRateSender * 10000) / 10000,
    blockRate: Math.round(blockRate * 10000) / 10000,
    vouchCount: vouchesReceived.length,
    totalSent: sentMessages.length,
    totalReceived: receivedMessages.length,
  };
}

export async function updateReputationScore(walletAddress: string): Promise<void> {
  const normalizedWallet = walletAddress.toLowerCase();
  const metrics = await computeReputationScore(normalizedWallet);

  const existing = await db
    .select()
    .from(reputationScores)
    .where(eq(reputationScores.walletAddress, normalizedWallet));

  if (existing.length > 0) {
    await db
      .update(reputationScores)
      .set({
        senderScore: metrics.senderScore.toString(),
        recipientScore: metrics.recipientScore.toString(),
        openRate: metrics.openRate.toString(),
        replyRate: metrics.replyRate.toString(),
        refundRate: metrics.refundRate.toString(),
        blockRate: metrics.blockRate.toString(),
        vouchCount: metrics.vouchCount,
        totalSent: metrics.totalSent,
        totalReceived: metrics.totalReceived,
        updatedAt: new Date(),
      })
      .where(eq(reputationScores.walletAddress, normalizedWallet));
  } else {
    await db.insert(reputationScores).values({
      walletAddress: normalizedWallet,
      senderScore: metrics.senderScore.toString(),
      recipientScore: metrics.recipientScore.toString(),
      openRate: metrics.openRate.toString(),
      replyRate: metrics.replyRate.toString(),
      refundRate: metrics.refundRate.toString(),
      blockRate: metrics.blockRate.toString(),
      vouchCount: metrics.vouchCount,
      totalSent: metrics.totalSent,
      totalReceived: metrics.totalReceived,
    });
  }
}

export async function logReputationEvent(
  walletAddress: string,
  eventType: string,
  relatedMessageId?: string,
  metadata?: Record<string, any>
): Promise<void> {
  const normalizedWallet = walletAddress.toLowerCase();
  await db.insert(reputationEvents).values({
    walletAddress: normalizedWallet,
    eventType,
    relatedMessageId,
    metadata: metadata ? JSON.stringify(metadata) : null,
  });

  // Update reputation score after logging event
  await updateReputationScore(normalizedWallet);
}
