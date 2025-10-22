import { Router } from "express";
import { db } from "../db";
import { tokens, insertTokenSchema } from "@shared/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";

const router = Router();

router.get("/", async (req, res) => {
  try {
    const activeTokens = await db
      .select()
      .from(tokens)
      .where(eq(tokens.isActive, true))
      .orderBy(tokens.symbol);

    res.json(activeTokens);
  } catch (error) {
    console.error("Error fetching tokens:", error);
    res.status(500).json({ error: "Failed to fetch tokens" });
  }
});

router.post("/admin", async (req, res) => {
  try {
    const tokenSchema = z.object({
      symbol: z.string()
        .min(1, "Symbol is required")
        .max(10, "Symbol must be at most 10 characters")
        .regex(/^[A-Z]+$/, "Symbol must be uppercase letters only"),
      name: z.string()
        .min(1, "Name is required")
        .max(100, "Name must be at most 100 characters"),
      address: z.string()
        .regex(/^0x[a-fA-F0-9]{40}$/, "Invalid contract address"),
      decimals: z.number()
        .int("Decimals must be an integer")
        .min(0, "Decimals must be at least 0")
        .max(18, "Decimals must be at most 18"),
      chainId: z.number()
        .int("Chain ID must be an integer")
        .positive("Chain ID must be positive"),
    });

    const validatedData = tokenSchema.parse(req.body);

    const [existingToken] = await db
      .select()
      .from(tokens)
      .where(eq(tokens.symbol, validatedData.symbol))
      .limit(1);

    if (existingToken) {
      return res.status(409).json({ error: "Token symbol already exists" });
    }

    const [newToken] = await db
      .insert(tokens)
      .values({
        symbol: validatedData.symbol,
        name: validatedData.name,
        address: validatedData.address,
        decimals: validatedData.decimals,
        chainId: validatedData.chainId,
        isActive: true,
      })
      .returning();

    res.status(201).json(newToken);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        error: "Invalid input",
        details: error.errors.map(e => ({ field: e.path.join('.'), message: e.message }))
      });
    }
    
    console.error("Error creating token:", error);
    res.status(500).json({ error: "Failed to create token" });
  }
});

router.patch("/admin/:id", async (req, res) => {
  try {
    const { id } = req.params;
    
    const updateSchema = z.object({
      name: z.string().min(1).max(100).optional(),
      isActive: z.boolean().optional(),
    });

    const validatedData = updateSchema.parse(req.body);

    const [existingToken] = await db
      .select()
      .from(tokens)
      .where(eq(tokens.id, id))
      .limit(1);

    if (!existingToken) {
      return res.status(404).json({ error: "Token not found" });
    }

    const [updatedToken] = await db
      .update(tokens)
      .set(validatedData)
      .where(eq(tokens.id, id))
      .returning();

    res.json(updatedToken);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        error: "Invalid input",
        details: error.errors.map(e => ({ field: e.path.join('.'), message: e.message }))
      });
    }
    
    console.error("Error updating token:", error);
    res.status(500).json({ error: "Failed to update token" });
  }
});

router.delete("/admin/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const [existingToken] = await db
      .select()
      .from(tokens)
      .where(eq(tokens.id, id))
      .limit(1);

    if (!existingToken) {
      return res.status(404).json({ error: "Token not found" });
    }

    const [deactivatedToken] = await db
      .update(tokens)
      .set({ isActive: false })
      .where(eq(tokens.id, id))
      .returning();

    res.json({ 
      success: true, 
      message: "Token deactivated successfully",
      token: deactivatedToken 
    });
  } catch (error) {
    console.error("Error deactivating token:", error);
    res.status(500).json({ error: "Failed to deactivate token" });
  }
});

export default router;
