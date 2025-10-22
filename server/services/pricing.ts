import { db } from "../db";
import { users, messageQueue, messages } from "@shared/schema";
import { eq, and, gte, sql } from "drizzle-orm";
import { calculateMessagePrice, PRICING_CONFIG } from "../config/celo";

interface PricingContext {
  recipientId: string;
  recipientUsername?: string;
  isVerifiedHuman: boolean;
  currentTime?: Date;
}

export async function calculateDynamicPrice(context: PricingContext) {
  const { recipientId } = context;

  // Get recipient's minimum base price
  const [recipient] = await db
    .select()
    .from(users)
    .where(eq(users.id, recipientId))
    .limit(1);

  if (!recipient) {
    throw new Error("Recipient not found");
  }

  const minBasePrice = parseFloat(recipient.minBasePrice || "0.05");

  // Simple pricing: just return the minimum base price
  // The sender's bid must be >= this amount
  return {
    priceUSD: minBasePrice,
    basePrice: minBasePrice,
    surgeFactor: 1,
    utilizationRate: 0,
    humanDiscount: 0,
    slotsAvailable: 999,
  };
}

async function calculateUtilization(
  recipientId: string,
  slotsPerWindow: number,
  currentTime: Date
): Promise<number> {
  // Calculate time window (default: 1 hour)
  const windowStart = new Date(currentTime);
  windowStart.setHours(windowStart.getHours() - 1);

  // Count messages in current window (both queued and delivered)
  const [result] = await db
    .select({ count: sql<number>`count(*)` })
    .from(messageQueue)
    .where(
      and(
        eq(messageQueue.recipientId, recipientId),
        gte(messageQueue.createdAt, windowStart),
        sql`${messageQueue.status} IN ('queued', 'delivered')`
      )
    );

  const messagesInWindow = result?.count || 0;

  // Utilization = messages / slots (capped at 1.0)
  return Math.min(messagesInWindow / slotsPerWindow, 1.0);
}

export async function calculateSlotExpiry(
  recipientId: string,
  currentTime: Date = new Date()
): Promise<Date> {
  // Get recipient's SLA settings
  const [recipient] = await db
    .select()
    .from(users)
    .where(eq(users.id, recipientId))
    .limit(1);

  const slaHours = PRICING_CONFIG.defaultSlaHours; // Default 24 hours
  const expiry = new Date(currentTime);
  expiry.setHours(expiry.getHours() + slaHours);

  return expiry;
}

export async function checkSlotAvailability(
  recipientId: string,
  currentTime: Date = new Date()
): Promise<boolean> {
  // In the simplified bid model, slots are always available
  return true;
}

export async function getPriorityScore(messageAmount: number): Promise<number> {
  // Higher payment = higher priority
  // Simple linear priority for MVP (can be made more sophisticated)
  return messageAmount * 100;
}
