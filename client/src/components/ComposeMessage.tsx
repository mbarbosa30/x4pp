import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Send, Shield, Wallet, TrendingUp, Info, Clock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { useWallet } from "@/providers/WalletProvider";
import { signTransferAuthorization, parseSignature } from "@/lib/eip-3009";

interface ComposeMessageProps {
  isVerified: boolean;
  onSend?: (recipient: string, message: string, replyBounty: number) => void;
}

interface PriceGuide {
  p25: number | null;
  median: number | null;
  p75: number | null;
  minBaseUsd: number;
  sampleSize: number;
}

export default function ComposeMessage({ isVerified, onSend }: ComposeMessageProps) {
  const [recipient, setRecipient] = useState("");
  const [message, setMessage] = useState("");
  const [bidAmount, setBidAmount] = useState(0.10);
  const [replyBounty, setReplyBounty] = useState(0);
  const [includeReplyBounty, setIncludeReplyBounty] = useState(false);
  const [expirationHours, setExpirationHours] = useState(24); // Default: 24 hours
  const { toast } = useToast();
  const { address: walletAddress, isConnected, connect } = useWallet();
  
  // x402 payment flow state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [paymentRequirements, setPaymentRequirements] = useState<any>(null);
  const [isPaying, setIsPaying] = useState(false);
  const [originalCommitPayload, setOriginalCommitPayload] = useState<any>(null);
  const [priceGuide, setPriceGuide] = useState<PriceGuide | null>(null);
  const [isLoadingPriceGuide, setIsLoadingPriceGuide] = useState(false);

  // Fetch price guide when recipient changes (only if wallet connected)
  useEffect(() => {
    if (!recipient || !isConnected) {
      setPriceGuide(null);
      return;
    }

    const fetchPriceGuide = async () => {
      setIsLoadingPriceGuide(true);
      try {
        const response = await fetch(`/api/price-guide/${recipient}`);

        if (response.ok) {
          const data = await response.json();
          setPriceGuide(data);
          
          // Set initial bid to median (or minBaseUsd if no data)
          if (data.median) {
            setBidAmount(data.median);
          } else {
            setBidAmount(data.minBaseUsd);
          }
        } else {
          setPriceGuide(null);
        }
      } catch (error) {
        console.error("Error fetching price guide:", error);
        setPriceGuide(null);
      } finally {
        setIsLoadingPriceGuide(false);
      }
    };

    const debounceTimer = setTimeout(fetchPriceGuide, 500);
    return () => clearTimeout(debounceTimer);
  }, [recipient, isConnected]);

  const handleSend = async () => {
    if (!recipient || !message) {
      toast({
        title: "Missing information",
        description: "Please fill in recipient and message",
        variant: "destructive",
      });
      return;
    }

    if (!isConnected || !walletAddress) {
      toast({
        title: "Wallet not connected",
        description: "Please connect your wallet to see pricing and send messages",
        variant: "destructive",
      });
      try {
        await connect();
      } catch (error) {
        return;
      }
      return;
    }

    if (!priceGuide) {
      toast({
        title: "Loading pricing",
        description: "Please wait for pricing information to load",
        variant: "destructive",
      });
      return;
    }

    if (bidAmount < priceGuide.minBaseUsd) {
      toast({
        title: "Bid too low",
        description: `Minimum bid is $${priceGuide.minBaseUsd.toFixed(2)}`,
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // Step 1: Generate commit payload with bid amount and expiration
      const commitRequest = {
        recipientUsername: recipient,
        senderNullifier: isVerified ? "demo_verified_user_001" : undefined,
        senderName: "Demo Sender",
        content: message,
        bidUsd: bidAmount.toFixed(2),
        replyBounty: includeReplyBounty ? replyBounty.toFixed(2) : undefined,
        expirationHours: expirationHours,
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
        console.log("402 Response data:", data);
        console.log("Payment requirements[0]:", data.paymentRequirements?.[0]);
        setPaymentRequirements(data.paymentRequirements[0]);
        
        toast({
          title: "Payment Required",
          description: `Sign authorization for ${bidAmount.toFixed(2)} USDC`,
        });
      } else if (response.ok) {
        // Message sent successfully
        const data = await response.json();
        
        toast({
          title: "Bid Submitted",
          description: `Your message bid of $${bidAmount.toFixed(2)} is pending receiver's acceptance`,
        });

        // Reset form
        setRecipient("");
        setMessage("");
        setBidAmount(0.10);
        setIncludeReplyBounty(false);
        setReplyBounty(0);
        setExpirationHours(24);
        setPaymentRequirements(null);
        setPriceGuide(null);
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
      console.log("Payment requirements before BigInt:", paymentRequirements);
      console.log("Amount value:", paymentRequirements.amount);
      console.log("Amount type:", typeof paymentRequirements.amount);
      
      if (!paymentRequirements.amount) {
        throw new Error("Payment amount is missing");
      }
      
      const amountInSmallestUnit = BigInt(paymentRequirements.amount);
      
      const authParams = {
        from: walletAddress as `0x${string}`,
        to: paymentRequirements.recipient as `0x${string}`,
        value: amountInSmallestUnit,
        validAfter: BigInt(0),
        validBefore: BigInt(paymentRequirements.expiration),
        nonce: paymentRequirements.nonce as `0x${string}`,
      };

      toast({
        title: "Signing payment",
        description: "Please approve the signature request in your wallet",
      });

      // Sign the authorization
      const signatureHex = await signTransferAuthorization(authParams, walletAddress as `0x${string}`);

      // Parse signature into v, r, s components
      const parsedSig = parseSignature(signatureHex);

      // Create payment proof with validAfter/validBefore for settlement
      const paymentProof = {
        chainId: paymentRequirements.network.chainId,
        tokenAddress: paymentRequirements.asset.address,
        amount: paymentRequirements.amount,
        sender: walletAddress,
        recipient: paymentRequirements.recipient,
        nonce: paymentRequirements.nonce,
        validAfter: 0,
        validBefore: paymentRequirements.expiration,
        signature: {
          v: parsedSig.v,
          r: parsedSig.r,
          s: parsedSig.s,
        },
        txHash: null,
      };

      // Step 3: Retry commit with payment proof
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
          title: "Bid Submitted!",
          description: `Message pending acceptance. Expires: ${new Date(data.expiresAt).toLocaleString()}`,
        });

        // Reset form
        setRecipient("");
        setMessage("");
        setBidAmount(0.10);
        setIncludeReplyBounty(false);
        setReplyBounty(0);
        setExpirationHours(24);
        setPaymentRequirements(null);
        setPriceGuide(null);
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
    <Card className="p-4 sm:p-6">
      <div className="space-y-6">
        <div>
          <Label htmlFor="recipient">Recipient Username</Label>
          <Input
            id="recipient"
            placeholder="username"
            value={recipient}
            onChange={(e) => setRecipient(e.target.value)}
            className="mt-2"
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

        {/* Price Guide - only shown when wallet connected */}
        {isConnected && recipient && (
          <div className="border-t pt-4">
            <div className="flex items-center gap-2 mb-3">
              <Info className="h-4 w-4 text-muted-foreground" />
              <Label className="text-sm font-medium">Reference Pricing</Label>
            </div>
            
            {isLoadingPriceGuide ? (
              <div className="text-xs text-muted-foreground">Loading pricing data...</div>
            ) : priceGuide ? (
              <div className="space-y-3">
                <div className="grid grid-cols-3 gap-2">
                  <div className="text-center p-2 bg-muted/50 rounded">
                    <div className="text-xs text-muted-foreground mb-1">Min</div>
                    <div className="font-mono font-semibold text-sm">
                      ${priceGuide.minBaseUsd.toFixed(2)}
                    </div>
                  </div>
                  {priceGuide.median !== null && (
                    <div className="text-center p-2 bg-primary/10 rounded border border-primary/20">
                      <div className="text-xs text-muted-foreground mb-1">Typical</div>
                      <div className="font-mono font-semibold text-sm">
                        ${priceGuide.median.toFixed(2)}
                      </div>
                    </div>
                  )}
                  {priceGuide.p75 !== null && (
                    <div className="text-center p-2 bg-muted/50 rounded">
                      <div className="text-xs text-muted-foreground mb-1">High</div>
                      <div className="font-mono font-semibold text-sm">
                        ${priceGuide.p75.toFixed(2)}
                      </div>
                    </div>
                  )}
                </div>
                
                {priceGuide.sampleSize > 0 && (
                  <div className="text-xs text-muted-foreground text-center">
                    Based on {priceGuide.sampleSize} pending bid{priceGuide.sampleSize !== 1 ? 's' : ''}
                  </div>
                )}

                {/* Bid Input with Quick Buttons */}
                <div>
                  <Label htmlFor="bid-amount">Your Bid (USDC)</Label>
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2 mt-2">
                    <Input
                      id="bid-amount"
                      type="number"
                      step="0.01"
                      min={priceGuide.minBaseUsd}
                      value={bidAmount}
                      onChange={(e) => setBidAmount(parseFloat(e.target.value) || priceGuide.minBaseUsd)}
                      className="max-w-32 font-mono"
                      data-testid="input-bid-amount"
                    />
                    <div className="flex gap-1 flex-wrap">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setBidAmount(priceGuide.minBaseUsd)}
                        data-testid="button-bid-min"
                        className="text-xs"
                      >
                        Min
                      </Button>
                      {priceGuide.median !== null && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setBidAmount(priceGuide.median!)}
                          data-testid="button-bid-median"
                          className="text-xs"
                        >
                          Typical
                        </Button>
                      )}
                      {priceGuide.p75 !== null && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setBidAmount(priceGuide.p75!)}
                          data-testid="button-bid-high"
                          className="text-xs"
                        >
                          High
                        </Button>
                      )}
                    </div>
                  </div>
                  {bidAmount < priceGuide.minBaseUsd && (
                    <div className="text-xs text-destructive mt-1">
                      Below minimum bid of ${priceGuide.minBaseUsd.toFixed(2)}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="text-xs text-muted-foreground">Unable to load pricing data</div>
            )}
          </div>
        )}

        {!isConnected && (
          <div className="border-t pt-4">
            <div className="p-3 bg-muted/50 rounded text-sm text-muted-foreground text-center">
              Connect wallet to see reference pricing and send messages
            </div>
          </div>
        )}

        {/* Expiration Time Selector */}
        <div className="border-t pt-4">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <Label htmlFor="expiration-hours">Bid Valid For</Label>
          </div>
          <Select 
            value={expirationHours.toString()} 
            onValueChange={(value) => setExpirationHours(parseFloat(value))}
          >
            <SelectTrigger id="expiration-hours" className="max-w-48" data-testid="select-expiration">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1">1 hour</SelectItem>
              <SelectItem value="6">6 hours</SelectItem>
              <SelectItem value="24">24 hours (1 day)</SelectItem>
              <SelectItem value="48">48 hours (2 days)</SelectItem>
              <SelectItem value="72">72 hours (3 days)</SelectItem>
              <SelectItem value="168">168 hours (7 days)</SelectItem>
            </SelectContent>
          </Select>
          <div className="text-xs text-muted-foreground mt-1">
            Your bid will expire if not accepted within this time
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
          {paymentRequirements ? (
            <div className="space-y-4">
              <div className="p-4 bg-muted rounded-md">
                <div className="text-sm font-medium mb-2">Payment Required</div>
                <div className="flex justify-between items-center mb-3">
                  <span className="text-xs text-muted-foreground">Bid Amount</span>
                  <span className="font-mono font-semibold">{bidAmount.toFixed(2)} USDC</span>
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
              
              <div className="flex flex-col sm:flex-row gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setPaymentRequirements(null);
                    setOriginalCommitPayload(null);
                  }}
                  disabled={isPaying}
                  data-testid="button-cancel-payment"
                  className="sm:w-auto"
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
                    <>Processing...</>
                  ) : (
                    <>
                      <Wallet className="h-4 w-4 mr-2" />
                      <span className="hidden sm:inline">Sign & Send</span>
                      <span className="sm:hidden">Sign</span>
                    </>
                  )}
                </Button>
              </div>
            </div>
          ) : (
            <Button 
              size="lg" 
              className="w-full"
              onClick={handleSend} 
              disabled={isSubmitting || !recipient || !message || !isConnected}
              data-testid="button-send"
            >
              {isSubmitting ? (
                <>Submitting Bid...</>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Send Message (${bidAmount.toFixed(2)})
                </>
              )}
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}
