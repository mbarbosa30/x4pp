import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Wallet, Check } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function WalletConnectButton() {
  const [connected, setConnected] = useState(false);
  const [address, setAddress] = useState("");

  const connectWallet = (walletType: string) => {
    console.log(`Connecting to ${walletType}...`);
    // TODO: Implement actual wallet connection
    setTimeout(() => {
      setConnected(true);
      setAddress("0x742d...a8C4");
    }, 500);
  };

  const disconnect = () => {
    console.log("Disconnecting wallet...");
    setConnected(false);
    setAddress("");
  };

  if (connected) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="default" data-testid="button-wallet-connected">
            <div className="flex items-center gap-2">
              <Wallet className="h-4 w-4" />
              <span className="font-mono text-sm">{address}</span>
            </div>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={disconnect} data-testid="button-disconnect">
            Disconnect
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="default" size="default" data-testid="button-connect-wallet">
          <Wallet className="h-4 w-4 mr-2" />
          Connect Wallet
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => connectWallet("MetaMask")} data-testid="button-metamask">
          MetaMask
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => connectWallet("WalletConnect")} data-testid="button-walletconnect">
          WalletConnect
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => connectWallet("Coinbase Wallet")} data-testid="button-coinbase">
          Coinbase Wallet
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
