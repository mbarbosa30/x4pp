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
  login: () => Promise<void>;
}

const WalletContext = createContext<WalletContextType | null>(null);

function WalletProviderInner({ children }: { children: ReactNode }) {
  const { address, isConnected } = useAppKitAccount();
  const appKit = useAppKit();
  const { disconnectAsync: wagmiDisconnectAsync } = useDisconnect();
  const [isConnecting, setIsConnecting] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [, setLocation] = useLocation();

  // Monitor connection state
  useEffect(() => {
    console.log('[WalletProvider] State changed:', { 
      isConnected, 
      address,
      isDisconnecting,
      timestamp: new Date().toISOString()
    });
    
    // When wallet disconnects, clear session
    if (!isConnected && !isDisconnecting) {
      queryClient.setQueryData(['/api/auth/me'], null);
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

  const handleLogin = async () => {
    if (!isConnected || !address) {
      console.log('[WalletProvider] Cannot login: wallet not connected');
      return;
    }
    
    console.log('[WalletProvider] Manual login...');
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ walletAddress: address }),
    });
    
    if (res.ok) {
      const data = await res.json();
      console.log('[WalletProvider] Login successful:', data);
      queryClient.setQueryData(['/api/auth/me'], data);
    } else {
      console.error('[WalletProvider] Login failed:', res.status);
    }
  };

  const handleDisconnect = async () => {
    console.log('[WalletProvider] Logging out (wallet stays connected)...');
    
    // Clear backend session
    await fetch('/api/auth/logout', { method: 'POST' }).catch(() => {});
    
    // Clear query cache
    queryClient.setQueryData(['/api/auth/me'], null);
    queryClient.clear();
    
    console.log('[WalletProvider] Logout complete');
    setLocation('/');
  };

  return (
    <WalletContext.Provider
      value={{
        address,
        isConnected,
        isConnecting,
        connect: handleConnect,
        disconnect: handleDisconnect,
        login: handleLogin,
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
