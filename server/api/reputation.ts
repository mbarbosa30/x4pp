import { Router } from "express";
import { db } from "../db";
import { reputationScores, users } from "@shared/schema";
import { eq } from "drizzle-orm";
import { updateReputationScore } from "../reputation";

const router = Router();

/**
 * GET /api/reputation/:nullifier
 * Get reputation score and facts for a user by their nullifier
 */
router.get("/:nullifier", async (req, res) => {
  try {
    const { nullifier } = req.params;

    // Try to get existing score
    let [score] = await db
      .select()
      .from(reputationScores)
      .where(eq(reputationScores.nullifier, nullifier))
      .limit(1);

    // If not found, compute it
    if (!score) {
      await updateReputationScore(nullifier);
      [score] = await db
        .select()
        .from(reputationScores)
        .where(eq(reputationScores.nullifier, nullifier))
        .limit(1);
    }

    // Check if user is verified human
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.selfNullifier, nullifier))
      .limit(1);

    const isVerified = user?.verified || false;

    // Build facts array
    const facts: string[] = [];

    if (score) {
      const openRate = parseFloat(score.openRate || "0");
      const replyRate = parseFloat(score.replyRate || "0");
      const totalSent = score.totalSent || 0;
      const vouchCount = score.vouchCount || 0;

      if (openRate > 0) {
        const confidence = totalSent >= 10 ? " (confident)" : "";
        facts.push(`Opens ${Math.round(openRate * 100)}%${confidence}`);
      }

      if (replyRate > 0) {
        facts.push(`Replies ${Math.round(replyRate * 100)}%`);
      }

      if (vouchCount > 0) {
        facts.push(`${vouchCount} vouch${vouchCount > 1 ? "es" : ""}`);
      }

      const blockRate = parseFloat(score.blockRate || "0");
      const refundRate = parseFloat(score.refundRate || "0");

      if (blockRate === 0 && totalSent >= 5) {
        facts.push("0 blocks");
      }

      if (refundRate < 0.1 && totalSent >= 5) {
        facts.push("Low refund rate");
      }
    }

    if (isVerified) {
      facts.push("Verified human");
    }

    // Calculate overall score (0-100)
    let overallScore = 50; // Default neutral score

    if (score) {
      const openRate = parseFloat(score.openRate || "0");
      const replyRate = parseFloat(score.replyRate || "0");
      const blockRate = parseFloat(score.blockRate || "0");
      const refundRate = parseFloat(score.refundRate || "0");

      overallScore =
        openRate * 40 + // 40 points for opening messages
        replyRate * 30 + // 30 points for replying
        (1 - blockRate) * 15 + // 15 points for not being blocked
        (1 - refundRate) * 15; // 15 points for not getting refunds

      overallScore = Math.max(0, Math.min(100, Math.round(overallScore * 100)));
    }

    res.json({
      score: overallScore,
      facts,
      details: score || {
        senderScore: "50",
        recipientScore: "50",
        openRate: "0",
        replyRate: "0",
        refundRate: "0",
        blockRate: "0",
        vouchCount: 0,
        totalSent: 0,
        totalReceived: 0,
      },
    });
  } catch (error) {
    console.error("Error fetching reputation:", error);
    res.status(500).json({ error: "Failed to fetch reputation" });
  }
});

export default router;
