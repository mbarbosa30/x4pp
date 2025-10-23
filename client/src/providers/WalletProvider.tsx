import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { createAppKit } from '@reown/appkit/react';
import { WagmiProvider, useDisconnect } from 'wagmi';
import { useAppKitAccount, useAppKit } from '@reown/appkit/react';
import { wagmiAdapter, celoChain, metadata, projectId } from "@/lib/reown-config";
import { queryClient } from "@/lib/queryClient";
import { useLocation } from "wouter";

// Initialize AppKit outside the component render cycle (per official docs)
if (!projectId) {
  console.error("AppKit Initialization Error: Project ID is missing.");
} else {
  createAppKit({
    adapters: [wagmiAdapter],
    projectId,
    networks: [celoChain],
    defaultNetwork: celoChain,
    metadata,
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
  const appKit = useAppKit();
  const { disconnect: wagmiDisconnect } = useDisconnect();
  const [isConnecting, setIsConnecting] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [, setLocation] = useLocation();

  // Auto-login when wallet connects (but not after manual disconnect)
  useEffect(() => {
    console.log('[WalletProvider] State changed:', { 
      isConnected, 
      address,
      isDisconnecting,
      timestamp: new Date().toISOString()
    });
    
    // Don't auto-login if user is in the middle of disconnecting
    if (isConnected && address && !isDisconnecting) {
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
    
    // Reset disconnecting flag when wallet is fully disconnected
    if (!isConnected && isDisconnecting) {
      console.log('[WalletProvider] Wallet fully disconnected, resetting flag');
      setIsDisconnecting(false);
    }
  }, [isConnected, address, isDisconnecting]);

  const handleConnect = async () => {
    try {
      setIsConnecting(true);
      console.log('[WalletProvider] Opening modal...');
      appKit.open();
    } catch (error) {
      console.error("Failed to open wallet modal:", error);
      throw error;
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    console.log('[WalletProvider] DISCONNECT: Killing session and wallet connection');
    setIsDisconnecting(true);
    
    // Clear backend session
    await fetch('/api/auth/logout', { method: 'POST' }).catch(() => {});
    
    // Clear query cache
    queryClient.setQueryData(['/api/auth/me'], null);
    queryClient.clear();
    
    // Disconnect wallet using proper wagmi hook
    wagmiDisconnect();
    
    console.log('[WalletProvider] DISCONNECT: Complete, redirecting to landing');
    setLocation('/');
    
    // Keep the flag set for a bit to prevent auto-reconnect
    setTimeout(() => setIsDisconnecting(false), 1000);
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
