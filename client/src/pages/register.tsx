import { useEffect } from "react";
import { useLocation } from "wouter";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { useWallet } from "@/providers/WalletProvider";
import { Wallet, User, DollarSign, Clock, Coins, Eye, EyeOff } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";

const registrationFormSchema = z.object({
  username: z.string()
    .min(3, "Username must be at least 3 characters")
    .max(30, "Username must be at most 30 characters")
    .regex(/^[a-z0-9_]+$/, "Username can only contain lowercase letters, numbers, and underscores"),
  displayName: z.string()
    .min(1, "Display name is required")
    .max(100, "Display name must be at most 100 characters"),
  tokenId: z.string().min(1, "Please select a payment token"),
  isPublic: z.boolean(),
  minBasePrice: z.number()
    .min(0.01, "Minimum bid must be at least $0.01")
    .max(100, "Minimum bid must be at most $100"),
  slaHours: z.number()
    .int("SLA hours must be a whole number")
    .min(1, "SLA must be at least 1 hour")
    .max(720, "SLA must be at most 720 hours"),
});

type RegistrationFormValues = z.infer<typeof registrationFormSchema>;

interface Token {
  id: string;
  symbol: string;
  name: string;
  address: string;
  decimals: number;
  chainId: number;
  isActive: boolean;
}

export default function Register() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { address: walletAddress, isConnected, connect, disconnect } = useWallet();
  
  const { data: tokens = [], isLoading: tokensLoading } = useQuery<Token[]>({
    queryKey: ['/api/tokens'],
  });

  const activeTokens = tokens.filter((token) => token.isActive);
  
  // Find default USDC token ID
  const defaultTokenId = activeTokens.find((t) => t.symbol === "USDC")?.id || activeTokens[0]?.id || "";
  
  const form = useForm<RegistrationFormValues>({
    resolver: zodResolver(registrationFormSchema),
    defaultValues: {
      username: "",
      displayName: "",
      tokenId: defaultTokenId,
      isPublic: true,
      minBasePrice: 0.10,
      slaHours: 24,
    },
  });

  // Update tokenId when tokens load
  useEffect(() => {
    if (defaultTokenId && !form.getValues("tokenId")) {
      form.setValue("tokenId", defaultTokenId);
    }
  }, [defaultTokenId, form]);

  const registerMutation = useMutation({
    mutationFn: async (data: RegistrationFormValues & { walletAddress: string }) => {
      const response = await apiRequest("POST", "/api/users", data);
      return await response.json();
    },
    onSuccess: async (data: any) => {
      console.log("Registration successful, user:", data.user.username);
      
      toast({
        title: "Account created!",
        description: `Welcome @${data.user.username}!`,
      });
      
      // Wait a bit for session to be fully persisted
      await new Promise(resolve => setTimeout(resolve, 500));
      
      console.log("Redirecting to /app");
      
      // Use full page reload to ensure session cookie is picked up
      window.location.href = "/app";
    },
    onError: (error: any) => {
      console.error("Registration failed:", error);
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
                    <Button 
                      type="button"
                      variant="outline" 
                      size="sm" 
                      onClick={disconnect}
                      data-testid="button-disconnect-wallet"
                    >
                      Disconnect
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

              {/* Token Selection & Privacy */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="tokenId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        <Coins className="h-4 w-4" />
                        Payment Token
                      </FormLabel>
                      <Select 
                        value={field.value} 
                        onValueChange={field.onChange}
                        disabled={tokensLoading || activeTokens.length === 0}
                      >
                        <FormControl>
                          <SelectTrigger data-testid="select-token">
                            <SelectValue placeholder="Select token" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {activeTokens.map((token) => (
                            <SelectItem key={token.id} value={token.id}>
                              {token.symbol} - {token.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        Which token you accept for payments
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="isPublic"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="flex items-center gap-2">
                          {field.value ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                          Public Profile
                        </FormLabel>
                        <FormDescription>
                          Allow anyone to send you messages
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          data-testid="switch-public-profile"
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>

              {/* Pricing Configuration */}
              <div className="space-y-4 border-t pt-4">
                <h3 className="font-semibold flex items-center gap-2">
                  <DollarSign className="h-4 w-4" />
                  Open Bidding Settings
                </h3>

                <FormField
                  control={form.control}
                  name="minBasePrice"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Minimum Bid: ${field.value.toFixed(2)} USDC
                      </FormLabel>
                      <FormControl>
                        <Slider
                          min={0.01}
                          max={5.00}
                          step={0.01}
                          value={[field.value]}
                          onValueChange={([value]) => field.onChange(value)}
                          data-testid="slider-min-base-price"
                        />
                      </FormControl>
                      <FormDescription>
                        Lowest bid you'll accept. Senders can bid higher.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="slaHours"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        Response SLA: {field.value} hours
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
                      <FormDescription>
                        Bids expire after this time if not accepted
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <Button
                type="submit"
                disabled={registerMutation.isPending || !isConnected || tokensLoading || !defaultTokenId}
                className="w-full"
                size="lg"
                data-testid="button-register"
              >
                {tokensLoading ? "Loading..." : registerMutation.isPending ? "Creating Account..." : "Create Account"}
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
