// Celo Network Configuration for x402 Payments

export const CELO_MAINNET = {
  chainId: 42220,
  name: "Celo",
  rpcUrl: process.env.CELO_RPC_URL || "https://forno.celo.org",
  usdcAddress: "0xcebA9300f2b948710d2653dD7B07f33A8B32118C", // Native USDC on Celo
  currency: "CELO",
  explorer: "https://celoscan.io",
  decimals: 6, // USDC decimals
};

export const CELO_ALFAJORES = {
  chainId: 44787,
  name: "Celo Alfajores",
  rpcUrl: "https://alfajores-forno.celo-testnet.org",
  usdcAddress: "0x2F25deB3848C207fc8E0c34035B3Ba7fC157602B", // USDC on testnet
  currency: "CELO",
  explorer: "https://alfajores.celoscan.io",
  decimals: 6,
};

// Use mainnet for production (REPLIT_DEPLOYMENT=1 in published apps)
export const CELO_CONFIG = process.env.REPLIT_DEPLOYMENT === "1" 
  ? CELO_MAINNET 
  : CELO_MAINNET; // Using mainnet in both dev and prod as requested

// Payment wallet configuration
export const PAYMENT_WALLET = {
  address: process.env.PAYMENT_WALLET_ADDRESS || "",
  privateKey: process.env.PAYMENT_WALLET_PRIVATE_KEY || "",
};

// x402 Protocol Configuration
export const X402_CONFIG = {
  version: 1,
  scheme: "exact" as const,
  facilitatorUrl: process.env.X402_FACILITATOR_URL || "http://localhost:3005",
  paymentTimeoutMs: 300000, // 5 minutes
};

// Pricing Configuration
export const PRICING_CONFIG = {
  // Base price per message in USDC
  basePrice: 0.05,
  
  // Surge pricing parameters
  surgeAlpha: 0.5, // Surge multiplier coefficient
  surgeK: 2, // Surge power (quadratic)
  
  // Human discount for Self-verified users
  humanDiscountPercent: 50, // 50% discount for verified humans
  
  // Attention slots
  defaultSlotsPerHour: 5,
  
  // SLA configuration
  defaultSlaHours: 24, // 24 hours to open message
  
  // Minimum viable payment
  minPaymentUsd: 0.01,
};

export function calculateMessagePrice(
  basePrice: number,
  utilizationRate: number,
  isVerifiedHuman: boolean
): number {
  // Surge floor: base * (1 + alpha * utilization^k)
  const surge = PRICING_CONFIG.surgeAlpha * Math.pow(utilizationRate, PRICING_CONFIG.surgeK);
  const floorPrice = basePrice * (1 + surge);
  
  // Apply human discount if verified
  const discount = isVerifiedHuman ? (PRICING_CONFIG.humanDiscountPercent / 100) : 0;
  const finalPrice = floorPrice * (1 - discount);
  
  return Math.max(finalPrice, PRICING_CONFIG.minPaymentUsd);
}

export function formatUSDC(amount: number): string {
  // Convert USD amount to USDC smallest units (6 decimals)
  return (amount * 1e6).toFixed(0);
}

export function parseUSDC(amountWei: string): number {
  // Convert USDC smallest units to USD
  return parseFloat(amountWei) / 1e6;
}
