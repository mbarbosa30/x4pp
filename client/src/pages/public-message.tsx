import { useRoute, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Mail, DollarSign, Loader2, Shield, CheckCircle } from "lucide-react";
import ThemeToggle from "@/components/ThemeToggle";
import ComposeMessage from "@/components/ComposeMessage";
import { PLATFORM_DEFAULT_MIN_BID } from "@shared/constants";

type ProfileData = {
  username: string | null;
  walletAddress: string;
  displayName?: string;
  minBasePrice: string;
  isPublic: boolean;
  isRegistered?: boolean;
};

export default function PublicMessage() {
  const [, params] = useRoute("/:identifier");
  
  // Get identifier from route (can be username or wallet address)
  const identifier = params?.identifier || "";

  // Fetch profile data
  const { data: profile, isLoading } = useQuery<ProfileData>({
    queryKey: ["/api/profile", identifier],
    enabled: !!identifier,
  });

  const isWalletAddress = identifier.startsWith('0x') && identifier.length === 42;
  const minBid = profile ? parseFloat(profile.minBasePrice) : (isWalletAddress ? PLATFORM_DEFAULT_MIN_BID : 0.05);
  const displayName = profile?.displayName || profile?.username || (isWalletAddress ? `${identifier.slice(0, 6)}...${identifier.slice(-4)}` : identifier);
  const isRegistered = profile?.isRegistered !== false;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" data-testid="loader-profile" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/">
            <div className="flex items-center gap-2 cursor-pointer hover-elevate active-elevate-2 px-2 py-1 rounded-md">
              <Mail className="h-6 w-6 text-primary" />
              <span className="text-lg md:text-xl font-semibold">x4pp</span>
            </div>
          </Link>
          <ThemeToggle />
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8 md:py-16">
        <div className="max-w-2xl mx-auto space-y-8">
          {/* User Profile */}
          <div className="text-center space-y-4">
            <Avatar className="h-20 w-20 md:h-24 md:w-24 mx-auto">
              <AvatarFallback className="bg-primary/10 text-primary font-semibold text-2xl md:text-3xl">
                {displayName.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold mb-2" data-testid="text-username">
                {displayName}
              </h1>
              {profile?.username && (
                <p className="text-muted-foreground">@{profile.username}</p>
              )}
              {!isRegistered && isWalletAddress && (
                <Badge variant="outline" className="mt-2">Unregistered Wallet</Badge>
              )}
            </div>
          </div>

          {/* Pricing Info */}
          <Card className="p-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Minimum bid</span>
              </div>
              <div className="flex items-baseline gap-2">
                <DollarSign className="h-5 w-5 text-primary" />
                <span className="text-4xl font-bold tabular-nums" data-testid="text-min-bid">
                  {minBid.toFixed(2)}
                </span>
                <span className="text-muted-foreground">USDC</span>
              </div>
              <div className="text-xs text-muted-foreground pt-2 border-t">
                {!isRegistered 
                  ? "Platform default minimum bid for unregistered wallets"
                  : "Set your bid amount to increase your chances of acceptance"
                }
              </div>
            </div>
          </Card>

          {/* Message Composition Form */}
          <ComposeMessage 
            isVerified={false}
            initialRecipient={identifier}
          />

          {/* Info Footer */}
          <div className="text-center text-xs text-muted-foreground space-y-1 pb-8">
            <p>✓ Funds stay in your wallet until recipient accepts</p>
            <p>✓ Automatic refund if message expires</p>
            <p>✓ All payments in USDC on Celo</p>
          </div>
        </div>
      </main>
    </div>
  );
}
