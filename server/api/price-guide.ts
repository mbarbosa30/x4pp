import express from "express";
import { db } from "../db";
import { users, messages } from "@shared/schema";
import { eq, and, desc, sql } from "drizzle-orm";
import { PLATFORM_DEFAULT_MIN_BID } from "@shared/constants";

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
 * GET /api/price-guide/:identifier
 * Returns pricing guidance for a recipient
 * 
 * @param identifier - Can be either:
 *   - username (e.g., "alice")
 *   - wallet address (e.g., "0x1234...5678")
 * 
 * For unregistered wallet addresses, returns platform default minimum bid
 * For registered users, returns their configured minimum bid + market data
 */
router.get("/:identifier", async (req, res) => {
  try {
    const { identifier } = req.params;
    
    // Check if identifier is a wallet address (starts with 0x and is 42 chars)
    const isWalletAddress = identifier.startsWith('0x') && identifier.length === 42;
    
    let recipientWallet: string;
    let minBasePriceNum: number;
    let username: string | null = null;
    
    if (isWalletAddress) {
      // Direct wallet address lookup
      recipientWallet = identifier.toLowerCase();
      
      // Try to find registered user with this wallet
      const [user] = await db
        .select({
          id: users.id,
          username: users.username,
          minBasePrice: users.minBasePrice,
          walletAddress: users.walletAddress,
        })
        .from(users)
        .where(eq(users.walletAddress, recipientWallet))
        .limit(1);
      
      if (user) {
        // Registered user - use their pricing
        username = user.username;
        minBasePriceNum = parseFloat(user.minBasePrice || "0.05");
      } else {
        // Unregistered wallet - use platform default
        minBasePriceNum = PLATFORM_DEFAULT_MIN_BID;
      }
    } else {
      // Username lookup
      const [user] = await db
        .select({
          id: users.id,
          username: users.username,
          minBasePrice: users.minBasePrice,
          walletAddress: users.walletAddress,
        })
        .from(users)
        .where(eq(users.username, identifier))
        .limit(1);
      
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      
      username = user.username;
      recipientWallet = user.walletAddress.toLowerCase();
      minBasePriceNum = parseFloat(user.minBasePrice || "0.05");
    }
    
    // Get pending bids for this recipient wallet
    const pendingBids = await db
      .select({
        bidUsd: messages.bidUsd,
      })
      .from(messages)
      .where(
        and(
          eq(messages.recipientWallet, recipientWallet),
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
            eq(messages.recipientWallet, recipientWallet),
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
      recipientWallet,
      username,
      isRegistered: username !== null,
    });
  } catch (error) {
    console.error("Error calculating price guide:", error);
    res.status(500).json({ error: "Failed to calculate price guide" });
  }
});

export default router;
