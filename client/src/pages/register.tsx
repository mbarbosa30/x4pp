import { useLocation } from "wouter";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useWallet } from "@/providers/WalletProvider";
import { Wallet, User, DollarSign, Clock } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

const registrationFormSchema = z.object({
  username: z.string()
    .min(3, "Username must be at least 3 characters")
    .max(30, "Username must be at most 30 characters")
    .regex(/^[a-z0-9_]+$/, "Username can only contain lowercase letters, numbers, and underscores"),
  displayName: z.string()
    .min(1, "Display name is required")
    .max(100, "Display name must be at most 100 characters"),
  basePrice: z.number()
    .min(0.01, "Base price must be at least $0.01")
    .max(100, "Base price must be at most $100"),
  surgeAlpha: z.number()
    .min(0, "Surge multiplier cannot be negative")
    .max(10, "Surge multiplier must be at most 10"),
  humanDiscountPct: z.number()
    .min(0, "Discount cannot be negative")
    .max(1, "Discount cannot exceed 100%"),
  slotsPerWindow: z.number()
    .int("Slots must be a whole number")
    .min(1, "Must have at least 1 slot")
    .max(100, "Maximum 100 slots per window"),
  timeWindow: z.enum(["hour", "day", "week", "month"]),
  slaHours: z.number()
    .int("SLA hours must be a whole number")
    .min(1, "SLA must be at least 1 hour")
    .max(720, "SLA must be at most 720 hours"),
});

type RegistrationFormValues = z.infer<typeof registrationFormSchema>;

export default function Register() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { address: walletAddress, isConnected, connect } = useWallet();
  
  const form = useForm<RegistrationFormValues>({
    resolver: zodResolver(registrationFormSchema),
    defaultValues: {
      username: "",
      displayName: "",
      basePrice: 0.10,
      surgeAlpha: 1.20,
      humanDiscountPct: 0.85,
      slotsPerWindow: 10,
      timeWindow: "day",
      slaHours: 48,
    },
  });

  const registerMutation = useMutation({
    mutationFn: async (data: RegistrationFormValues & { walletAddress: string }) => {
      const response = await apiRequest("POST", "/api/users", {
        ...data,
        basePrice: data.basePrice.toFixed(2),
        surgeAlpha: data.surgeAlpha.toFixed(2),
        humanDiscountPct: data.humanDiscountPct.toFixed(2),
      });
      return await response.json();
    },
    onSuccess: (data: any) => {
      toast({
        title: "Account created!",
        description: `Welcome @${data.user.username}! Your shareable link: ${data.user.shareableLink}`,
      });
      setTimeout(() => setLocation("/app"), 1500);
    },
    onError: (error: any) => {
      toast({
        title: "Registration failed",
        description: error.message || "Please try again",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: RegistrationFormValues) => {
    if (!isConnected || !walletAddress) {
      toast({
        title: "Wallet not connected",
        description: "Please connect your wallet to receive payments",
        variant: "destructive",
      });
      return;
    }

    registerMutation.mutate({ ...data, walletAddress });
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-2xl space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold">Create Your Account</h1>
          <p className="text-muted-foreground">
            Set up your x4pp profile to start monetizing your inbox
          </p>
        </div>

        <Card className="p-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {/* Wallet Connection */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Wallet className="h-4 w-4" />
                  Payment Wallet
                </Label>
                {!isConnected ? (
                  <Button type="button" onClick={connect} className="w-full" data-testid="button-connect-wallet">
                    Connect Celo Wallet
                  </Button>
                ) : (
                  <div className="flex items-center gap-2">
                    <div className="flex-1 font-mono text-sm bg-muted p-3 rounded border" data-testid="text-connected-wallet">
                      {walletAddress}
                    </div>
                    <Button variant="outline" size="sm" disabled>
                      Connected
                    </Button>
                  </div>
                )}
                <p className="text-xs text-muted-foreground">
                  This is where you'll receive USDC payments on Celo mainnet
                </p>
              </div>

              {/* Basic Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="username"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        <User className="h-4 w-4" />
                        Username
                      </FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          data-testid="input-username"
                          placeholder="yourname"
                          onChange={(e) => field.onChange(e.target.value.toLowerCase())}
                        />
                      </FormControl>
                      <FormDescription>
                        Your shareable link: /@{field.value || "yourname"}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="displayName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Display Name</FormLabel>
                      <FormControl>
                        <Input {...field} data-testid="input-display-name" placeholder="Your Name" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Pricing Configuration */}
              <div className="space-y-4 border-t pt-4">
                <h3 className="font-semibold flex items-center gap-2">
                  <DollarSign className="h-4 w-4" />
                  Pricing Configuration
                </h3>

                <FormField
                  control={form.control}
                  name="basePrice"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Base Price: ${field.value.toFixed(2)} USDC
                      </FormLabel>
                      <FormControl>
                        <Slider
                          min={0.01}
                          max={5.00}
                          step={0.01}
                          value={[field.value]}
                          onValueChange={([value]) => field.onChange(value)}
                          data-testid="slider-base-price"
                        />
                      </FormControl>
                      <FormDescription>
                        Minimum cost to send you a message
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="humanDiscountPct"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Human Discount: {Math.round(field.value * 100)}% off
                      </FormLabel>
                      <FormControl>
                        <Slider
                          min={0}
                          max={1}
                          step={0.05}
                          value={[field.value]}
                          onValueChange={([value]) => field.onChange(value)}
                          data-testid="slider-human-discount"
                        />
                      </FormControl>
                      <FormDescription>
                        Verified humans pay less
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="slotsPerWindow"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Slots per {form.watch("timeWindow")}</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            {...field}
                            data-testid="input-slots"
                            onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="timeWindow"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Time Window</FormLabel>
                        <Select value={field.value} onValueChange={field.onChange}>
                          <FormControl>
                            <SelectTrigger data-testid="select-time-window">
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="hour">Hour</SelectItem>
                            <SelectItem value="day">Day</SelectItem>
                            <SelectItem value="week">Week</SelectItem>
                            <SelectItem value="month">Month</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="slaHours"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        SLA (Auto-refund if not opened): {field.value} hours
                      </FormLabel>
                      <FormControl>
                        <Slider
                          min={1}
                          max={168}
                          step={1}
                          value={[field.value]}
                          onValueChange={([value]) => field.onChange(value)}
                          data-testid="slider-sla-hours"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <Button
                type="submit"
                disabled={registerMutation.isPending || !isConnected}
                className="w-full"
                size="lg"
                data-testid="button-register"
              >
                {registerMutation.isPending ? "Creating Account..." : "Create Account"}
              </Button>
            </form>
          </Form>
        </Card>

        <p className="text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <a href="/app" className="text-primary hover:underline">
            Go to App
          </a>
        </p>
      </div>
    </div>
  );
}
