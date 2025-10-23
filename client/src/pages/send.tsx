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
              Place a bid in USDC. Funds stay in your wallet until they accept.
            </p>
          </div>

          {/* Compose Form */}
          <ComposeMessage 
            isVerified={false}
            initialRecipient={recipientParam}
          />

        </div>
      </main>
    </div>
  );
}
