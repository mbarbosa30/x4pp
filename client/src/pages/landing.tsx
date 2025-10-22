import { Link } from "wouter";
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

export default function Landing() {

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
            <Link href="/app">
              <Button variant="outline" data-testid="button-login">
                Sign In
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-16 md:py-24">
        <div className="max-w-4xl mx-auto text-center space-y-6">
          <Badge variant="outline" className="mb-4">
            This inbox stays human
          </Badge>
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight">
            Get paid for your attention
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            A peer-to-peer messaging app where senders bid for your time. 
            Set your minimum price, accept the bids you want, and receive USDC directly.
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-6">
            <Link href="/register">
              <Button size="lg" data-testid="button-register">
                Register to Receive
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
            Register to receive paid messages • Or send a message to someone directly
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
              Three simple steps to protect your attention and earn from messages
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <Card className="p-6 space-y-4">
              <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-xl font-semibold">Place your bid</h3>
              <p className="text-muted-foreground">
                See what others are bidding (P25/median/P75) and choose your offer. No locked funds—just sign an authorization.
              </p>
            </Card>

            <Card className="p-6 space-y-4">
              <div className="h-12 w-12 rounded-lg bg-success/10 flex items-center justify-center">
                <Users className="h-6 w-6 text-success" />
              </div>
              <h3 className="text-xl font-semibold">Receiver decides</h3>
              <p className="text-muted-foreground">
                Recipients see all pending bids and manually accept or decline each one. Full control over their inbox.
              </p>
            </Card>

            <Card className="p-6 space-y-4">
              <div className="h-12 w-12 rounded-lg bg-price/10 flex items-center justify-center">
                <Wallet className="h-6 w-6 text-price" />
              </div>
              <h3 className="text-xl font-semibold">Instant settlement</h3>
              <p className="text-muted-foreground">
                On accept, USDC transfers on-chain. On decline or expiry, your funds never left your wallet.
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
                    <p className="font-medium">Set your minimum base price</p>
                    <p className="text-sm text-muted-foreground">
                      The lowest bid you'll accept, starting from $0.01
                    </p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <Check className="h-5 w-5 text-success mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-medium">Accept or decline each bid</p>
                    <p className="text-sm text-muted-foreground">
                      Full control—choose which messages to read
                    </p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <Check className="h-5 w-5 text-success mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-medium">Set your response SLA</p>
                    <p className="text-sm text-muted-foreground">
                      Bids expire if you don't respond within your timeframe
                    </p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <Check className="h-5 w-5 text-success mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-medium">Share your link</p>
                    <p className="text-sm text-muted-foreground">
                      Like Calendly, but for paid messages
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <Card className="p-8 bg-gradient-to-br from-primary/5 to-success/5">
              <div className="space-y-4">
                <div className="flex items-center justify-between pb-4 border-b">
                  <span className="text-sm text-muted-foreground">Your shareable link</span>
                  <Badge variant="outline">Premium</Badge>
                </div>
                <div className="font-mono text-sm text-primary bg-background p-3 rounded border">
                  x4pp.app/@yourname
                </div>
                <div className="space-y-3 pt-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Base price</span>
                    <span className="font-semibold">$0.05 USDC</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Surge multiplier</span>
                    <span className="font-semibold">2.5x</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Slots per hour</span>
                    <span className="font-semibold">5 messages</span>
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
            Register to monetize your attention or send a paid message to someone
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
