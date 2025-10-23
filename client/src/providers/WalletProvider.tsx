import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { WagmiProvider } from 'wagmi';
import { getAccount, watchAccount, disconnect } from '@wagmi/core';
import { createAppKit, useAppKitAccount } from '@reown/appkit/react';
import { wagmiAdapter, celoChain, projectId, metadata } from "@/lib/reown-config";
import { queryClient } from "@/lib/queryClient";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";

// Create modal instance
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

const WalletContext = createContext<WalletContextType | undefined>(undefined);

// Inner provider that uses AppKit hooks
function WalletProviderInner({ children }: { children: ReactNode }) {
  const { address, isConnected } = useAppKitAccount();
  const [isConnecting, setIsConnecting] = useState(false);
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  useEffect(() => {
    // Auto-login when wallet connects
    if (isConnected && address) {
      console.log('WalletProvider: Wallet connected, attempting auto-login');
      fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ walletAddress: address }),
        credentials: 'include',
      }).then(async response => {
        if (response.ok) {
          const data = await response.json();
          console.log('Auto-logged in as:', data.user.username);
          queryClient.setQueryData(['/api/auth/me'], data);
          
          if (window.location.pathname === '/') {
            setLocation('/app');
          }
        } else {
          console.log('No account found for this wallet');
          
          const currentPath = window.location.pathname;
          if (currentPath === '/' || currentPath === '/app' || currentPath.startsWith('/app/')) {
            toast({
              title: "Account Not Found",
              description: "Please register to start using x4pp",
              variant: "default",
            });
            
            setTimeout(() => {
              setLocation('/register');
            }, 1500);
          }
        }
      }).catch(err => {
        console.error('Auto-login failed:', err);
      });
    }
  }, [isConnected, address]);

  // Handle disconnect
  useEffect(() => {
    if (!isConnected) {
      // Logout when wallet disconnects
      fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
      }).catch(err => {
        console.error('Logout failed:', err);
      });
    }
  }, [isConnected]);

  const handleConnect = async () => {
    try {
      setIsConnecting(true);
      // Open the Reown AppKit modal
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
      
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
      });
      
      queryClient.clear();
      setLocation('/');
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

// Main provider that wraps with WagmiProvider
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
