import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { getAccount, watchAccount, disconnect } from '@wagmi/core';
import { wagmiConfig, modal } from "@/lib/reown-config";

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

        // Handle account switch - logout if a different account is connected
        if (account.isConnected && previousAddress && account.address !== previousAddress) {
          try {
            await fetch('/api/auth/logout', {
              method: 'POST',
              credentials: 'include',
            });
            console.log('Logged out due to account switch');
          } catch (logoutError) {
            console.error('Failed to logout on account switch:', logoutError);
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
