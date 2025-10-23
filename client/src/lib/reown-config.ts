import { WagmiAdapter } from '@reown/appkit-adapter-wagmi';
import { celo } from '@wagmi/core/chains';
import { walletConnect, injected, coinbaseWallet } from '@wagmi/connectors';

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
  description: 'P2P Attention Market - Get paid to read messages',
  url: typeof window !== 'undefined' ? window.location.origin : 'https://x4pp.app',
  icons: ['https://x4pp.app/favicon.ico'],
};

export const wagmiAdapter = new WagmiAdapter({
  networks: [celoChain],
  projectId,
  connectors: [
    walletConnect({
      projectId,
      metadata,
      showQrModal: false,
      relayUrl: 'wss://relay.walletconnect.com',
    }),
    injected({ shimDisconnect: true }),
    coinbaseWallet({
      appName: metadata.name,
      appLogoUrl: metadata.icons[0],
    }),
  ],
});
