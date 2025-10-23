import { Button } from '@/components/ui/button';
import { Wallet, LogIn } from 'lucide-react';
import { useWallet } from '@/providers/WalletProvider';
import { useLocation } from 'wouter';
import { useQuery } from '@tanstack/react-query';

export function ConnectButton() {
  const { isConnected, address, connect, disconnect, login } = useWallet();
  const [, setLocation] = useLocation();
  const { data: currentUser } = useQuery({ queryKey: ['/api/auth/me'], enabled: isConnected });

  const handleDisconnect = async () => {
    console.log('[ConnectButton] Disconnecting...');
    await disconnect();
    setLocation('/');
  };

  // If wallet connected but not logged in - show login button
  if (isConnected && address && !currentUser) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground hidden sm:inline">
          {address.slice(0, 6)}...{address.slice(-4)}
        </span>
        <Button 
          variant="default" 
          size="sm"
          data-testid="button-login"
          onClick={login}
        >
          <LogIn className="h-4 w-4 mr-2" />
          Login
        </Button>
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

  // If logged in - show disconnect
  if (isConnected && address && currentUser) {
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

  // Not connected - show connect button
  return (
    <Button 
      variant="outline" 
      data-testid="button-connect"
      onClick={connect}
    >
      <Wallet className="h-4 w-4 mr-2" />
      Connect
    </Button>
  );
}
