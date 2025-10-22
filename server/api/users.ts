import { Router } from "express";
import { db } from "../db";
import { users, insertUserSchema } from "@shared/schema";
import { eq, or } from "drizzle-orm";
import { z } from "zod";
import crypto from "crypto";

const router = Router();

// Generate cryptographically unique nullifier from wallet address
function generateNullifier(walletAddress: string): string {
  return crypto.createHash('sha256')
    .update(walletAddress.toLowerCase())
    .digest('hex')
    .substring(0, 32);
}

// Registration endpoint
router.post("/", async (req, res) => {
  try {
    // Strict validation schema with all required fields
    const registrationSchema = z.object({
      username: z.string()
        .min(3, "Username must be at least 3 characters")
        .max(30, "Username must be at most 30 characters")
        .regex(/^[a-z0-9_]+$/, "Username can only contain lowercase letters, numbers, and underscores"),
      displayName: z.string()
        .min(1, "Display name is required")
        .max(100, "Display name must be at most 100 characters"),
      walletAddress: z.string()
        .regex(/^0x[a-fA-F0-9]{40}$/, "Invalid Celo/Ethereum address"),
      basePrice: z.string()
        .regex(/^\d+\.?\d*$/, "Base price must be a valid number")
        .transform(val => parseFloat(val))
        .refine(val => val >= 0.01 && val <= 100, "Base price must be between $0.01 and $100")
        .transform(val => val.toFixed(2)),
      surgeAlpha: z.string()
        .regex(/^\d+\.?\d*$/, "Surge alpha must be a valid number")
        .transform(val => parseFloat(val))
        .refine(val => val >= 0 && val <= 10, "Surge alpha must be between 0 and 10")
        .transform(val => val.toFixed(2)),
      surgeK: z.string().optional().default("3.00"),
      humanDiscountPct: z.string()
        .regex(/^\d+\.?\d*$/, "Human discount must be a valid number")
        .transform(val => parseFloat(val))
        .refine(val => val >= 0 && val <= 1, "Human discount must be between 0 and 1")
        .transform(val => val.toFixed(2)),
      slotsPerWindow: z.number()
        .int("Slots must be an integer")
        .min(1, "Must have at least 1 slot")
        .max(100, "Maximum 100 slots per window"),
      timeWindow: z.enum(["hour", "day", "week", "month"]),
      slaHours: z.number()
        .int("SLA hours must be an integer")
        .min(1, "SLA must be at least 1 hour")
        .max(720, "SLA must be at most 720 hours (30 days)"),
    });

    const validatedData = registrationSchema.parse(req.body);

    // Generate unique nullifier from wallet address
    const selfNullifier = generateNullifier(validatedData.walletAddress);

    // Check for existing username, wallet, or nullifier
    const [existing] = await db
      .select()
      .from(users)
      .where(or(
        eq(users.username, validatedData.username),
        eq(users.walletAddress, validatedData.walletAddress),
        eq(users.selfNullifier, selfNullifier)
      ))
      .limit(1);

    if (existing) {
      if (existing.username === validatedData.username) {
        return res.status(409).json({ error: "Username already taken" });
      }
      if (existing.walletAddress === validatedData.walletAddress) {
        return res.status(409).json({ 
          error: "This wallet address is already registered" 
        });
      }
      return res.status(409).json({ error: "Account already exists" });
    }

    // Create new user with all required fields explicitly set
    const [newUser] = await db
      .insert(users)
      .values({
        username: validatedData.username,
        displayName: validatedData.displayName,
        walletAddress: validatedData.walletAddress,
        selfNullifier: selfNullifier,
        basePrice: validatedData.basePrice,
        surgeAlpha: validatedData.surgeAlpha,
        surgeK: validatedData.surgeK || "3.00",
        humanDiscountPct: validatedData.humanDiscountPct,
        slotsPerWindow: validatedData.slotsPerWindow,
        timeWindow: validatedData.timeWindow,
        slaHours: validatedData.slaHours,
        verified: false,
      })
      .returning();

    res.status(201).json({
      success: true,
      user: {
        id: newUser.id,
        username: newUser.username,
        displayName: newUser.displayName,
        walletAddress: newUser.walletAddress,
        shareableLink: `/@${newUser.username}`,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        error: "Invalid input",
        details: error.errors.map(e => ({ field: e.path.join('.'), message: e.message }))
      });
    }
    
    console.error("Error creating user:", error);
    res.status(500).json({ error: "Failed to create account" });
  }
});

export default router;
