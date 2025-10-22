import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { getAccount, watchAccount, connect, disconnect, ConnectorNotFoundError } from '@wagmi/core';
import { wagmiConfig } from "@/lib/wagmi-config";
import { injected } from '@wagmi/connectors';

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
      onChange(account) {
        setAddress(account.address);
        setIsConnected(account.isConnected);
      },
    });

    return () => unwatch();
  }, []);

  const handleConnect = async () => {
    try {
      setIsConnecting(true);
      const result = await connect(wagmiConfig, {
        connector: injected(),
      });
      setAddress(result.accounts[0]);
      setIsConnected(true);
    } catch (error) {
      console.error("Failed to connect wallet:", error);
      if (error instanceof ConnectorNotFoundError) {
        throw new Error("No wallet extension found. Please install MetaMask or another Web3 wallet.");
      }
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
