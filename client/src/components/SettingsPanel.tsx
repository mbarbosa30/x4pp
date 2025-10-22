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
import { Save, DollarSign } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";

interface UserSettings {
  basePrice: string;
  surgeAlpha: string;
  surgeK: string;
  humanDiscountPct: string;
  slotsPerWindow: number;
  timeWindow: string;
  slaHours: number;
  walletAddress: string;
}

export default function SettingsPanel() {
  const [basePrice, setBasePrice] = useState(0.02);
  const [surgeAlpha, setSurgeAlpha] = useState(0.5);
  const [surgeK, setSurgeK] = useState(5);
  const [humanDiscountPct, setHumanDiscountPct] = useState(80);
  const [slotsPerWindow, setSlotsPerWindow] = useState(5);
  const [timeWindow, setTimeWindow] = useState("hour");
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
      setBasePrice(parseFloat(settings.basePrice) || 0.02);
      setSurgeAlpha(parseFloat(settings.surgeAlpha) || 0.5);
      setSurgeK(parseFloat(settings.surgeK) || 5);
      setHumanDiscountPct(parseFloat(settings.humanDiscountPct) || 80);
      setSlotsPerWindow(settings.slotsPerWindow || 5);
      setTimeWindow(settings.timeWindow || "hour");
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
      basePrice: basePrice.toString(),
      surgeAlpha: surgeAlpha.toString(),
      surgeK: surgeK.toString(),
      humanDiscountPct: humanDiscountPct.toString(),
      slotsPerWindow,
      timeWindow,
      slaHours,
      walletAddress,
    });
  };

  const currentPrice = basePrice;

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
    <Card className="p-6">
      <div className="space-y-8">
        <div>
          <h3 className="text-lg font-semibold mb-4">Pricing Configuration</h3>
          <div className="space-y-6">
            <div>
              <Label htmlFor="base-price">Base Price (USDC)</Label>
              <div className="flex items-center gap-3 mt-2">
                <Input
                  id="base-price"
                  type="number"
                  step="0.01"
                  min="0.01"
                  max="5.00"
                  value={basePrice}
                  onChange={(e) => setBasePrice(parseFloat(e.target.value) || 0.01)}
                  className="max-w-32"
                  data-testid="input-base-price"
                />
                <span className="text-sm text-muted-foreground">
                  Minimum price to send you a message
                </span>
              </div>
            </div>

            <div>
              <Label htmlFor="surge-alpha">Surge Sensitivity: {surgeAlpha.toFixed(1)}</Label>
              <div className="mt-3">
                <Slider
                  id="surge-alpha"
                  min={0}
                  max={1}
                  step={0.1}
                  value={[surgeAlpha]}
                  onValueChange={(value) => setSurgeAlpha(value[0])}
                  className="mb-2"
                  data-testid="slider-surge-alpha"
                />
                <p className="text-xs text-muted-foreground">
                  How aggressively price increases with demand
                </p>
              </div>
            </div>

            <div>
              <Label htmlFor="surge-k">Surge Threshold: {surgeK}</Label>
              <div className="mt-3">
                <Slider
                  id="surge-k"
                  min={1}
                  max={20}
                  step={1}
                  value={[surgeK]}
                  onValueChange={(value) => setSurgeK(value[0])}
                  className="mb-2"
                  data-testid="slider-surge-k"
                />
                <p className="text-xs text-muted-foreground">
                  Queue messages before surge pricing kicks in
                </p>
              </div>
            </div>

            <div>
              <Label htmlFor="human-discount">Human Discount: {humanDiscountPct}%</Label>
              <div className="mt-3">
                <Slider
                  id="human-discount"
                  min={0}
                  max={100}
                  step={5}
                  value={[humanDiscountPct]}
                  onValueChange={(value) => setHumanDiscountPct(value[0])}
                  className="mb-2"
                  data-testid="slider-human-discount"
                />
                <p className="text-xs text-muted-foreground">
                  Discount for verified humans (via Self Protocol)
                </p>
              </div>
            </div>

            <Card className="p-4 bg-price/5 border-price/20">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Base rate</span>
                <div className="flex items-center gap-1">
                  <DollarSign className="h-4 w-4 text-price" />
                  <span className="text-2xl font-bold tabular-nums text-price" data-testid="text-current-rate">
                    {currentPrice.toFixed(2)}
                  </span>
                  <span className="text-sm text-muted-foreground ml-1">USDC</span>
                </div>
              </div>
            </Card>
          </div>
        </div>

        <div>
          <h3 className="text-lg font-semibold mb-4">Attention Slots</h3>
          <div className="space-y-4">
            <div>
              <Label htmlFor="slots">Number of slots</Label>
              <Input
                id="slots"
                type="number"
                min="1"
                max="20"
                value={slotsPerWindow}
                onChange={(e) => setSlotsPerWindow(parseInt(e.target.value) || 1)}
                className="max-w-32 mt-2"
                data-testid="input-slots"
              />
            </div>

            <div>
              <Label htmlFor="time-window">Time window</Label>
              <Select value={timeWindow} onValueChange={setTimeWindow}>
                <SelectTrigger className="max-w-48 mt-2" id="time-window" data-testid="select-time-window">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="hour">Per hour</SelectItem>
                  <SelectItem value="day">Per day</SelectItem>
                  <SelectItem value="week">Per week</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="sla-hours">SLA Hours</Label>
              <Input
                id="sla-hours"
                type="number"
                min="1"
                max="168"
                value={slaHours}
                onChange={(e) => setSlaHours(parseInt(e.target.value) || 24)}
                className="max-w-32 mt-2"
                data-testid="input-sla-hours"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Hours before unopened messages get auto-refunded
              </p>
            </div>

            <p className="text-sm text-muted-foreground">
              Only the top {slotsPerWindow} highest-paying messages will reach your inbox
            </p>
          </div>
        </div>

        <div>
          <h3 className="text-lg font-semibold mb-4">Payment Wallet</h3>
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
            <p className="text-xs text-muted-foreground mt-1">
              Where you'll receive USDC payments
            </p>
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
