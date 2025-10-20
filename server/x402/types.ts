// x402 Protocol Types
// Based on https://github.com/coinbase/x402

export interface PaymentRequirement {
  scheme: "exact";
  network: {
    chainId: number;
    name: string;
  };
  asset: {
    address: string;
    symbol: string;
    decimals: number;
  };
  amount: string; // In smallest units (e.g., USDC wei)
  recipient: string; // Wallet address
  nonce: string; // Unique payment identifier
  expiration: number; // Unix timestamp
}

export interface PaymentRequirementsResponse {
  x402Version: number;
  paymentRequirements: PaymentRequirement[];
}

export interface PaymentProof {
  chainId: number;
  tokenAddress: string;
  amount: string;
  sender: string;
  recipient: string;
  nonce: string;
  expiration: number;
  signature: string; // EIP-712 signature
}

export interface PaymentResponse {
  status: "settled" | "pending" | "failed";
  txHash?: string;
  message?: string;
}

export interface PriceQuoteRequest {
  recipientId: string;
  recipientUsername?: string;
  selfProof?: string; // Self Protocol ZK proof (optional)
  tags?: string[];
}

export interface PriceQuoteResponse {
  priceUSD: number;
  priceUSDC: string; // Amount in USDC smallest units
  basePrice: number;
  surgeFactor: number;
  humanDiscount: number;
  discountReason?: string;
  requiresProof: boolean;
  utilizationRate: number;
  slotsAvailable: number;
  expiresAt: number; // Unix timestamp
}

export interface MessageCommitRequest {
  recipientId: string;
  recipientUsername: string;
  senderNullifier: string;
  senderName: string;
  senderEmail?: string;
  content: string;
  replyBounty?: number;
  selfProof?: string;
}
