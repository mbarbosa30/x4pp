import { createContext, useContext, useState, useEffect, useRef, ReactNode } from "react";
import { getAccount, watchAccount, disconnect } from '@wagmi/core';
import { wagmiConfig, modal } from "@/lib/reown-config";
import { queryClient } from "@/lib/queryClient";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";

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
  const { toast } = useToast();

  useEffect(() => {
    // Initialize account state
    const account = getAccount(wagmiConfig);
    console.log('WalletProvider: Initial account state', { 
      address: account.address, 
      isConnected: account.isConnected 
    });
    setAddress(account.address);
    setIsConnected(account.isConnected);
    
    // If already connected on mount, trigger auto-login
    if (account.isConnected && account.address) {
      console.log('WalletProvider: Already connected on mount, attempting auto-login');
      fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ walletAddress: account.address }),
        credentials: 'include',
      }).then(async response => {
        if (response.ok) {
          const data = await response.json();
          console.log('Auto-logged in on mount as:', data.user.username);
          queryClient.setQueryData(['/api/auth/me'], data);
          
          if (window.location.pathname === '/') {
            setLocation('/app');
          }
        } else {
          console.log('No account found for connected wallet on mount');
        }
      }).catch(err => {
        console.error('Auto-login on mount failed:', err);
      });
    }

    // Watch for account changes
    const unwatch = watchAccount(wagmiConfig, {
      async onChange(account) {
        const previousAddress = address;
        const previousConnected = isConnected;
        
        console.log('WalletProvider: Account changed', {
          from: { address: previousAddress, connected: previousConnected },
          to: { address: account.address, connected: account.isConnected }
        });
        
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
          if (!previousAddress || account.address !== previousAddress) {
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
                
                // If on landing page, navigate to dashboard
                if (window.location.pathname === '/') {
                  setLocation('/app');
                }
                // Otherwise stay on current page (e.g., /send)
              } else {
                // User not registered
                console.log('No account found for this wallet');
                
                // Only redirect to register if on landing page or protected pages
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
                // If on public pages like /send, just stay there
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
      // Disconnect wallet first
      await disconnect(wagmiConfig);
      
      // Then logout from session and clean up
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
      });
      
      // Clear React Query cache
      queryClient.clear();
      
      // Update local state
      setAddress(undefined);
      setIsConnected(false);
      
      // Navigate to home
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

export function useWallet() {
  const context = useContext(WalletContext);
  if (!context) {
    throw new Error("useWallet must be used within WalletProvider");
  }
  return context;
}
