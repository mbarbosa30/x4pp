import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { createAppKit } from '@reown/appkit/react';
import { WagmiProvider } from 'wagmi';
import { useAppKitAccount } from '@reown/appkit/react';
import { disconnect } from '@wagmi/core';
import { wagmiAdapter, celoChain, metadata, projectId } from "@/lib/reown-config";
import { queryClient } from "@/lib/queryClient";
import { useLocation } from "wouter";

// Singleton modal instance
let modalInstance: ReturnType<typeof createAppKit> | undefined;

function getOrCreateModal() {
  if (typeof window === 'undefined') return null;
  
  if (!modalInstance) {
    modalInstance = createAppKit({
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
  }
  
  return modalInstance;
}

const modal = getOrCreateModal();

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

  // Auto-login when wallet connects
  useEffect(() => {
    console.log('[WalletProvider] State changed:', { 
      isConnected, 
      address,
      timestamp: new Date().toISOString()
    });
    
    if (isConnected && address) {
      console.log('[WalletProvider] Attempting auto-login...');
      fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ walletAddress: address }),
      }).then(async (res) => {
        if (res.ok) {
          const data = await res.json();
          console.log('[WalletProvider] Auto-login successful:', data);
          queryClient.setQueryData(['/api/auth/me'], data);
        } else {
          console.error('[WalletProvider] Auto-login failed:', res.status);
        }
      }).catch(err => {
        console.error('[WalletProvider] Auto-login error:', err);
      });
    }
  }, [isConnected, address]);

  const handleConnect = async () => {
    try {
      setIsConnecting(true);
      console.log('[WalletProvider] Opening modal...');
      modal?.open();
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
    } catch (error) {
      console.error("Failed to disconnect:", error);
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
