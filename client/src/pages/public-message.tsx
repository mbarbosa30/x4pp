import { useState } from "react";
import { useRoute } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Mail, DollarSign, Send, Loader2 } from "lucide-react";
import ThemeToggle from "@/components/ThemeToggle";
import { useAccount } from "wagmi";
import { useToast } from "@/hooks/use-toast";

type ProfileData = {
  username: string | null;
  walletAddress: string;
  minBasePrice: string;
  isPublic: boolean;
};

export default function PublicMessage() {
  const [, params] = useRoute("/@:identifier");
  const identifier = params?.identifier || "";
  const { address } = useAccount();
  const { toast } = useToast();
  
  const [senderName, setSenderName] = useState("");
  const [senderEmail, setSenderEmail] = useState("");
  const [message, setMessage] = useState("");
  const [bidAmount, setBidAmount] = useState("");

  // Fetch profile data
  const { data: profile, isLoading } = useQuery<ProfileData>({
    queryKey: ["/api/profile", identifier],
    enabled: !!identifier,
  });

  const isWalletAddress = identifier.startsWith('0x') && identifier.length === 42;
  const minBid = profile ? parseFloat(profile.minBasePrice) : (isWalletAddress ? 0.10 : 0.05);
  const displayName = profile?.username || (isWalletAddress ? `${identifier.slice(0, 6)}...${identifier.slice(-4)}` : identifier);

  const handleSend = async () => {
    if (!senderName || !message) {
      toast({
        title: "Missing information",
        description: "Please fill in your name and message",
        variant: "destructive",
      });
      return;
    }

    if (!address) {
      toast({
        title: "Wallet not connected",
        description: "Please connect your wallet to send a message",
        variant: "destructive",
      });
      return;
    }

    const bid = bidAmount ? parseFloat(bidAmount) : minBid;
    if (isNaN(bid) || bid < minBid) {
      toast({
        title: "Invalid bid",
        description: `Bid must be at least $${minBid.toFixed(2)}`,
        variant: "destructive",
      });
      return;
    }

    // TODO: Implement actual message sending with payment
    toast({
      title: "Feature in progress",
      description: "Message sending will be implemented soon",
    });
  };

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
          <div className="flex items-center gap-2">
            <Mail className="h-6 w-6 text-primary" />
            <span className="text-lg md:text-xl font-semibold">x4pp</span>
          </div>
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
              {!profile && isWalletAddress && (
                <Badge variant="outline" className="mt-2">Unregistered Wallet</Badge>
              )}
            </div>
            <p className="text-muted-foreground max-w-md mx-auto">
              Send a message with an open bid. The recipient will review and accept or decline your message.
            </p>
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
                Set your bid amount to increase your chances of acceptance
              </div>
            </div>
          </Card>

          {/* Message Form */}
          <Card className="p-6">
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">Your name</Label>
                  <Input
                    id="name"
                    placeholder="John Doe"
                    value={senderName}
                    onChange={(e) => setSenderName(e.target.value)}
                    className="mt-2"
                    data-testid="input-sender-name"
                  />
                </div>
                <div>
                  <Label htmlFor="email">Email (optional)</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="john@example.com"
                    value={senderEmail}
                    onChange={(e) => setSenderEmail(e.target.value)}
                    className="mt-2"
                    data-testid="input-sender-email"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="bid">Your bid (USDC)</Label>
                <Input
                  id="bid"
                  type="number"
                  lang="en-US"
                  step="0.01"
                  min={minBid}
                  placeholder={`Minimum ${minBid.toFixed(2)}`}
                  value={bidAmount}
                  onChange={(e) => setBidAmount(e.target.value)}
                  className="mt-2"
                  data-testid="input-bid-amount"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Minimum: ${minBid.toFixed(2)} USDC
                </p>
              </div>

              <div>
                <Label htmlFor="message">Your message</Label>
                <Textarea
                  id="message"
                  placeholder="What would you like to say?"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="mt-2 min-h-40"
                  data-testid="input-message"
                />
                <div className="flex justify-end mt-2">
                  <span className="text-xs text-muted-foreground">
                    {message.length} characters
                  </span>
                </div>
              </div>

              <Button 
                onClick={handleSend} 
                className="w-full"
                size="lg"
                disabled={!address}
                data-testid="button-send-message"
              >
                <Send className="h-4 w-4 mr-2" />
                {address ? "Send Message" : "Connect Wallet to Send"}
              </Button>

              <div className="text-center text-xs text-muted-foreground space-y-1">
                <p>✓ Funds stay in your wallet until recipient accepts</p>
                <p>✓ Automatic refund if message expires</p>
                <p>✓ All payments in USDC on Celo</p>
              </div>
            </div>
          </Card>
        </div>
      </main>
    </div>
  );
}
