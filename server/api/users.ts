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
    // Strict validation schema with new open bidding model
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
      tokenId: z.string().min(1, "Payment token is required"),
      isPublic: z.boolean(),
      minBasePrice: z.number()
        .min(0.01, "Minimum bid must be at least $0.01")
        .max(100, "Minimum bid must be at most $100"),
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

    // Create new user with new schema
    const [newUser] = await db
      .insert(users)
      .values({
        username: validatedData.username,
        displayName: validatedData.displayName,
        walletAddress: validatedData.walletAddress,
        selfNullifier: selfNullifier,
        tokenId: validatedData.tokenId,
        isPublic: validatedData.isPublic,
        minBasePrice: validatedData.minBasePrice.toFixed(2),
        slaHours: validatedData.slaHours,
        verified: false,
      })
      .returning();

    // Auto-login user after successful registration
    req.session.userId = newUser.id;
    req.session.username = newUser.username;

    // Save session before responding
    await new Promise<void>((resolve, reject) => {
      req.session.save((err) => {
        if (err) reject(err);
        else resolve();
      });
    });

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
