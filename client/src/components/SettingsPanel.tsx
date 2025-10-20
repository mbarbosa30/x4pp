import { useState } from "react";
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

export default function SettingsPanel() {
  const [basePrice, setBasePrice] = useState(0.02);
  const [surgeMultiplier, setSurgeMultiplier] = useState(2);
  const [slotsPerWindow, setSlotsPerWindow] = useState(5);
  const [timeWindow, setTimeWindow] = useState("hour");
  const { toast } = useToast();

  const handleSave = () => {
    console.log("Saving settings:", {
      basePrice,
      surgeMultiplier,
      slotsPerWindow,
      timeWindow,
    });

    toast({
      title: "Settings saved",
      description: "Your preferences have been updated",
    });
  };

  const currentPrice = basePrice * surgeMultiplier;

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
              <Label htmlFor="surge">Surge Multiplier: {surgeMultiplier}x</Label>
              <div className="mt-3">
                <Slider
                  id="surge"
                  min={1}
                  max={10}
                  step={0.5}
                  value={[surgeMultiplier]}
                  onValueChange={(value) => setSurgeMultiplier(value[0])}
                  className="mb-2"
                  data-testid="slider-surge"
                />
                <p className="text-xs text-muted-foreground">
                  Price increases when your inbox is busy
                </p>
              </div>
            </div>

            <Card className="p-4 bg-price/5 border-price/20">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Current rate</span>
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

            <p className="text-sm text-muted-foreground">
              Only the top {slotsPerWindow} highest-paying messages will reach your inbox
            </p>
          </div>
        </div>

        <Button onClick={handleSave} className="w-full" size="lg" data-testid="button-save-settings">
          <Save className="h-4 w-4 mr-2" />
          Save Settings
        </Button>
      </div>
    </Card>
  );
}
