import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Send, Shield } from "lucide-react";
import PriceQuote from "./PriceQuote";
import { useToast } from "@/hooks/use-toast";

interface ComposeMessageProps {
  isVerified: boolean;
  onSend?: (recipient: string, message: string, replyBounty: number) => void;
}

export default function ComposeMessage({ isVerified, onSend }: ComposeMessageProps) {
  const [recipient, setRecipient] = useState("");
  const [message, setMessage] = useState("");
  const [replyBounty, setReplyBounty] = useState(0);
  const [includeReplyBounty, setIncludeReplyBounty] = useState(false);
  const [basePrice] = useState(0.02);
  const [surgeMultiplier] = useState(1.5);
  const { toast } = useToast();

  const verifiedPrice = basePrice * surgeMultiplier;
  const unverifiedPrice = basePrice * surgeMultiplier * 5;

  const handleSend = () => {
    if (!recipient || !message) {
      toast({
        title: "Missing information",
        description: "Please fill in recipient and message",
        variant: "destructive",
      });
      return;
    }
    
    console.log("Sending message:", { recipient, message, replyBounty: includeReplyBounty ? replyBounty : 0 });
    
    toast({
      title: "Message queued",
      description: "Your message is being processed for payment",
    });
    
    if (onSend) {
      onSend(recipient, message, includeReplyBounty ? replyBounty : 0);
    }

    // Reset form
    setRecipient("");
    setMessage("");
    setIncludeReplyBounty(false);
    setReplyBounty(0);
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
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-muted-foreground mb-2">Current price</div>
              <PriceQuote
                verifiedPrice={verifiedPrice}
                unverifiedPrice={unverifiedPrice}
                isVerified={isVerified}
                surgeMultiplier={surgeMultiplier}
              />
            </div>
            <Button size="lg" onClick={handleSend} data-testid="button-send">
              <Send className="h-4 w-4 mr-2" />
              Send Message
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
}
