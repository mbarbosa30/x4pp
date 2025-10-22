import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { getAccount, watchAccount, disconnect } from '@wagmi/core';
import { wagmiConfig, modal } from "@/lib/reown-config";
import { queryClient } from "@/lib/queryClient";
import { useLocation } from "wouter";

interface WalletContextType {
  address: string | undefined;
  isConnected: boolean;
  isConnecting: boolean;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

export function WalletProvider({ children }: { children: ReactNode }) {
  const [address, setAddress] = useState<string | undefined>();
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [, setLocation] = useLocation();

  useEffect(() => {
    // Initialize account state
    const account = getAccount(wagmiConfig);
    setAddress(account.address);
    setIsConnected(account.isConnected);

    // Watch for account changes
    const unwatch = watchAccount(wagmiConfig, {
      async onChange(account) {
        const previousAddress = address;
        const previousConnected = isConnected;
        
        setAddress(account.address);
        setIsConnected(account.isConnected);

        // Handle wallet disconnect (external or via disconnect button)
        if (previousConnected && !account.isConnected) {
          try {
            await fetch('/api/auth/logout', {
              method: 'POST',
              credentials: 'include',
            });
            console.log('Logged out due to wallet disconnect');
          } catch (logoutError) {
            console.error('Failed to logout:', logoutError);
          }
          return;
        }

        // Handle new wallet connection or account switch
        if (account.isConnected && account.address) {
          // If it's a new address or first connection, try auto-login
          // But ONLY if we're on the landing page
          if ((!previousAddress || account.address !== previousAddress) && window.location.pathname === '/') {
            try {
              const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ walletAddress: account.address }),
                credentials: 'include',
              });

              if (response.ok) {
                const data = await response.json();
                console.log('Auto-logged in as:', data.user.username);
                
                // Pre-populate the auth cache to prevent loading state
                queryClient.setQueryData(['/api/auth/me'], data);
                
                // Navigate to dashboard (no page reload)
                setLocation('/app');
              } else {
                // User not registered, stay on current page
                console.log('No account found for this wallet');
              }
            } catch (loginError) {
              console.log('Auto-login failed:', loginError);
            }
          }
        }
      },
    });

    return () => unwatch();
  }, [address, isConnected]);

  const handleConnect = async () => {
    try {
      setIsConnecting(true);
      // Open Reown AppKit modal for wallet connection
      await modal.open();
    } catch (error) {
      console.error("Failed to open wallet modal:", error);
      throw error;
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    try {
      await disconnect(wagmiConfig);
      setAddress(undefined);
      setIsConnected(false);

      // Logout from session
      try {
        await fetch('/api/auth/logout', {
          method: 'POST',
          credentials: 'include',
        });
        // Reload to update auth state
        window.location.reload();
      } catch (logoutError) {
        console.error('Failed to logout:', logoutError);
      }
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

export function useWallet() {
  const context = useContext(WalletContext);
  if (!context) {
    throw new Error("useWallet must be used within WalletProvider");
  }
  return context;
}
