import { Link, useLocation } from "wouter";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Mail, 
  Shield, 
  DollarSign, 
  Check, 
  ArrowRight,
  Clock,
  Wallet,
  LogIn,
  Zap,
  Lock
} from "lucide-react";
import ThemeToggle from "@/components/ThemeToggle";
import { ConnectButton } from "@/components/ConnectButton";
import { useWallet } from "@/providers/WalletProvider";

export default function Landing() {
  const { isConnected, address, login } = useWallet();
  const [, setLocation] = useLocation();
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  
  const { data: currentUser } = useQuery({
    queryKey: ['/api/auth/me'],
    enabled: isConnected,
  });

  useEffect(() => {
    if (isConnected && currentUser) {
      setLocation('/app');
    }
  }, [isConnected, currentUser, setLocation]);

  const handleGoToDashboard = async () => {
    if (!isConnected || !address) return;
    
    setIsLoggingIn(true);
    try {
      await login();
      setTimeout(() => {
        setLocation('/app');
      }, 500);
    } catch (error) {
      console.error('Login failed:', error);
      setIsLoggingIn(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b backdrop-blur-lg bg-background/95">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Mail className="h-6 w-6 text-primary" />
            <span className="text-xl font-semibold">x4pp</span>
          </div>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <ConnectButton />
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-20 md:py-32">
        <div className="max-w-4xl mx-auto text-center space-y-6">
          <Badge variant="outline" className="text-xs sm:text-sm">
            P2P Messaging Attention Market
          </Badge>
          
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight">
            Get paid for your attention
          </h1>
          
          <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto">
            Set your price. Senders bid in USDC. You decide which messages are worth your time.
          </p>
          
          <div className="flex items-center justify-center gap-2 text-xs sm:text-sm text-muted-foreground">
            <Shield className="h-3 w-3 sm:h-4 sm:w-4" />
            <span>EIP-3009 deferred authorization • Powered by x402</span>
          </div>
          
          {isConnected ? (
            <div className="flex flex-col items-center justify-center gap-3 pt-4">
              <Button 
                size="lg" 
                data-testid="button-go-to-dashboard"
                onClick={handleGoToDashboard}
                disabled={isLoggingIn}
              >
                {isLoggingIn ? 'Loading...' : 'Open Your Inbox'}
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
              <p className="text-sm text-muted-foreground">
                Or <Link href="/send"><span className="text-primary hover:underline cursor-pointer">send a message</span></Link> to any wallet
              </p>
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4">
              <Link href="/register">
                <Button size="lg" data-testid="button-register">
                  Open Your Inbox
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </Link>
              <Link href="/send">
                <Button size="lg" variant="outline" data-testid="button-send-message">
                  <Mail className="h-4 w-4 mr-2" />
                  Send a Message
                </Button>
              </Link>
            </div>
          )}
        </div>
      </section>

      {/* Value Props */}
      <section className="container mx-auto px-4 py-16 md:py-20 bg-muted/30">
        <div className="max-w-5xl mx-auto">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="p-6 space-y-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Mail className="h-5 w-5 text-primary" />
              </div>
              <h3 className="font-semibold">Simple URL</h3>
              <p className="text-sm text-muted-foreground">
                Share x4pp.app/@you to receive paid DMs from anyone
              </p>
            </Card>

            <Card className="p-6 space-y-3">
              <div className="h-10 w-10 rounded-lg bg-success/10 flex items-center justify-center">
                <Lock className="h-5 w-5 text-success" />
              </div>
              <h3 className="font-semibold">No escrow drama</h3>
              <p className="text-sm text-muted-foreground">
                Money stays with the sender until you open
              </p>
            </Card>

            <Card className="p-6 space-y-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <DollarSign className="h-5 w-5 text-primary" />
              </div>
              <h3 className="font-semibold">Open bidding</h3>
              <p className="text-sm text-muted-foreground">
                Senders pick their price; you decide what's worth opening
              </p>
            </Card>

            <Card className="p-6 space-y-3">
              <div className="h-10 w-10 rounded-lg bg-success/10 flex items-center justify-center">
                <Wallet className="h-5 w-5 text-success" />
              </div>
              <h3 className="font-semibold">Any wallet, no signup</h3>
              <p className="text-sm text-muted-foreground">
                Message any Celo address—even if they haven't claimed an inbox yet
              </p>
            </Card>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="container mx-auto px-4 py-16 md:py-20">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">
            How it works
          </h2>
          
          <div className="grid md:grid-cols-2 gap-8 md:gap-12">
            {/* For Receivers */}
            <div className="space-y-6">
              <Badge className="mb-2">For receivers</Badge>
              
              <div className="space-y-4">
                <div className="flex gap-3">
                  <div className="flex-shrink-0 w-7 h-7 rounded-full bg-success/20 text-success flex items-center justify-center font-semibold text-sm">
                    1
                  </div>
                  <div>
                    <p className="text-sm">Claim your inbox with your wallet</p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <div className="flex-shrink-0 w-7 h-7 rounded-full bg-success/20 text-success flex items-center justify-center font-semibold text-sm">
                    2
                  </div>
                  <div>
                    <p className="text-sm">Set a minimum price</p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <div className="flex-shrink-0 w-7 h-7 rounded-full bg-success/20 text-success flex items-center justify-center font-semibold text-sm">
                    3
                  </div>
                  <div>
                    <p className="text-sm">Open bids you like → instant USDC; ignore the rest and they expire</p>
                  </div>
                </div>
              </div>
            </div>

            {/* For Senders */}
            <div className="space-y-6">
              <Badge variant="outline" className="mb-2">For senders</Badge>
              
              <div className="space-y-4">
                <div className="flex gap-3">
                  <div className="flex-shrink-0 w-7 h-7 rounded-full bg-primary/20 text-primary flex items-center justify-center font-semibold text-sm">
                    1
                  </div>
                  <div>
                    <p className="text-sm">Pick a username or wallet address</p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <div className="flex-shrink-0 w-7 h-7 rounded-full bg-primary/20 text-primary flex items-center justify-center font-semibold text-sm">
                    2
                  </div>
                  <div>
                    <p className="text-sm">See a price guide and place your bid</p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <div className="flex-shrink-0 w-7 h-7 rounded-full bg-primary/20 text-primary flex items-center justify-center font-semibold text-sm">
                    3
                  </div>
                  <div>
                    <p className="text-sm">Sign a gasless authorization; if they open in time, USDC transfers</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Tech Note */}
      <section className="container mx-auto px-4 py-16 md:py-20 bg-muted/30">
        <div className="max-w-3xl mx-auto">
          <Card className="p-6 md:p-8">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Shield className="h-5 w-5 text-primary" />
              </div>
              <div className="space-y-3">
                <h3 className="font-semibold text-lg">Under the hood</h3>
                <p className="text-sm text-muted-foreground">
                  Runs on Celo + USDC with EIP-3009 "sign-to-authorize" payments and a facilitator that settles only when you open. No funds move until you say so.
                </p>
                <div className="flex flex-wrap gap-2 pt-2">
                  <Badge variant="outline" className="text-xs">Celo</Badge>
                  <Badge variant="outline" className="text-xs">USDC</Badge>
                  <Badge variant="outline" className="text-xs">EIP-3009</Badge>
                  <Badge variant="outline" className="text-xs">x402 Protocol</Badge>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </section>

      {/* Who It's For */}
      <section className="container mx-auto px-4 py-16 md:py-20">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">
            Who it's for
          </h2>
          
          <div className="grid sm:grid-cols-2 gap-4">
            <Card className="p-5 space-y-2">
              <h3 className="font-semibold flex items-center gap-2">
                <Check className="h-4 w-4 text-success" />
                Celebrities & influencers
              </h3>
              <p className="text-sm text-muted-foreground">
                Filter noise, keep only what's valuable
              </p>
            </Card>

            <Card className="p-5 space-y-2">
              <h3 className="font-semibold flex items-center gap-2">
                <Check className="h-4 w-4 text-success" />
                CEOs & operators
              </h3>
              <p className="text-sm text-muted-foreground">
                Prioritize real opportunities over cold spam
              </p>
            </Card>

            <Card className="p-5 space-y-2">
              <h3 className="font-semibold flex items-center gap-2">
                <Check className="h-4 w-4 text-success" />
                Creators & consultants
              </h3>
              <p className="text-sm text-muted-foreground">
                Turn inbound requests into paid time
              </p>
            </Card>

            <Card className="p-5 space-y-2">
              <h3 className="font-semibold flex items-center gap-2">
                <Check className="h-4 w-4 text-success" />
                Communities & DAOs
              </h3>
              <p className="text-sm text-muted-foreground">
                Gate attention fairly without KYC
              </p>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-4 py-16 md:py-20 bg-gradient-to-br from-primary/10 to-success/10">
        <div className="max-w-3xl mx-auto text-center space-y-6">
          <h2 className="text-3xl md:text-4xl font-bold">
            Ready to get started?
          </h2>
          <p className="text-lg text-muted-foreground">
            Monetize your inbox or send a message that actually gets read
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4">
            <Link href="/register">
              <Button size="lg" data-testid="button-cta-register">
                Open Your Inbox
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </Link>
            <Link href="/send">
              <Button size="lg" variant="outline" data-testid="button-cta-send">
                <Mail className="h-4 w-4 mr-2" />
                Send a Message
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t">
        <div className="container mx-auto px-4 py-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-primary" />
              <span className="font-semibold text-foreground">x4pp</span>
            </div>
            <div className="text-center sm:text-right">
              <p>Powered by Celo • EIP-3009 • x402 Protocol</p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
