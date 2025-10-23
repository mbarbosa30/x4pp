import { Button } from '@/components/ui/button';
import { Wallet } from 'lucide-react';
import { useWallet } from '@/providers/WalletProvider';
import { useLocation } from 'wouter';

export function ConnectButton() {
  const { isConnected, address, connect, disconnect } = useWallet();
  const [, setLocation] = useLocation();

  const handleDisconnect = async () => {
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
      onClick={() => connect()}
    >
      <Wallet className="h-4 w-4 mr-2" />
      Connect
    </Button>
  );
}
