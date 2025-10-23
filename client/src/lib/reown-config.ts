import { WagmiAdapter } from '@reown/appkit-adapter-wagmi';
import { celo } from '@wagmi/core/chains';

export const projectId = import.meta.env.VITE_REOWN_PROJECT_ID;

if (!projectId) {
  throw new Error('VITE_REOWN_PROJECT_ID is not set');
}

const celoRpcUrl = import.meta.env.VITE_CELO_RPC_URL || 'https://forno.celo.org';

export const celoChain = {
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

export const metadata = {
  name: 'x4pp',
  description: 'Your inbox isn\'t free real estate. Pay to message, get paid to read.',
  url: typeof window !== 'undefined' ? window.location.origin : 'https://x4pp.app',
  icons: ['https://x4pp.app/favicon.ico'],
};

// WagmiAdapter - storage is handled automatically
export const wagmiAdapter = new WagmiAdapter({
  networks: [celoChain],
  projectId,
  ssr: false,
});
