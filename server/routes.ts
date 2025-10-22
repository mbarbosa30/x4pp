import type { Express } from "express";
import { createServer, type Server } from "http";
import { db } from "./db";
import { users, messages, vouches, blocks, reputationScores, payments, insertMessageSchema, insertVouchSchema, insertBlockSchema } from "@shared/schema";
import { eq, and, desc } from "drizzle-orm";
import { computeReputationScore, updateReputationScore, logReputationEvent } from "./reputation";
import selfRoutes from "./self/routes";
import commitRoutes from "./api/commit";
import reputationRoutes from "./api/reputation";
import adminRoutes from "./api/admin";
import profileRoutes from "./api/profile";
import usersRoutes from "./api/users";
import authRoutes from "./api/auth";
import tokensRoutes from "./api/tokens";
import priceGuideRoutes from "./api/price-guide";
import messagesRoutes from "./api/messages";
import { startRefundMonitor } from "./services/refunds";

export async function registerRoutes(app: Express): Promise<Server> {
  // Mount authentication routes
  app.use("/api/auth", authRoutes);
  
  // Mount Self Protocol verification routes
  app.use("/api/self", selfRoutes);
  
  // Mount commit routes
  app.use("/api/commit", commitRoutes);
  
  // Mount reputation routes
  app.use("/api/reputation", reputationRoutes);
  
  // Mount admin routes
  app.use("/api/admin", adminRoutes);
  
  // Mount profile routes
  app.use("/api/profile", profileRoutes);
  
  // Mount user registration routes
  app.use("/api/users", usersRoutes);
  
  // Mount token management routes
  app.use("/api/tokens", tokensRoutes);
  
  // Mount price guide routes
  app.use("/api/price-guide", priceGuideRoutes);
  
  // Mount message management routes
  app.use("/api/messages", messagesRoutes);
  
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

      const foundUser = user[0];
      
      // Check if profile is public or if user is viewing their own profile
      const authenticatedUser = (req as any).session?.username;
      const isOwner = authenticatedUser === username;
      
      if (!foundUser.isPublic && !isOwner) {
        // Profile is private - return minimal information
        return res.json({
          username: foundUser.username,
          displayName: foundUser.displayName,
          isPublic: false,
          message: "This profile is private",
        });
      }

      res.json(foundUser);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ error: "Failed to fetch user" });
    }
  });

  // Get user settings by username
  app.get("/api/settings/:username", async (req, res) => {
    try {
      const { username } = req.params;
      let user = await db
        .select({
          minBasePrice: users.minBasePrice,
          slaHours: users.slaHours,
          walletAddress: users.walletAddress,
          tokenId: users.tokenId,
        })
        .from(users)
        .where(eq(users.username, username))
        .limit(1);

      // Auto-create user if doesn't exist (for demo/development)
      if (user.length === 0) {
        await db.insert(users).values({
          username,
          displayName: username.charAt(0).toUpperCase() + username.slice(1).replace(/_/g, ' '),
          selfNullifier: `${username}_nullifier`,
          verified: false,
        });

        // Fetch the newly created user
        user = await db
          .select({
            minBasePrice: users.minBasePrice,
            slaHours: users.slaHours,
            walletAddress: users.walletAddress,
            tokenId: users.tokenId,
          })
          .from(users)
          .where(eq(users.username, username))
          .limit(1);
      }

      res.json(user[0]);
    } catch (error) {
      console.error("Error fetching user settings:", error);
      res.status(500).json({ error: "Failed to fetch settings" });
    }
  });

  // Update user settings
  app.put("/api/settings/:username", async (req, res) => {
    try {
      const { username } = req.params;
      const {
        minBasePrice,
        slaHours,
        walletAddress,
        tokenId,
      } = req.body;

      // Check if user exists
      const existingUser = await db
        .select()
        .from(users)
        .where(eq(users.username, username))
        .limit(1);

      // Auto-create user if doesn't exist (for demo/development)
      if (existingUser.length === 0) {
        await db.insert(users).values({
          username,
          displayName: username.charAt(0).toUpperCase() + username.slice(1).replace(/_/g, ' '),
          selfNullifier: `${username}_nullifier`,
          verified: false,
          minBasePrice,
          slaHours,
          walletAddress,
          tokenId,
        });

        // Return the newly created user settings
        return res.json({
          minBasePrice,
          slaHours,
          walletAddress,
          tokenId,
        });
      }

      // Update user settings
      const [updatedUser] = await db
        .update(users)
        .set({
          minBasePrice,
          slaHours,
          walletAddress,
          tokenId,
        })
        .where(eq(users.username, username))
        .returning({
          minBasePrice: users.minBasePrice,
          slaHours: users.slaHours,
          walletAddress: users.walletAddress,
          tokenId: users.tokenId,
        });

      res.json(updatedUser);
    } catch (error) {
      console.error("Error updating user settings:", error);
      res.status(500).json({ error: "Failed to update settings" });
    }
  });


  const httpServer = createServer(app);

  return httpServer;
}
