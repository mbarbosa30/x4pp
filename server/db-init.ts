import { db } from "./db";
import { tokens } from "../shared/schema";
import { eq } from "drizzle-orm";

/**
 * Initialize database with required tokens
 * This runs on app startup to ensure USDC exists in production/development
 */
export async function initializeDatabase() {
  try {
    // Check if USDC token already exists
    const existingUSDC = await db
      .select()
      .from(tokens)
      .where(eq(tokens.symbol, "USDC"))
      .limit(1);

    if (existingUSDC.length === 0) {
      // Insert USDC token (Circle's official native USDC on Celo mainnet)
      await db.insert(tokens).values({
        symbol: "USDC",
        name: "USD Coin",
        address: "0xcebA9300f2b948710d2653dD7B07f33A8B32118C",
        decimals: 6,
        chainId: 42220,
        isActive: true,
      });
      console.log("✓ USDC token initialized in database");
    } else {
      console.log("✓ USDC token already exists");
    }
  } catch (error) {
    console.error("Failed to initialize database:", error);
    // Don't crash the app, just log the error
  }
}
