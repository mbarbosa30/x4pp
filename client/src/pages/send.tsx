import { useEffect, useState } from "react";
import { useLocation, Link } from "wouter";
import { Mail, Shield, CheckCircle } from "lucide-react";
import ComposeMessage from "@/components/ComposeMessage";
import ThemeToggle from "@/components/ThemeToggle";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";

export default function Send() {
  const [, setLocation] = useLocation();
  const { isAuthenticated, isLoading } = useAuth();
  const [recipientParam, setRecipientParam] = useState<string | null>(null);

  // Check for 'to' parameter in URL (e.g., /send?to=alice or /send?to=0x...)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const to = params.get('to');
    if (to) {
      setRecipientParam(to);
    }
  }, []);

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
          <div className="flex items-center gap-2">
            {isAuthenticated && !isLoading && (
              <Button 
                variant="outline" 
                onClick={() => setLocation('/app')}
                data-testid="button-dashboard"
              >
                Dashboard
              </Button>
            )}
            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8 md:py-16">
        <div className="max-w-2xl mx-auto space-y-6">
          {/* Header */}
          <div className="text-center space-y-2">
            <h1 className="text-3xl md:text-4xl font-bold" data-testid="text-page-title">
              Send a Message
            </h1>
            <p className="text-muted-foreground">
              Connect your wallet and send a message to any username or wallet address
            </p>
          </div>
          
          {/* How it works */}
          <Card className="p-4 sm:p-6 bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-primary" />
                <h2 className="font-semibold">How sending works</h2>
              </div>
              <div className="grid sm:grid-cols-3 gap-3 text-sm">
                <div className="flex gap-2">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-primary font-semibold text-xs">1</div>
                  <div>
                    <div className="font-medium">Sign authorization</div>
                    <div className="text-xs text-muted-foreground">EIP-3009 payment signature—no USDC leaves your wallet yet</div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-primary font-semibold text-xs">2</div>
                  <div>
                    <div className="font-medium">Receiver reviews</div>
                    <div className="text-xs text-muted-foreground">They decide to accept or decline your bid</div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-primary font-semibold text-xs">3</div>
                  <div>
                    <div className="font-medium">Settle or expire</div>
                    <div className="text-xs text-muted-foreground">Payment processes if accepted, auth expires if ignored</div>
                  </div>
                </div>
              </div>
            </div>
          </Card>

          {/* Compose Form */}
          <ComposeMessage 
            isVerified={false}
            initialRecipient={recipientParam}
          />

          {/* Info Footer */}
          <div className="text-center text-sm text-muted-foreground pt-4">
            <p>
              Recipients set their own minimum bid price. Your payment is held until they accept.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
