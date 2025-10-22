import { createConfig, http } from '@wagmi/core';
import { celo } from '@wagmi/core/chains';
import { injected, walletConnect } from '@wagmi/connectors';

// Celo mainnet RPC URL from environment
const celoRpcUrl = import.meta.env.VITE_CELO_RPC_URL || 'https://forno.celo.org';

// WalletConnect project ID (optional for demo)
const walletConnectProjectId = import.meta.env.VITE_WALLETCONNECT_PROJECT_ID || '';

export const wagmiConfig = createConfig({
  chains: [celo],
  connectors: [
    injected(),
    ...(walletConnectProjectId ? [walletConnect({ projectId: walletConnectProjectId })] : []),
  ],
  transports: {
    [celo.id]: http(celoRpcUrl),
  },
});
