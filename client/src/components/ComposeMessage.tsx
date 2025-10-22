import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Send, Shield, Wallet, TrendingUp } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { useWallet } from "@/providers/WalletProvider";
import { signTransferAuthorization, parseSignature } from "@/lib/eip-3009";

interface ComposeMessageProps {
  isVerified: boolean;
  onSend?: (recipient: string, message: string, replyBounty: number) => void;
}

export default function ComposeMessage({ isVerified, onSend }: ComposeMessageProps) {
  const [recipient, setRecipient] = useState("");
  const [message, setMessage] = useState("");
  const [replyBounty, setReplyBounty] = useState(0);
  const [includeReplyBounty, setIncludeReplyBounty] = useState(false);
  const { toast } = useToast();
  const { address: walletAddress, isConnected, connect } = useWallet();
  
  // x402 payment flow state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [paymentRequirements, setPaymentRequirements] = useState<any>(null);
  const [isPaying, setIsPaying] = useState(false);
  const [quote, setQuote] = useState<{ priceUSD: number; priceUSDC: string; surgeActive: boolean } | null>(null);
  const [originalCommitPayload, setOriginalCommitPayload] = useState<any>(null);
  const [isLoadingQuote, setIsLoadingQuote] = useState(false);

  // Fetch live price quote when recipient changes
  useEffect(() => {
    if (!recipient) {
      setQuote(null);
      return;
    }

    const fetchQuote = async () => {
      setIsLoadingQuote(true);
      try {
        const response = await fetch("/api/quote", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            recipientUsername: recipient,
            senderNullifier: isVerified ? "demo_verified_user_001" : undefined,
          }),
        });

        if (response.ok) {
          const data = await response.json();
          setQuote({
            priceUSD: data.priceUSD,
            priceUSDC: data.priceUSDC,
            surgeActive: data.surgeMultiplier > 1.0,
          });
        } else {
          setQuote(null);
        }
      } catch (error) {
        console.error("Error fetching quote:", error);
        setQuote(null);
      } finally {
        setIsLoadingQuote(false);
      }
    };

    const debounceTimer = setTimeout(fetchQuote, 500);
    return () => clearTimeout(debounceTimer);
  }, [recipient, isVerified]);

  const handleSend = async () => {
    if (!recipient || !message) {
      toast({
        title: "Missing information",
        description: "Please fill in recipient and message",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // Step 1: Generate and persist commit payload (so retry uses same data)
      // Note: In production, senderNullifier should come from Self Protocol verification
      // For MVP demo, use a consistent nullifier pattern
      const commitRequest = {
        recipientUsername: recipient,
        senderNullifier: isVerified ? "demo_verified_user_001" : undefined,
        senderName: "Demo Sender",
        content: message,
        replyBounty: includeReplyBounty ? replyBounty : undefined,
      };

      // Save the payload for potential retry after payment
      setOriginalCommitPayload(commitRequest);

      const response = await fetch("/api/commit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(commitRequest),
      });

      if (response.status === 402) {
        // Payment required - show payment UI
        const data = await response.json();
        setPaymentRequirements(data.paymentRequirements[0]);
        setQuote(data.quote);
        
        toast({
          title: "Payment Required",
          description: `Pay ${data.quote.priceUSDC} USDC to send this message`,
        });
      } else if (response.ok) {
        // Message sent successfully
        const data = await response.json();
        
        toast({
          title: "Message Sent",
          description: "Your message has been delivered",
        });

        // Reset form
        setRecipient("");
        setMessage("");
        setIncludeReplyBounty(false);
        setReplyBounty(0);
        setPaymentRequirements(null);
        setQuote(null);
        setOriginalCommitPayload(null);

        if (onSend) {
          onSend(recipient, message, includeReplyBounty ? replyBounty : 0);
        }
      } else {
        const error = await response.json();
        throw new Error(error.error || "Failed to send message");
      }
    } catch (error) {
      console.error("Send error:", error);
      toast({
        title: "Send Failed",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePayment = async () => {
    if (!paymentRequirements || !originalCommitPayload) return;

    // Check wallet connection
    if (!isConnected || !walletAddress) {
      toast({
        title: "Wallet not connected",
        description: "Please connect your wallet first",
        variant: "destructive",
      });
      try {
        await connect();
      } catch (error) {
        return;
      }
      return;
    }

    setIsPaying(true);

    try {
      // Step 2: Sign EIP-712 payment authorization with real wallet
      const amountInSmallestUnit = BigInt(Math.round(parseFloat(paymentRequirements.amount) * 1e6)); // USDC has 6 decimals
      
      const authParams = {
        from: walletAddress as `0x${string}`,
        to: paymentRequirements.recipient as `0x${string}`,
        value: amountInSmallestUnit,
        validAfter: BigInt(0), // Valid immediately
        validBefore: BigInt(paymentRequirements.expiration),
        nonce: paymentRequirements.nonce as `0x${string}`, // Backend now generates bytes32 nonces
      };

      toast({
        title: "Signing payment",
        description: "Please approve the signature request in your wallet",
      });

      // Sign the authorization
      const signatureHex = await signTransferAuthorization(authParams, walletAddress as `0x${string}`);

      // Parse signature into v, r, s components (required by backend)
      const parsedSig = parseSignature(signatureHex);

      // Create payment proof
      const paymentProof = {
        chainId: paymentRequirements.network.chainId,
        tokenAddress: paymentRequirements.asset.address,
        amount: paymentRequirements.amount,
        sender: walletAddress,
        recipient: paymentRequirements.recipient,
        nonce: paymentRequirements.nonce, // Already in bytes32 format from backend
        expiration: paymentRequirements.expiration,
        signature: signatureHex, // Full signature for reference
        v: parsedSig.v,
        r: parsedSig.r,
        s: parsedSig.s,
        txHash: null, // Will be set by backend after settlement
      };

      // Step 3: Retry commit with SAME payload and payment proof
      // CRITICAL: Must use originalCommitPayload, not generate new one
      const response = await fetch("/api/commit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-PAYMENT": JSON.stringify(paymentProof),
        },
        body: JSON.stringify(originalCommitPayload),
      });

      if (response.ok) {
        const data = await response.json();
        
        toast({
          title: "Message Sent!",
          description: `Message delivered. Expires: ${new Date(data.expiresAt).toLocaleString()}`,
        });

        // Reset form
        setRecipient("");
        setMessage("");
        setIncludeReplyBounty(false);
        setReplyBounty(0);
        setPaymentRequirements(null);
        setQuote(null);
        setOriginalCommitPayload(null);

        if (onSend) {
          onSend(recipient, message, includeReplyBounty ? replyBounty : 0);
        }
      } else {
        const error = await response.json();
        throw new Error(error.error || "Payment verification failed");
      }
    } catch (error) {
      console.error("Payment error:", error);
      toast({
        title: "Payment Failed",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setIsPaying(false);
    }
  };

  return (
    <Card className="p-6">
      <div className="space-y-6">
        <div>
          <Label htmlFor="recipient">Recipient Address</Label>
          <Input
            id="recipient"
            placeholder="0x..."
            value={recipient}
            onChange={(e) => setRecipient(e.target.value)}
            className="font-mono mt-2"
            data-testid="input-recipient"
          />
        </div>

        <div>
          <Label htmlFor="message">Message</Label>
          <Textarea
            id="message"
            placeholder="What's on your mind?"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="mt-2 min-h-32 max-h-48 resize-y"
            data-testid="input-message"
          />
          <div className="flex justify-between items-center mt-2">
            <span className="text-xs text-muted-foreground">
              {message.length} characters
            </span>
            {!isVerified && (
              <Button variant="outline" size="sm" className="gap-2" data-testid="button-verify">
                <Shield className="h-3 w-3" />
                Verify for discount
              </Button>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Switch
            id="reply-bounty"
            checked={includeReplyBounty}
            onCheckedChange={setIncludeReplyBounty}
            data-testid="switch-reply-bounty"
          />
          <div className="flex-1">
            <Label htmlFor="reply-bounty" className="cursor-pointer">
              Add reply bounty (optional)
            </Label>
            {includeReplyBounty && (
              <Input
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={replyBounty}
                onChange={(e) => setReplyBounty(parseFloat(e.target.value) || 0)}
                className="mt-2 max-w-32"
                data-testid="input-bounty-amount"
              />
            )}
          </div>
        </div>

        <div className="border-t pt-6">
          {paymentRequirements && quote ? (
            <div className="space-y-4">
              <div className="p-4 bg-muted rounded-md">
                <div className="text-sm font-medium mb-2">Payment Required</div>
                <div className="flex justify-between items-center mb-3">
                  <span className="text-xs text-muted-foreground">Amount</span>
                  <span className="font-mono font-semibold">{quote.priceUSDC} USDC</span>
                </div>
                <div className="flex justify-between items-center mb-3">
                  <span className="text-xs text-muted-foreground">Network</span>
                  <span className="text-xs">Celo Mainnet</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-muted-foreground">Recipient</span>
                  <span className="text-xs font-mono">{paymentRequirements.recipient.slice(0, 10)}...</span>
                </div>
              </div>
              
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setPaymentRequirements(null);
                    setQuote(null);
                    setOriginalCommitPayload(null);
                  }}
                  disabled={isPaying}
                  data-testid="button-cancel-payment"
                >
                  Cancel
                </Button>
                <Button
                  className="flex-1"
                  onClick={handlePayment}
                  disabled={isPaying}
                  data-testid="button-pay"
                >
                  {isPaying ? (
                    <>Processing Payment...</>
                  ) : (
                    <>
                      <Wallet className="h-4 w-4 mr-2" />
                      {isConnected ? "Sign & Send" : "Connect & Pay"}
                    </>
                  )}
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div>
                  <div className="text-sm text-muted-foreground mb-2">
                    Estimated Price
                  </div>
                  {isLoadingQuote ? (
                    <div className="text-xs text-muted-foreground">Loading...</div>
                  ) : quote ? (
                    <div className="flex items-center gap-2">
                      <div className="font-mono font-semibold">{quote.priceUSDC} USDC</div>
                      {quote.surgeActive && (
                        <Badge variant="outline" className="text-xs gap-1" data-testid="badge-surge">
                          <TrendingUp className="h-3 w-3" />
                          Surge
                        </Badge>
                      )}
                    </div>
                  ) : (
                    <div className="text-xs text-muted-foreground">Enter recipient to see price</div>
                  )}
                </div>
              </div>
              <Button 
                size="lg" 
                onClick={handleSend} 
                disabled={isSubmitting || !recipient || !message}
                data-testid="button-send"
              >
                {isSubmitting ? (
                  <>Initiating...</>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    Send Message
                  </>
                )}
              </Button>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}
