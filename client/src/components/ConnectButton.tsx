import { useAppKitAccount, useAppKit } from '@reown/appkit/react';
import { Button } from '@/components/ui/button';
import { Wallet } from 'lucide-react';

export function ConnectButton() {
  const { isConnected, address } = useAppKitAccount();
  const { open } = useAppKit();

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
          onClick={() => open()}
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
      onClick={() => open()}
    >
      <Wallet className="h-4 w-4 mr-2" />
      Connect
    </Button>
  );
}
