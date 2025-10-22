import { createAppKit } from '@reown/appkit';
import { WagmiAdapter } from '@reown/appkit-adapter-wagmi';
import { celo } from '@wagmi/core/chains';

// Project metadata for WalletConnect
const projectId = import.meta.env.VITE_REOWN_PROJECT_ID;

if (!projectId) {
  throw new Error('VITE_REOWN_PROJECT_ID is not set');
}

// Celo mainnet RPC URL from environment
const celoRpcUrl = import.meta.env.VITE_CELO_RPC_URL || 'https://forno.celo.org';

// Configure Celo chain with custom RPC
const celoChain = {
  ...celo,
  rpcUrls: {
    default: {
      http: [celoRpcUrl],
    },
    public: {
      http: [celoRpcUrl],
    },
  },
};

// Create Wagmi adapter for Reown AppKit
export const wagmiAdapter = new WagmiAdapter({
  networks: [celoChain],
  projectId,
});

// App metadata
const metadata = {
  name: 'x4pp',
  description: 'P2P Attention Market - Get paid to read messages',
  url: typeof window !== 'undefined' ? window.location.origin : 'https://x4pp.app',
  icons: ['https://x4pp.app/favicon.ico'],
};

// Create and export the AppKit modal
export const modal = createAppKit({
  adapters: [wagmiAdapter],
  networks: [celoChain],
  metadata,
  projectId,
  features: {
    analytics: false,
  },
  themeMode: 'dark',
  themeVariables: {
    '--w3m-accent': 'hsl(262 70% 62%)', // Brand purple
  },
});

// Export wagmi config for use with wagmi hooks
export const wagmiConfig = wagmiAdapter.wagmiConfig;
