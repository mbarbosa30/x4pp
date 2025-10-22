import { useEffect, useRef } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Mail, 
  Shield, 
  DollarSign, 
  TrendingUp, 
  Check, 
  ArrowRight,
  Users,
  Clock,
  Wallet
} from "lucide-react";
import { SiGithub } from "react-icons/si";
import ThemeToggle from "@/components/ThemeToggle";
import { useWallet } from "@/providers/WalletProvider";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

export default function Landing() {
  const { address: walletAddress, isConnected, connect, disconnect } = useWallet();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const hasCheckedRef = useRef(false);

  const checkProfileMutation = useMutation({
    mutationFn: async (address: string) => {
      console.log("Attempting login with address:", address);
      const response = await apiRequest("POST", "/api/auth/login", { walletAddress: address });
      const data = await response.json();
      console.log("Login response:", data);
      return data;
    },
    onSuccess: (data) => {
      console.log("Login successful, redirecting to /app");
      // User has a profile, redirect to dashboard
      window.location.href = "/app";
    },
    onError: (error: any) => {
      console.log("Login failed, redirecting to /register. Error:", error);
      // User doesn't have a profile, redirect to registration
      toast({
        title: "No account found",
        description: "Let's create your profile",
      });
      setLocation("/register");
    },
  });

  // Auto-check profile when wallet connects
  useEffect(() => {
    if (isConnected && walletAddress && !hasCheckedRef.current) {
      hasCheckedRef.current = true;
      checkProfileMutation.mutate(walletAddress);
    }
  }, [isConnected, walletAddress]);

  const handleConnect = async () => {
    if (!isConnected) {
      try {
        await connect();
      } catch (error) {
        toast({
          title: "Connection failed",
          description: "Failed to connect wallet",
          variant: "destructive",
        });
      }
    }
  };

  const handleDisconnect = async () => {
    try {
      hasCheckedRef.current = false;
      await disconnect();
      toast({
        title: "Wallet disconnected",
        description: "Your wallet has been disconnected",
      });
    } catch (error) {
      toast({
        title: "Disconnect failed",
        description: "Failed to disconnect wallet",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Mail className="h-6 w-6 text-primary" />
            <span className="text-xl font-semibold">x4pp</span>
          </div>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            {isConnected ? (
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground hidden sm:inline">
                  {walletAddress?.slice(0, 6)}...{walletAddress?.slice(-4)}
                </span>
                <Button 
                  variant="outline" 
                  size="sm"
                  data-testid="button-disconnect"
                  onClick={handleDisconnect}
                  disabled={checkProfileMutation.isPending}
                >
                  Disconnect
                </Button>
              </div>
            ) : (
              <Button 
                variant="outline" 
                data-testid="button-connect"
                onClick={handleConnect}
              >
                <Wallet className="h-4 w-4 mr-2" />
                Connect
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-16 md:py-24">
        <div className="max-w-4xl mx-auto text-center space-y-6">
          <Badge variant="outline" className="mb-4">
            No Spam • Just Messages That Matter
          </Badge>
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight">
            Get paid to read messages
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            A messaging app where your time has value. Set your price, and only read messages you choose to accept.
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-6">
            <Link href="/register">
              <Button size="lg" data-testid="button-register">
                Start Getting Paid
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </Link>
            <Link href="/app">
              <Button size="lg" variant="outline" data-testid="button-send-message">
                <Mail className="h-4 w-4 mr-2" />
                Send a Message
              </Button>
            </Link>
          </div>

          <p className="text-sm text-muted-foreground">
            Register to monetize your inbox • Or reach someone directly
          </p>
        </div>
      </section>

      {/* Features Grid */}
      <section className="container mx-auto px-4 py-16 md:py-24 bg-muted/30">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              How it works
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              A spam-free inbox where quality messages get through
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <Card className="p-6 space-y-4">
              <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                <Mail className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-xl font-semibold">Send your message</h3>
              <p className="text-muted-foreground">
                See what others are paying and send your message with a fair offer. Your money stays in your wallet.
              </p>
            </Card>

            <Card className="p-6 space-y-4">
              <div className="h-12 w-12 rounded-lg bg-success/10 flex items-center justify-center">
                <Shield className="h-6 w-6 text-success" />
              </div>
              <h3 className="text-xl font-semibold">Choose what to read</h3>
              <p className="text-muted-foreground">
                Review incoming messages and accept the ones worth your time. Full control over your attention.
              </p>
            </Card>

            <Card className="p-6 space-y-4">
              <div className="h-12 w-12 rounded-lg bg-price/10 flex items-center justify-center">
                <DollarSign className="h-6 w-6 text-price" />
              </div>
              <h3 className="text-xl font-semibold">Get paid instantly</h3>
              <p className="text-muted-foreground">
                When you accept, payment transfers automatically. When you decline, the sender keeps their money.
              </p>
            </Card>
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="container mx-auto px-4 py-16 md:py-24">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
              <h2 className="text-3xl md:text-4xl font-bold">
                Your inbox, your rules
              </h2>
              <div className="space-y-4">
                <div className="flex gap-3">
                  <Check className="h-5 w-5 text-success mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-medium">No more spam</p>
                    <p className="text-sm text-muted-foreground">
                      Only see messages from people willing to pay your rate
                    </p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <Check className="h-5 w-5 text-success mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-medium">Choose what to read</p>
                    <p className="text-sm text-muted-foreground">
                      Review each message and accept only the ones worth your time
                    </p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <Check className="h-5 w-5 text-success mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-medium">Earn from your attention</p>
                    <p className="text-sm text-muted-foreground">
                      Get paid in USDC for every message you accept
                    </p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <Check className="h-5 w-5 text-success mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-medium">Share your link</p>
                    <p className="text-sm text-muted-foreground">
                      Like Calendly, but for getting paid to read
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <Card className="p-8 bg-gradient-to-br from-primary/5 to-success/5">
              <div className="space-y-4">
                <div className="flex items-center justify-between pb-4 border-b">
                  <span className="text-sm text-muted-foreground">Your shareable link</span>
                  <Badge variant="outline">Active</Badge>
                </div>
                <div className="font-mono text-sm text-primary bg-background p-3 rounded border">
                  x4pp.app/@yourname
                </div>
                <div className="space-y-3 pt-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Minimum price</span>
                    <span className="font-semibold">$0.05 USDC</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Response time</span>
                    <span className="font-semibold">24 hours</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Messages accepted</span>
                    <span className="font-semibold">42 this month</span>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-4 py-16 md:py-24 bg-primary/5">
        <div className="max-w-3xl mx-auto text-center space-y-6">
          <h2 className="text-3xl md:text-4xl font-bold">
            Ready to get started?
          </h2>
          <p className="text-lg text-muted-foreground">
            Start monetizing your inbox or send a message that actually gets read
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <Link href="/register">
              <Button size="lg" data-testid="button-cta-register">
                <Wallet className="h-4 w-4 mr-2" />
                Register Account
              </Button>
            </Link>
            <Link href="/app">
              <Button size="lg" variant="outline" data-testid="button-cta-send">
                <Mail className="h-4 w-4 mr-2" />
                Send a Message
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-8">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Mail className="h-5 w-5 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">
                © 2025 x4pp. Built on Celo.
              </span>
            </div>
            <div className="flex items-center gap-6 text-sm text-muted-foreground">
              <a href="#" className="hover:text-foreground">About</a>
              <a href="#" className="hover:text-foreground">Privacy</a>
              <a href="#" className="hover:text-foreground">Terms</a>
              <a 
                href="https://github.com/mbarbosa30/x4pp" 
                target="_blank" 
                rel="noopener noreferrer"
                className="hover:text-foreground"
                data-testid="link-github"
              >
                <SiGithub className="h-4 w-4" />
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
