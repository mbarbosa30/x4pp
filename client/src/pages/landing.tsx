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
  TrendingUp, 
  Check, 
  ArrowRight,
  Users,
  Clock,
  Wallet,
  LogIn,
  Zap,
  Lock,
  Eye,
  ChevronDown
} from "lucide-react";
import { SiGithub } from "react-icons/si";
import ThemeToggle from "@/components/ThemeToggle";
import { ConnectButton } from "@/components/ConnectButton";
import { useWallet } from "@/providers/WalletProvider";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

export default function Landing() {
  const { isConnected, address, login } = useWallet();
  const [, setLocation] = useLocation();
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  
  // Check if user is already registered
  const { data: currentUser } = useQuery({
    queryKey: ['/api/auth/me'],
    enabled: isConnected,
  });

  // Auto-redirect registered users to app
  useEffect(() => {
    if (isConnected && currentUser) {
      console.log('[Landing] User connected and registered, redirecting to app');
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
      <section className="container mx-auto px-4 py-16 md:py-24">
        <div className="max-w-5xl mx-auto text-center space-y-8">
          <Badge variant="outline" className="mb-4 text-sm">
            Powered by Celo USDC • EIP-3009 • x402 Protocol
          </Badge>
          
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight">
            Get paid for your attention
          </h1>
          
          <p className="text-xl md:text-2xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
            x4pp is a peer-to-peer DM inbox where senders bid to message you in USDC on Celo. 
            Money only moves if you open before the deadline—powered by <span className="text-foreground font-medium">EIP-3009 deferred authorization</span> and our <span className="text-foreground font-medium">Self-x402 Facilitator</span>.
          </p>

          <div className="flex items-center justify-center gap-2 text-sm text-success">
            <Shield className="h-4 w-4" />
            <span className="font-medium">No escrow. No subscription. Funds stay with the sender until you open.</span>
          </div>
          
          {isConnected ? (
            <div className="flex flex-col items-center justify-center gap-4 pt-6">
              <Button 
                size="lg" 
                data-testid="button-go-to-dashboard"
                onClick={handleGoToDashboard}
                disabled={isLoggingIn}
              >
                <LogIn className="h-4 w-4 mr-2" />
                {isLoggingIn ? 'Loading...' : 'Open Your Inbox'}
              </Button>
              <p className="text-sm text-muted-foreground">
                Or <Link href="/send"><span className="text-primary hover:underline cursor-pointer">send a message</span></Link> to any wallet
              </p>
            </div>
          ) : (
            <>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-6">
                <Link href="/register">
                  <Button size="lg" data-testid="button-register">
                    <Wallet className="h-4 w-4 mr-2" />
                    Open Your Inbox
                  </Button>
                </Link>
                <Link href="/send">
                  <Button size="lg" variant="outline" data-testid="button-send-message">
                    <Mail className="h-4 w-4 mr-2" />
                    Send a Message
                  </Button>
                </Link>
              </div>

              <p className="text-sm text-muted-foreground">
                Register to monetize your inbox • Or reach any wallet directly
              </p>
            </>
          )}
        </div>
      </section>

      {/* Two Audiences Section */}
      <section className="container mx-auto px-4 py-16 md:py-24 bg-muted/30">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-2 gap-12">
            {/* For Receivers */}
            <div className="space-y-6">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-success/10 text-success text-sm font-medium">
                <DollarSign className="h-4 w-4" />
                For Receivers
              </div>
              
              <h2 className="text-3xl font-bold">Monetize your inbox</h2>
              
              <div className="space-y-4">
                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-success/10 text-success flex items-center justify-center font-bold">
                    1
                  </div>
                  <div>
                    <h3 className="font-semibold mb-1">Set your minimum price</h3>
                    <p className="text-sm text-muted-foreground">
                      Configure your base rate in USDC. Senders see live price guidance to submit competitive bids.
                    </p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-success/10 text-success flex items-center justify-center font-bold">
                    2
                  </div>
                  <div>
                    <h3 className="font-semibold mb-1">Review your queue of open bids</h3>
                    <p className="text-sm text-muted-foreground">
                      See pending messages sorted by amount, sender reputation, and time remaining.
                    </p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-success/10 text-success flex items-center justify-center font-bold">
                    3
                  </div>
                  <div>
                    <h3 className="font-semibold mb-1">Open to accept, or ignore to let expire</h3>
                    <p className="text-sm text-muted-foreground">
                      Accept → instant USDC to your wallet via on-chain settlement. Ignore → bid expires, no action needed.
                    </p>
                  </div>
                </div>
              </div>

              <Card className="p-4 bg-gradient-to-br from-success/5 to-success/10 border-success/20">
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Your link</span>
                    <Badge variant="outline" className="text-xs">Active</Badge>
                  </div>
                  <div className="font-mono text-sm text-primary bg-background p-2 rounded border">
                    x4pp.app/@yourname
                  </div>
                  <div className="grid grid-cols-2 gap-2 pt-2 text-xs">
                    <div>
                      <div className="text-muted-foreground">Min price</div>
                      <div className="font-semibold">$0.10 USDC</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">This month</div>
                      <div className="font-semibold">42 accepted</div>
                    </div>
                  </div>
                </div>
              </Card>
            </div>

            {/* For Senders */}
            <div className="space-y-6">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium">
                <Mail className="h-4 w-4" />
                For Senders
              </div>
              
              <h2 className="text-3xl font-bold">Reach anyone, pay only if opened</h2>
              
              <div className="space-y-4">
                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold">
                    1
                  </div>
                  <div>
                    <h3 className="font-semibold mb-1">Choose a recipient and enter your bid</h3>
                    <p className="text-sm text-muted-foreground">
                      Message any wallet address—no prior signup required. See live price guide (min/P25/median/P75).
                    </p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold">
                    2
                  </div>
                  <div>
                    <h3 className="font-semibold mb-1">Sign a gasless EIP-3009 authorization</h3>
                    <p className="text-sm text-muted-foreground">
                      No on-chain transaction. No USDC leaves your wallet. Just a cryptographic signature authorizing future transfer.
                    </p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold">
                    3
                  </div>
                  <div>
                    <h3 className="font-semibold mb-1">Your message sits pending until deadline</h3>
                    <p className="text-sm text-muted-foreground">
                      If receiver opens → USDC transfers on-chain. If not → authorization expires, no refund needed.
                    </p>
                  </div>
                </div>
              </div>

              <Card className="p-4 bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
                <div className="space-y-3">
                  <div className="text-sm font-semibold">Price Guide Example</div>
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Minimum</span>
                      <span className="font-semibold">$0.10</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">P25</span>
                      <span className="font-semibold">$0.15</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Median</span>
                      <span className="font-semibold text-primary">$0.25</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">P75</span>
                      <span className="font-semibold">$0.40</span>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground pt-2">
                    Most bids land between P25–P75 for better acceptance odds
                  </p>
                </div>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* Why Different Section */}
      <section className="container mx-auto px-4 py-16 md:py-24">
        <div className="max-w-6xl mx-auto space-y-12">
          <div className="text-center space-y-4">
            <h2 className="text-3xl md:text-4xl font-bold">
              Why x4pp is different
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Built on innovative blockchain technology for a spam-free, secure messaging experience
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card className="p-6 space-y-4">
              <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-xl font-semibold">Open bidding, not fixed fees</h3>
              <p className="text-muted-foreground">
                Senders pick their price based on live market data. Receivers decide what's worth their time.
              </p>
            </Card>

            <Card className="p-6 space-y-4">
              <div className="h-12 w-12 rounded-lg bg-success/10 flex items-center justify-center">
                <Lock className="h-6 w-6 text-success" />
              </div>
              <h3 className="text-xl font-semibold">No custodial escrow</h3>
              <p className="text-muted-foreground">
                The EIP-3009 authorization itself is the escrow. Funds never leave the sender's wallet until acceptance.
              </p>
            </Card>

            <Card className="p-6 space-y-4">
              <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                <Zap className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-xl font-semibold">Gasless for senders</h3>
              <p className="text-muted-foreground">
                A typed-data signature authorizes USDC transfer. The receiver (or relayer) pays gas on accept.
              </p>
            </Card>

            <Card className="p-6 space-y-4">
              <div className="h-12 w-12 rounded-lg bg-success/10 flex items-center justify-center">
                <Users className="h-6 w-6 text-success" />
              </div>
              <h3 className="text-xl font-semibold">Message any wallet</h3>
              <p className="text-muted-foreground">
                Even if they've never used x4pp. Your bid sits pending; they can claim their inbox later and accept.
              </p>
            </Card>

            <Card className="p-6 space-y-4">
              <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                <Shield className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-xl font-semibold">Privacy-first</h3>
              <p className="text-muted-foreground">
                We don't move funds or expose data unless the receiver opens. Full control over your attention.
              </p>
            </Card>

            <Card className="p-6 space-y-4">
              <div className="h-12 w-12 rounded-lg bg-success/10 flex items-center justify-center">
                <Clock className="h-6 w-6 text-success" />
              </div>
              <h3 className="text-xl font-semibold">Automatic expiry</h3>
              <p className="text-muted-foreground">
                Bids have deadlines. If not accepted in time, the authorization expires—no refund transaction needed.
              </p>
            </Card>
          </div>
        </div>
      </section>

      {/* Under the Hood Section */}
      <section className="container mx-auto px-4 py-16 md:py-24 bg-muted/30">
        <div className="max-w-4xl mx-auto">
          <div className="text-center space-y-4 mb-12">
            <h2 className="text-3xl md:text-4xl font-bold">
              Under the hood
            </h2>
            <p className="text-lg text-muted-foreground">
              Cutting-edge blockchain technology powering the attention market
            </p>
          </div>

          <Card className="p-8 space-y-6">
            <div className="flex flex-wrap gap-3 justify-center">
              <Badge className="text-sm px-4 py-2">Celo Mainnet</Badge>
              <Badge className="text-sm px-4 py-2">USDC</Badge>
              <Badge className="text-sm px-4 py-2">EIP-3009</Badge>
              <Badge className="text-sm px-4 py-2">x402 Protocol</Badge>
            </div>

            <div className="space-y-4 pt-4">
              <div className="flex gap-4">
                <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <DollarSign className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold mb-1">Celo mainnet + USDC (6 decimals)</h3>
                  <p className="text-sm text-muted-foreground">
                    Fast, low-cost stablecoin rails on environmentally-friendly Celo blockchain. Native USDC from Circle.
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-success/10 flex items-center justify-center">
                  <Shield className="h-5 w-5 text-success" />
                </div>
                <div>
                  <h3 className="font-semibold mb-1">EIP-3009 (TransferWithAuthorization)</h3>
                  <p className="text-sm text-muted-foreground">
                    Sender signs a deferred voucher with EIP-712 typed data. We replay it exactly on acceptance—funds never touch our system.
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Zap className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold mb-1">Self-x402 Facilitator</h3>
                  <p className="text-sm text-muted-foreground">
                    Verifies and stores payment authorizations. Settles them only upon acceptance—aligning with the HTTP 402 payment protocol vision.
                  </p>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="container mx-auto px-4 py-16 md:py-24">
        <div className="max-w-3xl mx-auto">
          <div className="text-center space-y-4 mb-12">
            <h2 className="text-3xl md:text-4xl font-bold">
              Frequently asked questions
            </h2>
            <p className="text-lg text-muted-foreground">
              Everything you need to know about how x4pp works
            </p>
          </div>

          <Accordion type="single" collapsible className="space-y-4">
            <AccordionItem value="gas" className="border rounded-lg px-6">
              <AccordionTrigger className="text-left font-semibold hover:no-underline">
                Do I pay gas fees to send a message?
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground">
                No. You sign a typed-data authorization (EIP-712) which is free. Gas is paid on the receiver's accept by a relayer or the receiver themselves. You only need USDC in your wallet for the bid amount.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="expiry" className="border rounded-lg px-6">
              <AccordionTrigger className="text-left font-semibold hover:no-underline">
                What if the receiver never opens my message?
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground">
                Your authorization has a built-in deadline (typically 24-72 hours). If the receiver doesn't accept before the deadline, the authorization expires automatically. No USDC moves, and you don't need to do anything to get a "refund"—the funds never left your wallet.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="any-wallet" className="border rounded-lg px-6">
              <AccordionTrigger className="text-left font-semibold hover:no-underline">
                Can I message someone who hasn't joined x4pp?
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground">
                Yes! You can send to any Celo wallet address. If they haven't joined x4pp yet, your bid sits pending. When they eventually connect their wallet and claim their inbox, they'll see your message and can choose to accept it before the deadline.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="safety" className="border rounded-lg px-6">
              <AccordionTrigger className="text-left font-semibold hover:no-underline">
                Is my money safe while the message is pending?
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground">
                Absolutely. USDC stays in your wallet the entire time. The signed authorization voucher is cryptographically bound to the exact amount, recipient, and deadline—it can only be used as-is and only before expiry. The x4pp facilitator cannot alter or replay it differently.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="abuse" className="border rounded-lg px-6">
              <AccordionTrigger className="text-left font-semibold hover:no-underline">
                What prevents spam and abuse?
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground">
                Multiple safeguards: (1) Only one active bid per sender→recipient pair, (2) Receivers can block senders, (3) Reputation system tracks sender/receiver behavior, (4) Economic barrier—senders must bid real USDC to reach you.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="privacy" className="border rounded-lg px-6">
              <AccordionTrigger className="text-left font-semibold hover:no-underline">
                How is my privacy protected?
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground">
                Message content is encrypted and only visible to the receiver. We don't access your funds or wallet beyond what's needed for authorization verification. On-chain settlement only happens if you choose to accept—otherwise, no trace of the message appears on the blockchain.
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-4 py-16 md:py-24 bg-gradient-to-br from-primary/10 to-success/10">
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
                Open Your Inbox
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
      <footer className="border-t py-12">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto">
            <div className="grid md:grid-cols-3 gap-8 mb-8">
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Mail className="h-5 w-5 text-primary" />
                  <span className="font-semibold">x4pp</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  Peer-to-peer messaging where attention has value. Built on Celo with EIP-3009.
                </p>
              </div>

              <div className="space-y-4">
                <h3 className="font-semibold text-sm">Product</h3>
                <div className="space-y-2 text-sm text-muted-foreground">
                  <div><Link href="/send" className="hover:text-foreground">Send Message</Link></div>
                  <div><Link href="/register" className="hover:text-foreground">Register</Link></div>
                  <div><a href="#" className="hover:text-foreground">How it Works</a></div>
                  <div><a href="#" className="hover:text-foreground">Pricing</a></div>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="font-semibold text-sm">Resources</h3>
                <div className="space-y-2 text-sm text-muted-foreground">
                  <div><a href="#" className="hover:text-foreground">Documentation</a></div>
                  <div><a href="#" className="hover:text-foreground">Privacy Policy</a></div>
                  <div><a href="#" className="hover:text-foreground">Terms of Service</a></div>
                  <div>
                    <a 
                      href="https://github.com/mbarbosa30/x4pp" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="hover:text-foreground inline-flex items-center gap-2"
                      data-testid="link-github"
                    >
                      <SiGithub className="h-4 w-4" />
                      GitHub
                    </a>
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-8 border-t flex flex-col md:flex-row items-center justify-between gap-4">
              <p className="text-sm text-muted-foreground">
                © 2025 x4pp. Built on Celo mainnet.
              </p>
              <div className="flex items-center gap-4">
                <Badge variant="outline" className="text-xs">Celo</Badge>
                <Badge variant="outline" className="text-xs">USDC</Badge>
                <Badge variant="outline" className="text-xs">EIP-3009</Badge>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
