import { createPublicClient, createWalletClient, http, parseUnits, formatUnits, Address, Hex } from 'viem';
import { celo } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';

const CELO_RPC_URL = process.env.CELO_RPC_URL || 'https://forno.celo.org';
const USDC_ADDRESS = '0xcebA9300f2b948710d2653dD7B07f33A8B32118C' as Address;

const USDC_ABI = [
  {
    name: 'balanceOf',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'transfer',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'to', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [{ name: '', type: 'bool' }],
  },
  {
    name: 'transferWithAuthorization',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'from', type: 'address' },
      { name: 'to', type: 'address' },
      { name: 'value', type: 'uint256' },
      { name: 'validAfter', type: 'uint256' },
      { name: 'validBefore', type: 'uint256' },
      { name: 'nonce', type: 'bytes32' },
      { name: 'v', type: 'uint8' },
      { name: 'r', type: 'bytes32' },
      { name: 's', type: 'bytes32' },
    ],
    outputs: [],
  },
  {
    name: 'authorizationState',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: 'authorizer', type: 'address' },
      { name: 'nonce', type: 'bytes32' },
    ],
    outputs: [{ name: '', type: 'bool' }],
  },
] as const;

export const publicClient = createPublicClient({
  chain: celo,
  transport: http(CELO_RPC_URL),
});

export interface PaymentRequirements {
  amount: string;
  currency: string;
  recipient: Address;
  network: {
    chainId: number;
    name: string;
    rpcUrl: string;
  };
  token: {
    address: Address;
    symbol: string;
    decimals: number;
  };
  validUntil: number;
}

export interface PaymentAuthorization {
  from: Address;
  to: Address;
  value: string;
  validAfter: number;
  validBefore: number;
  nonce: Hex;
  signature: {
    v: number;
    r: Hex;
    s: Hex;
  };
}

export function generatePaymentRequirements(
  recipientWallet: string,
  amountUsd: number,
  tokenAddress?: string,
  tokenSymbol?: string,
  tokenDecimals?: number,
  chainId?: number
): PaymentRequirements {
  // Use provided token details or fall back to USDC defaults
  const finalTokenAddress = tokenAddress || USDC_ADDRESS;
  const finalTokenSymbol = tokenSymbol || 'USDC';
  const finalTokenDecimals = tokenDecimals || 6;
  const finalChainId = chainId || 42220;
  
  const tokenAmount = parseUnits(amountUsd.toFixed(finalTokenDecimals), finalTokenDecimals);
  
  return {
    amount: tokenAmount.toString(),
    currency: finalTokenSymbol,
    recipient: recipientWallet as Address,
    network: {
      chainId: finalChainId,
      name: finalChainId === 42220 ? 'Celo Mainnet' : 'Celo',
      rpcUrl: CELO_RPC_URL,
    },
    token: {
      address: finalTokenAddress as Address,
      symbol: finalTokenSymbol,
      decimals: finalTokenDecimals,
    },
    validUntil: Math.floor(Date.now() / 1000) + 3600,
  };
}

export async function verifyPaymentAuthorization(
  auth: PaymentAuthorization,
  expectedRecipient: Address,
  expectedAmount: bigint,
  tokenAddress?: Address
): Promise<boolean> {
  try {
    if (auth.to.toLowerCase() !== expectedRecipient.toLowerCase()) {
      console.error('Payment recipient mismatch:', {
        expected: expectedRecipient,
        received: auth.to,
      });
      return false;
    }

    const authValue = BigInt(auth.value);
    if (authValue < expectedAmount) {
      console.error('Payment amount insufficient:', {
        expected: expectedAmount.toString(),
        received: authValue.toString(),
      });
      return false;
    }

    const finalTokenAddress = tokenAddress || USDC_ADDRESS;
    const isNonceUsed = await publicClient.readContract({
      address: finalTokenAddress,
      abi: USDC_ABI,
      functionName: 'authorizationState',
      args: [auth.from, auth.nonce],
    });

    if (isNonceUsed) {
      console.error('Payment nonce already used:', auth.nonce);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error verifying payment authorization:', error);
    return false;
  }
}

export async function executePaymentSettlement(
  auth: PaymentAuthorization,
  tokenAddress?: Address,
  tokenDecimals?: number
): Promise<{ success: boolean; txHash?: string; error?: string }> {
  try {
    if (!process.env.PAYMENT_WALLET_PRIVATE_KEY) {
      throw new Error('PAYMENT_WALLET_PRIVATE_KEY not configured');
    }

    const account = privateKeyToAccount(process.env.PAYMENT_WALLET_PRIVATE_KEY as Hex);
    
    const walletClient = createWalletClient({
      account,
      chain: celo,
      transport: http(CELO_RPC_URL),
    });

    const finalTokenAddress = tokenAddress || USDC_ADDRESS;
    const finalTokenDecimals = tokenDecimals || 6;

    const hash = await walletClient.writeContract({
      address: finalTokenAddress,
      abi: USDC_ABI,
      functionName: 'transferWithAuthorization',
      args: [
        auth.from,
        auth.to,
        BigInt(auth.value),
        BigInt(auth.validAfter),
        BigInt(auth.validBefore),
        auth.nonce,
        auth.signature.v,
        auth.signature.r,
        auth.signature.s,
      ],
    });

    await publicClient.waitForTransactionReceipt({ hash });

    console.log('Payment settled on-chain:', {
      from: auth.from,
      to: auth.to,
      value: formatUnits(BigInt(auth.value), finalTokenDecimals),
      txHash: hash,
    });

    return { success: true, txHash: hash };
  } catch (error: any) {
    console.error('Error executing payment settlement:', error);
    return { success: false, error: error.message };
  }
}

export async function executeRefund(
  senderWallet: Address,
  amountUsd: number
): Promise<{ success: boolean; txHash?: string; error?: string }> {
  try {
    if (!process.env.PAYMENT_WALLET_PRIVATE_KEY) {
      throw new Error('PAYMENT_WALLET_PRIVATE_KEY not configured');
    }

    const account = privateKeyToAccount(process.env.PAYMENT_WALLET_PRIVATE_KEY as Hex);
    
    const walletClient = createWalletClient({
      account,
      chain: celo,
      transport: http(CELO_RPC_URL),
    });

    const refundAmount = parseUnits(amountUsd.toFixed(6), 6);

    const hash = await walletClient.writeContract({
      address: USDC_ADDRESS,
      abi: USDC_ABI,
      functionName: 'transfer',
      args: [senderWallet, refundAmount],
    });

    await publicClient.waitForTransactionReceipt({ hash });

    console.log('Refund executed on-chain:', {
      to: senderWallet,
      amount: formatUnits(refundAmount, 6),
      txHash: hash,
    });

    return { success: true, txHash: hash };
  } catch (error: any) {
    console.error('Error executing refund:', error);
    return { success: false, error: error.message };
  }
}

export async function getUSDCBalance(address: Address): Promise<string> {
  try {
    const balance = await publicClient.readContract({
      address: USDC_ADDRESS,
      abi: USDC_ABI,
      functionName: 'balanceOf',
      args: [address],
    });

    return formatUnits(balance, 6);
  } catch (error) {
    console.error('Error getting USDC balance:', error);
    return '0';
  }
}
