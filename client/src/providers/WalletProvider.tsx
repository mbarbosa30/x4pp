import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { createAppKit } from '@reown/appkit/react';
import { WagmiProvider } from 'wagmi';
import { useAppKitAccount } from '@reown/appkit/react';
import { disconnect } from '@wagmi/core';
import { wagmiAdapter, celoChain, metadata, projectId } from "@/lib/reown-config";
import { queryClient } from "@/lib/queryClient";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";

// Create Reown AppKit modal
const modal = createAppKit({
  adapters: [wagmiAdapter],
  networks: [celoChain],
  metadata,
  projectId,
  features: {
    analytics: false,
    email: false,
    socials: false,
    onramp: false,
    swaps: false,
  },
  themeMode: 'dark',
  themeVariables: {
    '--w3m-accent': 'hsl(262 70% 62%)',
  },
  allowUnsupportedChain: true,
});

interface WalletContextType {
  address: string | undefined;
  isConnected: boolean;
  isConnecting: boolean;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
}

const WalletContext = createContext<WalletContextType | null>(null);

function WalletProviderInner({ children }: { children: ReactNode }) {
  const { address, isConnected } = useAppKitAccount();
  const [isConnecting, setIsConnecting] = useState(false);
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  useEffect(() => {
    if (isConnected && address) {
      fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ walletAddress: address }),
      }).then(async (res) => {
        if (res.ok) {
          const data = await res.json();
          queryClient.setQueryData(['/api/auth/me'], data);
        }
      });
    }
  }, [isConnected, address]);

  const handleConnect = async () => {
    try {
      setIsConnecting(true);
      console.log('[WalletProvider] Opening Reown AppKit modal...');
      console.log('[WalletProvider] Available connectors:', wagmiAdapter.wagmiConfig.connectors.map(c => ({ id: c.id, name: c.name })));
      modal.open();
    } catch (error) {
      console.error("Failed to open wallet modal:", error);
      throw error;
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    try {
      await disconnect(wagmiAdapter.wagmiConfig);
      await fetch('/api/auth/logout', { method: 'POST' });
      queryClient.setQueryData(['/api/auth/me'], null);
      queryClient.clear();
      setLocation('/');
    } catch (error) {
      console.error("Failed to disconnect wallet:", error);
      throw error;
    }
  };

  return (
    <WalletContext.Provider
      value={{
        address,
        isConnected,
        isConnecting,
        connect: handleConnect,
        disconnect: handleDisconnect,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
}

export function WalletProvider({ children }: { children: ReactNode }) {
  return (
    <WagmiProvider config={wagmiAdapter.wagmiConfig}>
      <WalletProviderInner>
        {children}
      </WalletProviderInner>
    </WagmiProvider>
  );
}

export function useWallet() {
  const context = useContext(WalletContext);
  if (!context) {
    throw new Error("useWallet must be used within WalletProvider");
  }
  return context;
}
