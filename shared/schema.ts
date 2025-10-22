import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, integer, decimal, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  selfNullifier: text("self_nullifier").unique(),
  walletAddress: text("wallet_address"), // Celo wallet address for receiving payments
  displayName: text("display_name").notNull(),
  basePrice: decimal("base_price", { precision: 10, scale: 2 }).notNull().default("0.05"),
  surgeAlpha: decimal("surge_alpha", { precision: 4, scale: 2 }).notNull().default("1.5"), // Surge pricing coefficient
  surgeK: decimal("surge_k", { precision: 4, scale: 2 }).notNull().default("2.0"), // Surge pricing exponent
  humanDiscountPct: decimal("human_discount_pct", { precision: 5, scale: 2 }).notNull().default("0.90"), // 90% discount for verified humans
  slotsPerWindow: integer("slots_per_window").notNull().default(5),
  timeWindow: text("time_window").notNull().default("hour"),
  slaHours: integer("sla_hours").notNull().default(24), // Hours before auto-refund
  verified: boolean("verified").notNull().default(false),
  verifiedAt: timestamp("verified_at"),
  selfPolicies: text("self_policies"), // JSON: {age_ok, ofac_ok, country_ok}
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const messages = pgTable("messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  senderNullifier: text("sender_nullifier").notNull(),
  recipientNullifier: text("recipient_nullifier").notNull(),
  senderName: text("sender_name").notNull(),
  senderEmail: text("sender_email"),
  content: text("content").notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  replyBounty: decimal("reply_bounty", { precision: 10, scale: 2 }),
  status: text("status").notNull().default("pending"), // pending, delivered, opened, replied, refunded, expired
  sentAt: timestamp("sent_at").notNull().defaultNow(),
  expiresAt: timestamp("expires_at").notNull(), // SLA deadline for auto-refund
  openedAt: timestamp("opened_at"),
  repliedAt: timestamp("replied_at"),
  refundedAt: timestamp("refunded_at"),
  refundReason: text("refund_reason"),
});

export const reputationEvents = pgTable("reputation_events", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  nullifier: text("nullifier").notNull(),
  eventType: text("event_type").notNull(), // sent, delivered, opened, replied, refunded, blocked, vouched
  relatedMessageId: varchar("related_message_id"),
  metadata: text("metadata"), // JSON string for additional data
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const vouches = pgTable("vouches", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  voucherNullifier: text("voucher_nullifier").notNull(),
  voucheeNullifier: text("vouchee_nullifier").notNull(),
  weight: decimal("weight", { precision: 4, scale: 2 }).notNull().default("1.0"),
  messageId: varchar("message_id"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const blocks = pgTable("blocks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  blockerNullifier: text("blocker_nullifier").notNull(),
  blockedNullifier: text("blocked_nullifier").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const reputationScores = pgTable("reputation_scores", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  nullifier: text("nullifier").notNull().unique(),
  senderScore: decimal("sender_score", { precision: 5, scale: 2 }),
  recipientScore: decimal("recipient_score", { precision: 5, scale: 2 }),
  openRate: decimal("open_rate", { precision: 5, scale: 4 }),
  replyRate: decimal("reply_rate", { precision: 5, scale: 4 }),
  refundRate: decimal("refund_rate", { precision: 5, scale: 4 }),
  blockRate: decimal("block_rate", { precision: 5, scale: 4 }),
  vouchCount: integer("vouch_count").notNull().default(0),
  totalSent: integer("total_sent").notNull().default(0),
  totalReceived: integer("total_received").notNull().default(0),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const payments = pgTable("payments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  messageId: varchar("message_id").notNull(),
  chainId: integer("chain_id").notNull(),
  tokenAddress: text("token_address").notNull(),
  amount: decimal("amount", { precision: 18, scale: 6 }).notNull(),
  sender: text("sender").notNull(),
  recipient: text("recipient").notNull(),
  txHash: text("tx_hash"),
  refundTxHash: text("refund_tx_hash"),
  status: text("status").notNull().default("pending"), // pending, settled, failed, refunded
  nonce: text("nonce").notNull().unique(),
  signature: text("signature"),
  settledAt: timestamp("settled_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const messageQueue = pgTable("message_queue", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  messageId: varchar("message_id").notNull(),
  recipientId: varchar("recipient_id").notNull(),
  priority: decimal("priority", { precision: 10, scale: 4 }).notNull(),
  slotExpiry: timestamp("slot_expiry").notNull(),
  status: text("status").notNull().default("queued"), // queued, delivered, expired
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  verifiedAt: true,
});

export const insertMessageSchema = createInsertSchema(messages).omit({
  id: true,
  sentAt: true,
  openedAt: true,
  repliedAt: true,
  refundedAt: true,
});

export const insertReputationEventSchema = createInsertSchema(reputationEvents).omit({
  id: true,
  createdAt: true,
});

export const insertVouchSchema = createInsertSchema(vouches).omit({
  id: true,
  createdAt: true,
  weight: true,
});

export const insertBlockSchema = createInsertSchema(blocks).omit({
  id: true,
  createdAt: true,
});

export const insertPaymentSchema = createInsertSchema(payments).omit({
  id: true,
  createdAt: true,
  settledAt: true,
});

export const insertMessageQueueSchema = createInsertSchema(messageQueue).omit({
  id: true,
  createdAt: true,
});

// Types
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type Message = typeof messages.$inferSelect;

export type InsertReputationEvent = z.infer<typeof insertReputationEventSchema>;
export type ReputationEvent = typeof reputationEvents.$inferSelect;

export type InsertVouch = z.infer<typeof insertVouchSchema>;
export type Vouch = typeof vouches.$inferSelect;

export type InsertBlock = z.infer<typeof insertBlockSchema>;
export type Block = typeof blocks.$inferSelect;

export type ReputationScore = typeof reputationScores.$inferSelect;

export type InsertPayment = z.infer<typeof insertPaymentSchema>;
export type Payment = typeof payments.$inferSelect;

export type InsertMessageQueue = z.infer<typeof insertMessageQueueSchema>;
export type MessageQueue = typeof messageQueue.$inferSelect;
