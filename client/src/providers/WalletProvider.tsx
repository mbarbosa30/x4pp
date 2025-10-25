import { createContext, useContext, useState, useEffect, ReactNode, useRef } from "react";
import { createAppKit } from '@reown/appkit/react';
import { WagmiProvider, useDisconnect, useAccount } from 'wagmi';
import { useAppKit } from '@reown/appkit/react';
import { wagmiAdapter, celoChain, metadata, projectId } from "@/lib/reown-config";
import { queryClient } from "@/lib/queryClient";
import { useLocation } from "wouter";

// HMR-safe singleton initialization (prevents recreation on hot reload)
type Singletons = {
  appKit: ReturnType<typeof createAppKit>;
  initTimestamp: string;
}

const g = globalThis as unknown as { __x4pp?: Singletons };

if (!g.__x4pp) {
  console.log('[WalletProvider] INITIALIZING SINGLETONS (should only happen once)');
  
  if (!projectId) {
    console.error("AppKit Initialization Error: Project ID is missing.");
  } else {
    const appKit = createAppKit({
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
    
    g.__x4pp = { 
      appKit,
      initTimestamp: new Date().toISOString()
    };
    console.log('[WalletProvider] AppKit initialized at:', g.__x4pp.initTimestamp);
  }
}

interface WalletContextType {
  address: string | undefined;
  isConnected: boolean;
  isConnecting: boolean;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  login: () => Promise<{ user: any } | null>;
}

const WalletContext = createContext<WalletContextType | null>(null);

function WalletProviderInner({ children }: { children: ReactNode }) {
  // Use wagmi's useAccount hook (more reliable than useAppKitAccount)
  const { address, isConnected, status } = useAccount();
  const appKit = useAppKit();
  const { disconnectAsync: wagmiDisconnectAsync } = useDisconnect();
  const [isConnecting, setIsConnecting] = useState(false);
  const [, setLocation] = useLocation();
  
  // Track previous address for cleanup
  const prevAddressRef = useRef<string>();

  // Monitor connection state with detailed logging
  useEffect(() => {
    console.log('[WalletProvider] State changed:', { 
      status,
      isConnected, 
      address,
      timestamp: new Date().toISOString()
    });
  }, [status, isConnected, address]);

  // Handle wallet disconnection - clean up query cache
  useEffect(() => {
    if (!isConnected && prevAddressRef.current) {
      console.log('[WalletProvider] Wallet disconnected, cleaning up cache for:', prevAddressRef.current);
      
      // Remove queries keyed by the previous address
      queryClient.removeQueries({ queryKey: ['userByWallet', prevAddressRef.current.toLowerCase()] });
      
      // Clear auth state
      fetch('/api/auth/logout', { method: 'POST', credentials: 'include' }).catch(() => {});
      queryClient.removeQueries({ queryKey: ['/api/auth/me'] });
    }
    
    prevAddressRef.current = address;
  }, [isConnected, address]);

  const handleConnect = async () => {
    try {
      setIsConnecting(true);
      console.log('[WalletProvider] Opening wallet modal...', { 
        appKitAvailable: !!appKit,
        singleton: !!g.__x4pp 
      });
      
      if (!appKit) {
        console.error('[WalletProvider] AppKit not initialized!');
        throw new Error('AppKit not available');
      }
      
      await appKit.open();
      console.log('[WalletProvider] Modal opened, waiting for connection...');
      
    } catch (error) {
      console.error("[WalletProvider] Failed to open wallet modal:", error);
      throw error;
    } finally {
      setIsConnecting(false);
    }
  };

  const handleLogin = async () => {
    if (!isConnected || !address) {
      console.log('[WalletProvider] Cannot login: wallet not connected');
      return null;
    }
    
    console.log('[WalletProvider] Logging in with address:', address);
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ walletAddress: address }),
    });
    
    if (res.ok) {
      const data = await res.json();
      console.log('[WalletProvider] Login successful:', data);
      queryClient.setQueryData(['/api/auth/me'], data);
      return data;
    } else {
      console.error('[WalletProvider] Login failed:', res.status);
      return null;
    }
  };

  const handleDisconnect = async () => {
    console.log('[WalletProvider] Disconnecting...');
    
    // Capture address before disconnecting
    const currentAddress = address;
    
    // Clear backend session
    await fetch('/api/auth/logout', { 
      method: 'POST', 
      credentials: 'include' 
    }).catch(() => {});
    
    // Clear query cache
    if (currentAddress) {
      queryClient.removeQueries({ queryKey: ['userByWallet', currentAddress.toLowerCase()] });
    }
    queryClient.removeQueries({ queryKey: ['/api/auth/me'] });
    queryClient.removeQueries({ queryKey: ['/api/messages'] });
    
    // Disconnect wallet
    try {
      await wagmiDisconnectAsync();
      console.log('[WalletProvider] Wallet disconnected successfully');
    } catch (e) {
      console.error('[WalletProvider] Disconnect error:', e);
    }
    
    setLocation('/');
  };

  return (
    <WalletContext.Provider
      value={{
        address,
        isConnected,
        isConnecting: isConnecting || status === 'connecting',
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
