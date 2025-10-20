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
  const { recipientId, isVerifiedHuman, currentTime = new Date() } = context;

  // Get recipient's pricing settings
  const [recipient] = await db
    .select()
    .from(users)
    .where(eq(users.id, recipientId))
    .limit(1);

  if (!recipient) {
    throw new Error("Recipient not found");
  }

  const basePrice = parseFloat(recipient.basePrice || "0.05");
  const slotsPerWindow = recipient.slotsPerWindow || PRICING_CONFIG.defaultSlotsPerHour;

  // Calculate current utilization rate
  const utilizationRate = await calculateUtilization(recipientId, slotsPerWindow, currentTime);

  // Calculate final price with surge and human discount
  const finalPrice = calculateMessagePrice(basePrice, utilizationRate, isVerifiedHuman);

  // Calculate surge factor for transparency
  const surgeFactor = 1 + PRICING_CONFIG.surgeAlpha * Math.pow(utilizationRate, PRICING_CONFIG.surgeK);
  const humanDiscount = isVerifiedHuman ? PRICING_CONFIG.humanDiscountPercent : 0;

  return {
    priceUSD: finalPrice,
    basePrice,
    surgeFactor,
    utilizationRate,
    humanDiscount,
    slotsAvailable: Math.max(0, slotsPerWindow - Math.floor(utilizationRate * slotsPerWindow)),
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
  const [recipient] = await db
    .select()
    .from(users)
    .where(eq(users.id, recipientId))
    .limit(1);

  if (!recipient) {
    return false;
  }

  const slotsPerWindow = recipient.slotsPerWindow || PRICING_CONFIG.defaultSlotsPerHour;
  const utilizationRate = await calculateUtilization(recipientId, slotsPerWindow, currentTime);

  // Check if there are available slots (utilization < 100%)
  return utilizationRate < 1.0;
}

export async function getPriorityScore(messageAmount: number): Promise<number> {
  // Higher payment = higher priority
  // Simple linear priority for MVP (can be made more sophisticated)
  return messageAmount * 100;
}
