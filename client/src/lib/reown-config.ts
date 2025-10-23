import { createAppKit } from '@reown/appkit/react';
import { WagmiAdapter } from '@reown/appkit-adapter-wagmi';
import { celo } from '@reown/appkit/networks';
import type { AppKitNetwork } from '@reown/appkit/networks';

export const projectId = import.meta.env.VITE_REOWN_PROJECT_ID;

if (!projectId) {
  throw new Error('VITE_REOWN_PROJECT_ID is not set');
}

export const metadata = {
  name: 'x4pp',
  description: 'P2P Attention Market - Get paid to read messages',
  url: typeof window !== 'undefined' ? window.location.origin : '',
  icons: ['https://avatars.githubusercontent.com/u/179229932'],
};

// Debug: Log the metadata URL
if (typeof window !== 'undefined') {
  console.log('[Reown Config] Metadata URL:', metadata.url);
  console.log('[Reown Config] Window origin:', window.location.origin);
}

const networks: [AppKitNetwork, ...AppKitNetwork[]] = [celo];

// Create Wagmi Adapter
export const wagmiAdapter = new WagmiAdapter({
  networks,
  projectId,
  ssr: false
});

// Create modal - MUST be outside React components
createAppKit({
  adapters: [wagmiAdapter],
  networks,
  projectId,
  metadata,
  features: {
    analytics: false
  },
  themeMode: 'dark'
});
