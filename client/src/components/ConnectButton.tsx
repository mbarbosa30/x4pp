import { Button } from '@/components/ui/button';
import { Wallet } from 'lucide-react';
import { useWallet } from '@/providers/WalletProvider';
import { useLocation } from 'wouter';
import { useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';

export function ConnectButton() {
  const { isConnected, address, connect, disconnect, login } = useWallet();
  const [, setLocation] = useLocation();
  const { data: currentUser } = useQuery({ queryKey: ['/api/auth/me'], enabled: isConnected });
  const hasManuallyDisconnected = useRef(false);

  // Auto-login when wallet connects (only if we haven't manually disconnected)
  useEffect(() => {
    if (isConnected && address && !currentUser && !hasManuallyDisconnected.current) {
      console.log('[ConnectButton] Wallet connected, logging in...');
      login();
    }
  }, [isConnected, address, currentUser, login]);

  const handleConnect = async () => {
    // Reset flag when user manually clicks connect
    hasManuallyDisconnected.current = false;
    await connect();
  };

  const handleDisconnect = async () => {
    console.log('[ConnectButton] User clicked disconnect');
    hasManuallyDisconnected.current = true;
    await disconnect();
    setLocation('/');
  };

  if (isConnected && address) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground hidden sm:inline">
          {address.slice(0, 6)}...{address.slice(-4)}
        </span>
        <Button 
          variant="outline" 
          size="sm"
          data-testid="button-disconnect"
          onClick={handleDisconnect}
        >
          Disconnect
        </Button>
      </div>
    );
  }

  return (
    <Button 
      variant="outline" 
      data-testid="button-connect"
      onClick={handleConnect}
    >
      <Wallet className="h-4 w-4 mr-2" />
      Connect
    </Button>
  );
}
