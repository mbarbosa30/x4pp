// EIP-3009: Transfer With Authorization
// Used for gasless USDC transfers on Celo

import { keccak256, toHex } from 'viem';

export interface TransferWithAuthorizationParams {
  from: string;
  to: string;
  value: bigint;
  validAfter: bigint;
  validBefore: bigint;
  nonce: string;
}

/**
 * Convert a string nonce to bytes32 format required by EIP-3009
 * Uses keccak256 hash to ensure proper 32-byte format
 */
export function nonceToBytes32(nonce: string): `0x${string}` {
  // Hash the nonce string to get exactly 32 bytes
  return keccak256(toHex(nonce));
}

export interface PaymentAuthSignature {
  v: number;
  r: string;
  s: string;
}

// EIP-712 domain for USDC on Celo mainnet
export const USDC_CELO_DOMAIN = {
  name: 'USD Coin',
  version: '2',
  chainId: 42220,
  verifyingContract: '0xcebA9300f2b948710d2653dD7B07f33A8B32118C' as `0x${string}`,
};

// EIP-712 types for TransferWithAuthorization
export const TRANSFER_WITH_AUTHORIZATION_TYPES = {
  TransferWithAuthorization: [
    { name: 'from', type: 'address' },
    { name: 'to', type: 'address' },
    { name: 'value', type: 'uint256' },
    { name: 'validAfter', type: 'uint256' },
    { name: 'validBefore', type: 'uint256' },
    { name: 'nonce', type: 'bytes32' },
  ],
};

/**
 * Sign a TransferWithAuthorization message using EIP-712
 * This creates a signature that can be used to transfer USDC without gas
 */
export async function signTransferAuthorization(
  params: TransferWithAuthorizationParams,
  signerAddress: `0x${string}`
): Promise<string> {
  // Request signature from wallet using EIP-712
  const domain = USDC_CELO_DOMAIN;
  const types = TRANSFER_WITH_AUTHORIZATION_TYPES;
  const message = {
    from: params.from,
    to: params.to,
    value: params.value.toString(),
    validAfter: params.validAfter.toString(),
    validBefore: params.validBefore.toString(),
    nonce: params.nonce,
  };

  console.log('[EIP-712 Signing] Domain:', domain);
  console.log('[EIP-712 Signing] Message:', message);
  console.log('[EIP-712 Signing] Types:', types);

  try {
    // Use ethereum provider to sign typed data
    if (!window.ethereum) {
      throw new Error('No ethereum provider found');
    }

    const signature = await window.ethereum.request({
      method: 'eth_signTypedData_v4',
      params: [
        signerAddress,
        JSON.stringify({
          types: {
            EIP712Domain: [
              { name: 'name', type: 'string' },
              { name: 'version', type: 'string' },
              { name: 'chainId', type: 'uint256' },
              { name: 'verifyingContract', type: 'address' },
            ],
            ...types,
          },
          primaryType: 'TransferWithAuthorization',
          domain,
          message,
        }),
      ],
    });

    return signature as string;
  } catch (error) {
    console.error('Error signing transfer authorization:', error);
    throw error;
  }
}

/**
 * Parse signature string into v, r, s components
 */
export function parseSignature(signature: string): PaymentAuthSignature {
  const sig = signature.startsWith('0x') ? signature.slice(2) : signature;
  
  const r = `0x${sig.slice(0, 64)}`;
  const s = `0x${sig.slice(64, 128)}`;
  const v = parseInt(sig.slice(128, 130), 16);

  return { v, r, s };
}

// Extend Window interface for ethereum provider
declare global {
  interface Window {
    ethereum?: {
      request: (args: { method: string; params?: any[] }) => Promise<any>;
      on: (event: string, callback: (...args: any[]) => void) => void;
      removeListener: (event: string, callback: (...args: any[]) => void) => void;
    };
  }
}
