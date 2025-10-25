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

// Clear any stale WalletConnect storage on init to prevent auto-reconnect issues
if (typeof window !== 'undefined') {
  // Clear WalletConnect storage keys that might cause reconnection loops
  const keysToRemove: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && (key.startsWith('wc@2') || key.startsWith('@w3m') || key.startsWith('W3M'))) {
      keysToRemove.push(key);
    }
  }
  keysToRemove.forEach(key => {
    console.log('[reown-config] Clearing stale storage:', key);
    localStorage.removeItem(key);
  });
}

// WagmiAdapter configuration
export const wagmiAdapter = new WagmiAdapter({
  networks: [celoChain],
  projectId,
  ssr: false,
});
