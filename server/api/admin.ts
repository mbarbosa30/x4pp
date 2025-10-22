import { Router } from "express";
import { db } from "../db";
import { users, messages, payments, reputationScores } from "@shared/schema";
import { sql, desc, count, sum } from "drizzle-orm";

const router = Router();

// Get admin statistics
router.get("/stats", async (req, res) => {
  try {
    // Total users
    const [{ totalUsers }] = await db
      .select({ totalUsers: count() })
      .from(users);

    // Verified users
    const [{ verifiedUsers }] = await db
      .select({ verifiedUsers: count() })
      .from(users)
      .where(sql`verified = true`);

    // Total messages
    const [{ totalMessages }] = await db
      .select({ totalMessages: count() })
      .from(messages);

    // Message stats by status
    const [{ pendingMessages }] = await db
      .select({ pendingMessages: count() })
      .from(messages)
      .where(sql`opened_at IS NULL AND refunded_at IS NULL`);

    const [{ openedMessages }] = await db
      .select({ openedMessages: count() })
      .from(messages)
      .where(sql`opened_at IS NOT NULL AND replied_at IS NULL`);

    const [{ repliedMessages }] = await db
      .select({ repliedMessages: count() })
      .from(messages)
      .where(sql`replied_at IS NOT NULL`);

    const [{ refundedMessages }] = await db
      .select({ refundedMessages: count() })
      .from(messages)
      .where(sql`refunded_at IS NOT NULL`);

    // Payment stats
    const [{ settledPayments }] = await db
      .select({ settledPayments: count() })
      .from(payments)
      .where(sql`status = 'settled'`);

    const [{ refundedPayments }] = await db
      .select({ refundedPayments: count() })
      .from(payments)
      .where(sql`status = 'refunded'`);

    const [{ totalPaid }] = await db
      .select({ totalPaid: sql<string>`COALESCE(SUM(CAST(amount AS DECIMAL)), 0)` })
      .from(payments)
      .where(sql`status = 'settled'`);

    const [{ totalRefunded }] = await db
      .select({ totalRefunded: sql<string>`COALESCE(SUM(CAST(amount AS DECIMAL)), 0)` })
      .from(payments)
      .where(sql`status = 'refunded'`);

    // Calculate total revenue (settled - refunded)
    const revenue = parseFloat(totalPaid || "0") - parseFloat(totalRefunded || "0");

    res.json({
      totalUsers: Number(totalUsers),
      verifiedUsers: Number(verifiedUsers),
      totalMessages: Number(totalMessages),
      totalRevenue: revenue.toFixed(2),
      messageStats: {
        pending: Number(pendingMessages),
        opened: Number(openedMessages),
        replied: Number(repliedMessages),
        refunded: Number(refundedMessages),
      },
      paymentStats: {
        settled: Number(settledPayments),
        refunded: Number(refundedPayments),
        totalPaid: parseFloat(totalPaid || "0").toFixed(2),
        totalRefunded: parseFloat(totalRefunded || "0").toFixed(2),
      },
    });
  } catch (error) {
    console.error("Error fetching admin stats:", error);
    res.status(500).json({ error: "Failed to fetch statistics" });
  }
});

// Get all users
router.get("/users", async (req, res) => {
  try {
    const allUsers = await db
      .select()
      .from(users)
      .orderBy(desc(users.createdAt));

    res.json(allUsers);
  } catch (error) {
    console.error("Error fetching users:", error);
    res.status(500).json({ error: "Failed to fetch users" });
  }
});

// Get all messages
router.get("/messages", async (req, res) => {
  try {
    const allMessages = await db
      .select()
      .from(messages)
      .orderBy(desc(messages.sentAt));

    res.json(allMessages);
  } catch (error) {
    console.error("Error fetching messages:", error);
    res.status(500).json({ error: "Failed to fetch messages" });
  }
});

// Get all payments
router.get("/payments", async (req, res) => {
  try {
    const allPayments = await db
      .select()
      .from(payments)
      .orderBy(desc(payments.createdAt));

    res.json(allPayments);
  } catch (error) {
    console.error("Error fetching payments:", error);
    res.status(500).json({ error: "Failed to fetch payments" });
  }
});

export default router;
