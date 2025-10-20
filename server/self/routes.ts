import { Router } from "express";
import { db } from "../db";
import { users } from "@shared/schema";
import { eq } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";

const router = Router();

// Generate verification request (demo mode - just returns mock QR data)
router.post("/verify/request", async (req, res) => {
  try {
    const { username } = req.body;

    if (!username) {
      return res.status(400).json({ error: "Username required" });
    }

    // In demo mode, generate a mock verification session
    const sessionId = uuidv4();
    const mockQRData = {
      sessionId,
      verificationUrl: `https://self-demo.example.com/verify/${sessionId}`,
      expiresAt: new Date(Date.now() + 5 * 60 * 1000), // 5 minutes
    };

    // For demo, we'll auto-verify after a short delay
    // In production, this would return actual Self Protocol QR code data
    res.json({
      qrData: mockQRData.verificationUrl,
      sessionId,
      expiresAt: mockQRData.expiresAt,
      demo: true,
    });
  } catch (error) {
    console.error("Error creating verification request:", error);
    res.status(500).json({ error: "Failed to create verification request" });
  }
});

// Check verification status and complete verification
router.post("/verify/complete", async (req, res) => {
  try {
    const { sessionId, username, walletAddress } = req.body;

    if (!sessionId || !username) {
      return res.status(400).json({ error: "Session ID and username required" });
    }

    // Find user
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.username, username))
      .limit(1);

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // In demo mode, generate a mock nullifier
    // In production, this would come from Self Protocol verification response
    const mockNullifier = `self_nullifier_${uuidv4().replace(/-/g, "")}`;

    // Normalize wallet address to lowercase for consistent lookups
    const normalizedWallet = walletAddress?.toLowerCase();

    // Update user with verification
    const [updatedUser] = await db
      .update(users)
      .set({
        verified: true,
        selfNullifier: mockNullifier,
        // Store sender wallet address if provided (for discount eligibility lookup)
        ...(normalizedWallet && { walletAddress: normalizedWallet }),
      })
      .where(eq(users.username, username))
      .returning();

    res.json({
      verified: true,
      nullifier: mockNullifier,
      demo: true,
      user: {
        username: updatedUser.username,
        verified: updatedUser.verified,
        displayName: updatedUser.displayName,
      },
    });
  } catch (error) {
    console.error("Error completing verification:", error);
    res.status(500).json({ error: "Failed to complete verification" });
  }
});

// Get verification status for a user
router.get("/verify/status/:username", async (req, res) => {
  try {
    const { username } = req.params;

    const [user] = await db
      .select({
        username: users.username,
        verified: users.verified,
        hasNullifier: users.selfNullifier,
      })
      .from(users)
      .where(eq(users.username, username))
      .limit(1);

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json({
      verified: user.verified,
      hasNullifier: !!user.hasNullifier,
    });
  } catch (error) {
    console.error("Error checking verification status:", error);
    res.status(500).json({ error: "Failed to check verification status" });
  }
});

export default router;
