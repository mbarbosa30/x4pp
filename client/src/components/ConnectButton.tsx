import { Button } from '@/components/ui/button';
import { Wallet } from 'lucide-react';
import { useWallet } from '@/providers/WalletProvider';

export function ConnectButton() {
  const { isConnected, address, connect, disconnect, isConnecting } = useWallet();

  const handleConnect = async () => {
    console.log('[ConnectButton] Connect clicked');
    try {
      await connect();
      console.log('[ConnectButton] Connect completed');
    } catch (error) {
      console.error('[ConnectButton] Connect failed:', error);
    }
  };

  const handleDisconnect = async () => {
    console.log('[ConnectButton] Disconnect clicked');
    await disconnect();
  };

  if (isConnected && address) {
    console.log('[ConnectButton] Rendering connected state, address:', address);
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
      disabled={isConnecting}
    >
      <Wallet className="h-4 w-4 mr-2" />
      {isConnecting ? 'Connecting...' : 'Connect'}
    </Button>
  );
}
