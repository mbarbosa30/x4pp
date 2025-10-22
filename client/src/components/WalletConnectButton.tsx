import { Button } from "@/components/ui/button";
import { Wallet, Check, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useWallet } from "@/providers/WalletProvider";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function WalletConnectButton() {
  const { address, isConnected, isConnecting, connect, disconnect } = useWallet();
  const { toast } = useToast();

  const handleConnect = async () => {
    try {
      await connect();
      toast({
        title: "Wallet connected",
        description: "Connected to Celo network",
      });
    } catch (error: any) {
      toast({
        title: "Connection failed",
        description: error.message || "Failed to connect wallet",
        variant: "destructive",
      });
    }
  };

  const handleDisconnect = async () => {
    try {
      await disconnect();
      toast({
        title: "Wallet disconnected",
        description: "You can reconnect anytime",
      });
    } catch (error: any) {
      toast({
        title: "Disconnection failed",
        description: error.message || "Failed to disconnect wallet",
        variant: "destructive",
      });
    }
  };

  if (isConnecting) {
    return (
      <Button
        variant="outline"
        size="default"
        disabled
        data-testid="button-wallet-connecting"
      >
        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
        Connecting...
      </Button>
    );
  }

  if (isConnected && address) {
    const shortAddress = `${address.slice(0, 6)}...${address.slice(-4)}`;
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="default" data-testid="button-wallet-connected">
            <div className="flex items-center gap-2">
              <Check className="h-4 w-4" />
              <span className="font-mono text-sm">{shortAddress}</span>
            </div>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={handleDisconnect} data-testid="button-disconnect">
            Disconnect
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  return (
    <Button
      variant="default"
      size="default"
      onClick={handleConnect}
      data-testid="button-connect-wallet"
    >
      <Wallet className="h-4 w-4 mr-2" />
      Connect Wallet
    </Button>
  );
}
