import type { Express } from "express";
import { createServer, type Server } from "http";
import { db } from "./db";
import { users, messages, vouches, blocks, reputationScores, payments, insertMessageSchema, insertVouchSchema, insertBlockSchema } from "@shared/schema";
import { eq, and, desc } from "drizzle-orm";
import { computeReputationScore, updateReputationScore, logReputationEvent } from "./reputation";
import x402Routes from "./x402/routes";
import selfRoutes from "./self/routes";
import quoteRoutes from "./api/quote";
import commitRoutes from "./api/commit";
import inboxRoutes from "./api/inbox";
import openRoutes from "./api/open";
import reputationRoutes from "./api/reputation";
import { startRefundMonitor } from "./refunds";

export async function registerRoutes(app: Express): Promise<Server> {
  // Mount x402 payment routes
  app.use("/api/x402", x402Routes);
  
  // Mount Self Protocol verification routes
  app.use("/api/self", selfRoutes);
  
  // Mount quote and commit routes
  app.use("/api/quote", quoteRoutes);
  app.use("/api/commit", commitRoutes);
  
  // Mount inbox and open routes
  app.use("/api/inbox", inboxRoutes);
  app.use("/api/open", openRoutes);
  
  // Mount reputation routes
  app.use("/api/reputation", reputationRoutes);
  
  // Start auto-refund monitor
  startRefundMonitor();
  // Get user by username
  app.get("/api/users/:username", async (req, res) => {
    try {
      const { username } = req.params;
      const user = await db
        .select()
        .from(users)
        .where(eq(users.username, username))
        .limit(1);

      if (user.length === 0) {
        return res.status(404).json({ error: "User not found" });
      }

      res.json(user[0]);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ error: "Failed to fetch user" });
    }
  });

  // Get reputation score
  app.get("/api/reputation/:nullifier", async (req, res) => {
    try {
      const { nullifier } = req.params;
      
      // Try to get existing score
      let score = await db
        .select()
        .from(reputationScores)
        .where(eq(reputationScores.nullifier, nullifier))
        .limit(1);

      // If not found, compute it
      if (score.length === 0) {
        await updateReputationScore(nullifier);
        score = await db
          .select()
          .from(reputationScores)
          .where(eq(reputationScores.nullifier, nullifier))
          .limit(1);
      }

      if (score.length === 0) {
        return res.json({
          senderScore: 50,
          recipientScore: 50,
          openRate: 0,
          replyRate: 0,
          refundRate: 0,
          blockRate: 0,
          vouchCount: 0,
          totalSent: 0,
          totalReceived: 0,
        });
      }

      res.json(score[0]);
    } catch (error) {
      console.error("Error fetching reputation:", error);
      res.status(500).json({ error: "Failed to fetch reputation" });
    }
  });

  // Send a message
  app.post("/api/messages", async (req, res) => {
    try {
      const validated = insertMessageSchema.parse(req.body);
      
      const [message] = await db.insert(messages).values(validated).returning();

      // Log reputation event
      await logReputationEvent(validated.senderNullifier, "sent", message.id);

      res.json(message);
    } catch (error) {
      console.error("Error sending message:", error);
      res.status(500).json({ error: "Failed to send message" });
    }
  });

  // Open a message
  app.post("/api/messages/:id/open", async (req, res) => {
    try {
      const { id } = req.params;
      
      // Check if already opened
      const [existingMessage] = await db
        .select()
        .from(messages)
        .where(eq(messages.id, id))
        .limit(1);

      if (!existingMessage) {
        return res.status(404).json({ error: "Message not found" });
      }

      if (existingMessage.openedAt) {
        return res.json({
          ...existingMessage,
          message: "Message already opened",
        });
      }

      // Mark as opened
      const [message] = await db
        .update(messages)
        .set({ openedAt: new Date() })
        .where(eq(messages.id, id))
        .returning();

      // Release payment earnings to recipient
      const [payment] = await db
        .select()
        .from(payments)
        .where(eq(payments.messageId, id))
        .limit(1);

      if (payment && payment.status === "settled") {
        // TODO: In production, execute USDC transfer to recipient
        // For MVP, just log that earnings are released
        console.log(`Payment released: ${payment.amount} USDC to recipient for message ${id}`);
        
        // Could update payment record with release info if needed
        // await db.update(payments).set({ releasedAt: new Date() }).where(eq(payments.id, payment.id));
      }

      // Log reputation events
      await logReputationEvent(message.senderNullifier, "opened", id);
      await logReputationEvent(message.recipientNullifier, "delivered", id);

      res.json({
        ...message,
        earningsReleased: payment ? parseFloat(payment.amount) : 0,
      });
    } catch (error) {
      console.error("Error opening message:", error);
      res.status(500).json({ error: "Failed to open message" });
    }
  });

  // Reply to a message
  app.post("/api/messages/:id/reply", async (req, res) => {
    try {
      const { id } = req.params;
      
      const [message] = await db
        .update(messages)
        .set({ repliedAt: new Date() })
        .where(eq(messages.id, id))
        .returning();

      if (!message) {
        return res.status(404).json({ error: "Message not found" });
      }

      // Log reputation events
      await logReputationEvent(message.senderNullifier, "replied", id);
      await logReputationEvent(message.recipientNullifier, "replied", id);

      res.json(message);
    } catch (error) {
      console.error("Error replying to message:", error);
      res.status(500).json({ error: "Failed to reply to message" });
    }
  });

  // Vouch for a sender
  app.post("/api/vouches", async (req, res) => {
    try {
      const validated = insertVouchSchema.parse(req.body);
      
      // Prevent self-vouching
      if (validated.voucherNullifier === validated.voucheeNullifier) {
        return res.status(400).json({ error: "Cannot vouch for yourself" });
      }

      // Check for existing vouch (prevent duplicates)
      const existingVouch = await db
        .select()
        .from(vouches)
        .where(and(
          eq(vouches.voucherNullifier, validated.voucherNullifier),
          eq(vouches.voucheeNullifier, validated.voucheeNullifier)
        ))
        .limit(1);

      if (existingVouch.length > 0) {
        return res.status(400).json({ error: "You have already vouched for this user" });
      }

      // Get voucher's reputation to weight the vouch
      const voucherRep = await db
        .select()
        .from(reputationScores)
        .where(eq(reputationScores.nullifier, validated.voucherNullifier))
        .limit(1);

      let weight = 1.0;
      if (voucherRep.length > 0) {
        const recipientScore = parseFloat(voucherRep[0].recipientScore || "50");
        weight = Math.max(0.2, Math.min(1.0, recipientScore / 100));
      }

      const [vouch] = await db.insert(vouches).values({
        ...validated,
        weight: weight.toString(),
      }).returning();

      // Update vouchee's reputation
      await updateReputationScore(validated.voucheeNullifier);

      res.json(vouch);
    } catch (error) {
      console.error("Error creating vouch:", error);
      res.status(500).json({ error: "Failed to create vouch" });
    }
  });

  // Block a sender
  app.post("/api/blocks", async (req, res) => {
    try {
      const validated = insertBlockSchema.parse(req.body);
      
      const [block] = await db.insert(blocks).values(validated).returning();

      // Log reputation event
      await logReputationEvent(validated.blockedNullifier, "blocked");

      res.json(block);
    } catch (error) {
      console.error("Error creating block:", error);
      res.status(500).json({ error: "Failed to create block" });
    }
  });

  // Get messages for a recipient
  app.get("/api/messages/inbox/:recipientNullifier", async (req, res) => {
    try {
      const { recipientNullifier } = req.params;
      
      const inbox = await db
        .select()
        .from(messages)
        .where(eq(messages.recipientNullifier, recipientNullifier))
        .orderBy(desc(messages.sentAt));

      res.json(inbox);
    } catch (error) {
      console.error("Error fetching inbox:", error);
      res.status(500).json({ error: "Failed to fetch inbox" });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
