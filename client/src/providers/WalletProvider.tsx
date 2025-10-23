import { createContext, useContext, useEffect, ReactNode } from "react";
import { WagmiProvider } from 'wagmi';
import { useAppKitAccount } from '@reown/appkit/react';
import { disconnect } from '@wagmi/core';
import { wagmiAdapter } from "@/lib/reown-config";
import { queryClient } from "@/lib/queryClient";
import { useLocation } from "wouter";

interface WalletContextType {
  address: string | undefined;
  isConnected: boolean;
}

const WalletContext = createContext<WalletContextType | null>(null);

function WalletProviderInner({ children }: { children: ReactNode }) {
  const { address, isConnected } = useAppKitAccount();
  const [, setLocation] = useLocation();

  // Auto-login when wallet connects
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

  return (
    <WalletContext.Provider
      value={{
        address,
        isConnected,
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

export async function disconnectWallet() {
  await disconnect(wagmiAdapter.wagmiConfig);
  await fetch('/api/auth/logout', { method: 'POST' });
  queryClient.setQueryData(['/api/auth/me'], null);
  queryClient.clear();
}
