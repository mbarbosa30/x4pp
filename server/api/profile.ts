import { Router } from "express";
import { db } from "../db";
import { users, messages, payments, reputationScores } from "@shared/schema";
import { eq, sql, and } from "drizzle-orm";
import { PLATFORM_DEFAULT_MIN_BID } from "@shared/constants";

const router = Router();

// Get user profile with statistics
// Accepts either username or wallet address
router.get("/:identifier", async (req, res) => {
  try {
    const { identifier } = req.params;

    // Determine if identifier is a wallet address (starts with 0x and is 42 chars)
    const isWalletAddress = identifier.startsWith('0x') && identifier.length === 42;
    
    // Get user data by username or wallet address
    const [user] = await db
      .select()
      .from(users)
      .where(isWalletAddress 
        ? eq(users.walletAddress, identifier.toLowerCase())
        : eq(users.username, identifier)
      )
      .limit(1);

    // If wallet address is provided but no user found, return minimal data
    if (!user && isWalletAddress) {
      return res.json({
        walletAddress: identifier.toLowerCase(),
        isRegistered: false,
        minBasePrice: PLATFORM_DEFAULT_MIN_BID.toFixed(2),
        message: "This wallet hasn't registered yet. Messages sent will be visible when they register."
      });
    }

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Check if profile is public or if user is viewing their own profile
    const authenticatedUser = (req as any).session?.username;
    const isOwner = authenticatedUser === user.username;
    
    if (!user.isPublic && !isOwner) {
      // Profile is private - return minimal information
      return res.json({
        username: user.username,
        displayName: user.displayName,
        isPublic: false,
        message: "This profile is private",
      });
    }

    // Get message statistics (wallet-based routing - wallet is now required)
    const [{ messagesReceived }] = await db
      .select({ messagesReceived: sql<number>`COUNT(*)` })
      .from(messages)
      .where(eq(messages.recipientWallet, user.walletAddress.toLowerCase()));

    const [{ messagesOpened }] = await db
      .select({ messagesOpened: sql<number>`COUNT(*)` })
      .from(messages)
      .where(and(
        eq(messages.recipientWallet, user.walletAddress.toLowerCase()),
        sql`opened_at IS NOT NULL`
      ));

    // Get total earned from settled payments
    const [{ totalEarned }] = await db
      .select({ totalEarned: sql<string>`COALESCE(SUM(CAST(amount AS DECIMAL)), 0)` })
      .from(payments)
      .where(and(
        eq(payments.recipient, user.walletAddress ? user.walletAddress.toLowerCase() : ''),
        eq(payments.status, 'settled')
      ));

    // Get reputation score (wallet-based)
    const [reputation] = await db
      .select()
      .from(reputationScores)
      .where(eq(reputationScores.walletAddress, user.walletAddress.toLowerCase()))
      .limit(1);

    res.json({
      id: user.id,
      username: user.username,
      displayName: user.displayName,
      verified: user.verified,
      isPublic: user.isPublic,
      walletAddress: user.walletAddress,
      minBasePrice: user.minBasePrice,
      slaHours: user.slaHours,
      stats: {
        messagesReceived: Number(messagesReceived),
        messagesOpened: Number(messagesOpened),
        totalEarned: parseFloat(totalEarned || "0").toFixed(2),
      },
      reputation: reputation ? {
        openRate: parseFloat(reputation.openRate || "0"),
        replyRate: parseFloat(reputation.replyRate || "0"),
        vouchCount: Number(reputation.vouchCount),
        recipientScore: parseFloat(reputation.recipientScore || "50"),
      } : null,
    });
  } catch (error) {
    console.error("Error fetching profile:", error);
    res.status(500).json({ error: "Failed to fetch profile" });
  }
});

export default router;
