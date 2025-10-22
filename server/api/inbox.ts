import { Router } from "express";
import { db } from "../db";
import { messages, users } from "@shared/schema";
import { eq, and } from "drizzle-orm";
import { getTopQueuedMessages, getQueuedMessageCount } from "../queue";

const router = Router();

/**
 * GET /api/inbox/:recipientId
 * Get recipient's inbox with top-N messages sorted by priority
 */
router.get("/:recipientId", async (req, res) => {
  try {
    const { recipientId } = req.params;
    const limit = parseInt(req.query.limit as string) || 10;

    // Get recipient to access their slot configuration
    const [recipient] = await db
      .select()
      .from(users)
      .where(eq(users.username, recipientId))
      .limit(1);

    if (!recipient) {
      return res.status(404).json({ error: "Recipient not found" });
    }

    const recipientIdentifier = recipient.selfNullifier || recipient.id;

    // Get queued messages count for utilization
    const queuedCount = await getQueuedMessageCount(recipientIdentifier);

    // Get top messages
    const topMessages = await getTopQueuedMessages(recipientIdentifier, limit);

    res.json({
      messages: topMessages,
      queueStatus: {
        queued: queuedCount,
        capacity: recipient.slotsPerWindow,
        utilizationPct: Math.min(100, Math.round((queuedCount / recipient.slotsPerWindow) * 100)),
      },
      recipientSettings: {
        timeWindow: recipient.timeWindow,
      },
    });
  } catch (error) {
    console.error("Error fetching inbox:", error);
    res.status(500).json({ error: "Failed to fetch inbox" });
  }
});

export default router;
