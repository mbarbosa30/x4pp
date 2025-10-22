import { Router } from "express";
import { db } from "../db";
import { users } from "@shared/schema";
import { eq } from "drizzle-orm";

const router = Router();

// Get current authenticated user
router.get("/me", async (req, res) => {
  try {
    if (!req.session.userId || !req.session.username) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const [user] = await db
      .select({
        id: users.id,
        username: users.username,
        displayName: users.displayName,
        walletAddress: users.walletAddress,
        verified: users.verified,
      })
      .from(users)
      .where(eq(users.id, req.session.userId))
      .limit(1);

    if (!user) {
      // Session exists but user was deleted
      req.session.destroy(() => {});
      return res.status(401).json({ error: "User not found" });
    }

    res.json({ user });
  } catch (error) {
    console.error("Error fetching current user:", error);
    res.status(500).json({ error: "Failed to fetch user" });
  }
});

// Login with username (simple auth for MVP)
router.post("/login", async (req, res) => {
  try {
    const { username, walletAddress } = req.body;

    if (!username && !walletAddress) {
      return res.status(400).json({ error: "Username or wallet address is required" });
    }

    const [user] = await db
      .select({
        id: users.id,
        username: users.username,
        displayName: users.displayName,
        walletAddress: users.walletAddress,
        verified: users.verified,
      })
      .from(users)
      .where(
        username 
          ? eq(users.username, username)
          : eq(users.walletAddress, walletAddress.toLowerCase())
      )
      .limit(1);

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Set session
    req.session.userId = user.id;
    req.session.username = user.username;

    // Save session before responding
    await new Promise<void>((resolve, reject) => {
      req.session.save((err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    res.json({ user });
  } catch (error) {
    console.error("Error logging in:", error);
    res.status(500).json({ error: "Login failed" });
  }
});

// Logout
router.post("/logout", (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ error: "Logout failed" });
    }
    res.json({ success: true });
  });
});

export default router;
