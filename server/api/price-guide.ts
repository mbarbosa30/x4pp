import express from "express";
import { db } from "../db";
import { users, messages } from "@shared/schema";
import { eq, and, desc, sql } from "drizzle-orm";

const router = express.Router();

/**
 * Calculate winsorized percentiles for price guidance
 * Clips outliers to [minBasePrice, p95] before computing p25/median/p75
 */
function calculatePercentiles(bids: number[], minBasePrice: number): {
  p25: number;
  median: number;
  p75: number;
  sampleSize: number;
} {
  if (bids.length === 0) {
    return {
      p25: minBasePrice,
      median: minBasePrice,
      p75: minBasePrice,
      sampleSize: 0,
    };
  }

  // Sort bids
  const sorted = [...bids].sort((a, b) => a - b);
  
  // Calculate p95 for winsorization
  const p95Index = Math.floor(sorted.length * 0.95);
  const p95 = sorted[p95Index] || sorted[sorted.length - 1];
  
  // Winsorize: clip to [minBasePrice, p95]
  const winsorized = sorted.map(bid => 
    Math.max(minBasePrice, Math.min(bid, p95))
  );
  
  // Calculate percentiles
  const p25Index = Math.floor(winsorized.length * 0.25);
  const medianIndex = Math.floor(winsorized.length * 0.5);
  const p75Index = Math.floor(winsorized.length * 0.75);
  
  return {
    p25: winsorized[p25Index] || minBasePrice,
    median: winsorized[medianIndex] || minBasePrice,
    p75: winsorized[p75Index] || minBasePrice,
    sampleSize: bids.length,
  };
}

/**
 * GET /api/price-guide/:username
 * Returns pricing guidance for a recipient
 */
router.get("/:username", async (req, res) => {
  try {
    const { username } = req.params;
    
    // Get recipient user
    const [recipient] = await db
      .select({
        id: users.id,
        username: users.username,
        minBasePrice: users.minBasePrice,
        selfNullifier: users.selfNullifier,
      })
      .from(users)
      .where(eq(users.username, username))
      .limit(1);
    
    if (!recipient) {
      return res.status(404).json({ error: "User not found" });
    }
    
    const minBasePriceNum = parseFloat(recipient.minBasePrice || "0.05");
    
    // Get pending bids for this recipient
    const pendingBids = await db
      .select({
        bidUsd: messages.bidUsd,
      })
      .from(messages)
      .where(
        and(
          eq(messages.recipientNullifier, recipient.selfNullifier || ""),
          eq(messages.status, "pending")
        )
      );
    
    const pendingBidAmounts = pendingBids
      .map(b => parseFloat(b.bidUsd || "0"))
      .filter(b => b > 0);
    
    // If fewer than 5 pending bids, blend with recent accepted bids
    let bidsForCalculation = pendingBidAmounts;
    if (pendingBidAmounts.length < 5) {
      const recentAccepted = await db
        .select({
          bidUsd: messages.bidUsd,
        })
        .from(messages)
        .where(
          and(
            eq(messages.recipientNullifier, recipient.selfNullifier || ""),
            eq(messages.status, "accepted")
          )
        )
        .orderBy(desc(messages.acceptedAt))
        .limit(20);
      
      const acceptedBidAmounts = recentAccepted
        .map(b => parseFloat(b.bidUsd || "0"))
        .filter(b => b > 0);
      
      // Blend 50% pending with 50% accepted
      bidsForCalculation = [...pendingBidAmounts, ...acceptedBidAmounts];
    }
    
    // Calculate percentiles
    const stats = calculatePercentiles(bidsForCalculation, minBasePriceNum);
    
    res.json({
      minBaseUsd: minBasePriceNum,
      p25: stats.p25,
      median: stats.median,
      p75: stats.p75,
      sampleSize: stats.sampleSize,
    });
  } catch (error) {
    console.error("Error calculating price guide:", error);
    res.status(500).json({ error: "Failed to calculate price guide" });
  }
});

export default router;
