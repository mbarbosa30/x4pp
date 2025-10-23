import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Save, DollarSign, Shield, Info } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";

interface UserSettings {
  minBasePrice: string;
  slaHours: number;
  walletAddress: string;
  tokenId: string;
}

export default function SettingsPanel() {
  const [minBasePrice, setMinBasePrice] = useState(0.10);
  const [slaHours, setSlaHours] = useState(24);
  const [walletAddress, setWalletAddress] = useState("");
  const { toast } = useToast();
  const { user, isAuthenticated } = useAuth();

  const currentUsername = user?.username;

  // Load current user settings from backend
  const { data: settings, isLoading } = useQuery<UserSettings>({
    queryKey: ['/api/settings', currentUsername],
    enabled: !!currentUsername,
  });

  // Populate form fields when settings are loaded
  useEffect(() => {
    if (settings) {
      setMinBasePrice(parseFloat(settings.minBasePrice) || 0.10);
      setSlaHours(settings.slaHours || 24);
      setWalletAddress(settings.walletAddress || "");
    }
  }, [settings]);

  const saveMutation = useMutation({
    mutationFn: async (settings: Partial<UserSettings>) => {
      const response = await apiRequest("PUT", `/api/settings/${currentUsername}`, settings);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/settings', currentUsername] });
      toast({
        title: "Settings saved",
        description: "Your preferences have been updated",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to save settings",
        variant: "destructive",
      });
    },
  });

  const handleSave = () => {
    saveMutation.mutate({
      minBasePrice: minBasePrice.toString(),
      slaHours,
      walletAddress,
      tokenId: settings?.tokenId || "",
    });
  };

  if (!isAuthenticated || !user) {
    return (
      <Card className="p-6">
        <div className="text-center py-8 text-muted-foreground">
          Please log in to view settings
        </div>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card className="p-6">
        <div className="text-center py-8 text-muted-foreground">
          Loading settings...
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-4 sm:p-6">
      <div className="space-y-8">
        {/* Info banner */}
        <Card className="p-4 bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
          <div className="flex gap-3">
            <Info className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
            <div className="text-sm">
              <div className="font-semibold mb-1">How pricing works</div>
              <div className="text-xs text-muted-foreground">
                Your minimum bid sets the floor. Senders can bid any amount above it. Higher bids appear more attractive in your inbox. You manually accept or decline each bid.
              </div>
            </div>
          </div>
        </Card>

        <div>
          <h3 className="text-base sm:text-lg font-semibold mb-4">Open Bidding Configuration</h3>
          <div className="space-y-6">
            <div>
              <Label htmlFor="min-base-price" className="text-sm">Minimum Bid (USDC)</Label>
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 mt-2">
                <Input
                  id="min-base-price"
                  type="number"
                  step="0.01"
                  min="0.01"
                  max="5.00"
                  value={minBasePrice}
                  onChange={(e) => setMinBasePrice(parseFloat(e.target.value) || 0.01)}
                  className="max-w-32"
                  data-testid="input-min-base-price"
                />
                <span className="text-xs sm:text-sm text-muted-foreground">
                  Lowest bid you'll accept (senders can bid higher)
                </span>
              </div>
            </div>

            <div>
              <Label htmlFor="sla-hours" className="text-sm">Response SLA (hours)</Label>
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 mt-2">
                <Input
                  id="sla-hours"
                  type="number"
                  min="1"
                  max="168"
                  value={slaHours}
                  onChange={(e) => setSlaHours(parseInt(e.target.value) || 24)}
                  className="max-w-32"
                  data-testid="input-sla-hours"
                />
                <span className="text-xs sm:text-sm text-muted-foreground">
                  Bids expire after this time if not accepted
                </span>
              </div>
            </div>

            <Card className="p-4 bg-price/5 border-price/20">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Minimum bid</span>
                <div className="flex items-center gap-1">
                  <DollarSign className="h-4 w-4 text-price" />
                  <span className="text-2xl font-bold tabular-nums text-price" data-testid="text-current-rate">
                    {minBasePrice.toFixed(2)}
                  </span>
                  <span className="text-sm text-muted-foreground ml-1">USDC</span>
                </div>
              </div>
            </Card>
          </div>
        </div>

        <div>
          <div className="flex items-center gap-2 mb-4">
            <Shield className="h-5 w-5 text-success" />
            <h3 className="text-lg font-semibold">Payment Wallet</h3>
          </div>
          <div>
            <Label htmlFor="wallet">Celo Wallet Address</Label>
            <Input
              id="wallet"
              type="text"
              placeholder="0x..."
              value={walletAddress}
              onChange={(e) => setWalletAddress(e.target.value)}
              className="mt-2 font-mono text-sm"
              data-testid="input-wallet-address"
            />
            <div className="text-xs text-muted-foreground mt-2 p-2 bg-success/5 rounded border border-success/20">
              <Shield className="h-3 w-3 inline mr-1" />
              Payments settle here via EIP-3009 when you accept bids. Senders' funds stay in their wallets until you accept.
            </div>
          </div>
        </div>

        <Button 
          onClick={handleSave} 
          className="w-full" 
          size="lg" 
          data-testid="button-save-settings"
          disabled={saveMutation.isPending}
        >
          <Save className="h-4 w-4 mr-2" />
          {saveMutation.isPending ? "Saving..." : "Save Settings"}
        </Button>
      </div>
    </Card>
  );
}
