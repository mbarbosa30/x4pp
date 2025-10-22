import { Router } from "express";
import { db } from "../db";
import { users, messages, payments, reputationScores } from "@shared/schema";
import { eq, sql, and } from "drizzle-orm";

const router = Router();

// Get user profile with statistics
router.get("/:username", async (req, res) => {
  try {
    const { username } = req.params;

    // Get user data
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.username, username))
      .limit(1);

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Check if profile is public or if user is viewing their own profile
    const authenticatedUser = (req as any).session?.username;
    const isOwner = authenticatedUser === username;
    
    if (!user.isPublic && !isOwner) {
      // Profile is private - return minimal information
      return res.json({
        username: user.username,
        displayName: user.displayName,
        isPublic: false,
        message: "This profile is private",
      });
    }

    // Get message statistics
    const recipientIdentifier = user.selfNullifier || user.id;
    
    const [{ messagesReceived }] = await db
      .select({ messagesReceived: sql<number>`COUNT(*)` })
      .from(messages)
      .where(eq(messages.recipientNullifier, recipientIdentifier));

    const [{ messagesOpened }] = await db
      .select({ messagesOpened: sql<number>`COUNT(*)` })
      .from(messages)
      .where(and(
        eq(messages.recipientNullifier, recipientIdentifier),
        sql`opened_at IS NOT NULL`
      ));

    // Get total earned from settled payments
    const [{ totalEarned }] = await db
      .select({ totalEarned: sql<string>`COALESCE(SUM(CAST(amount AS DECIMAL)), 0)` })
      .from(payments)
      .where(and(
        eq(payments.recipient, user.walletAddress || ''),
        eq(payments.status, 'settled')
      ));

    // Get reputation score
    const [reputation] = await db
      .select()
      .from(reputationScores)
      .where(eq(reputationScores.nullifier, recipientIdentifier))
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
