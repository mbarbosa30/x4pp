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
        setAddress(account.address);
        setIsConnected(account.isConnected);

        // If wallet just connected (not just changed), attempt auto-login
        if (account.isConnected && account.address && !previousAddress) {
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
              // Force a page refresh to update auth state
              window.location.reload();
            }
          } catch (loginError) {
            // Silent fail - user is not registered yet
            console.log('No existing account for this wallet');
          }
        }
      },
    });

    return () => unwatch();
  }, [address]);

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
