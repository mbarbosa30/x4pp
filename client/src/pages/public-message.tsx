import { useState } from "react";
import { useRoute } from "wouter";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Mail, DollarSign, Shield, Send, TrendingUp } from "lucide-react";
import VerificationBadge from "@/components/VerificationBadge";
import ThemeToggle from "@/components/ThemeToggle";
import PaymentModal from "@/components/PaymentModal";
import VerificationModal from "@/components/VerificationModal";

export default function PublicMessage() {
  const [, params] = useRoute("/@:username");
  const username = params?.username || "user";
  
  const [senderName, setSenderName] = useState("");
  const [senderEmail, setSenderEmail] = useState("");
  const [message, setMessage] = useState("");
  const [isVerified, setIsVerified] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const [showVerification, setShowVerification] = useState(false);

  // TODO: Fetch user settings from backend
  const userSettings = {
    displayName: username.charAt(0).toUpperCase() + username.slice(1),
    basePrice: 0.05,
    surgeMultiplier: 2.0,
    slotsAvailable: 3,
    totalSlots: 5,
    verified: true,
  };

  const currentPrice = isVerified 
    ? userSettings.basePrice * userSettings.surgeMultiplier * 0.2
    : userSettings.basePrice * userSettings.surgeMultiplier;

  const handleSend = () => {
    if (!senderName || !message) {
      alert("Please fill in your name and message");
      return;
    }
    setShowPayment(true);
  };

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
                {userSettings.displayName.charAt(0)}
              </AvatarFallback>
            </Avatar>
            <div>
              <div className="flex items-center justify-center gap-2 mb-2">
                <h1 className="text-2xl md:text-3xl font-bold" data-testid="text-username">
                  {userSettings.displayName}
                </h1>
                <VerificationBadge verified={userSettings.verified} size="lg" />
              </div>
              <p className="text-muted-foreground">@{username}</p>
            </div>
            <p className="text-muted-foreground max-w-md mx-auto">
              Send me a message. I'll receive it if it's in my top {userSettings.totalSlots} highest-paying messages this hour.
            </p>
          </div>

          {/* Pricing Info */}
          <Card className="p-6 bg-gradient-to-br from-primary/5 to-success/5">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Current price</span>
                {userSettings.surgeMultiplier > 1 && (
                  <Badge variant="outline" className="bg-warning/10 border-warning/20 text-warning">
                    <TrendingUp className="h-3 w-3 mr-1" />
                    {userSettings.surgeMultiplier}x surge
                  </Badge>
                )}
              </div>
              <div className="flex items-baseline gap-2">
                <DollarSign className="h-5 w-5 text-price" />
                <span className="text-4xl font-bold tabular-nums text-price" data-testid="text-current-price">
                  {currentPrice.toFixed(2)}
                </span>
                <span className="text-muted-foreground">USDC</span>
              </div>
              {!isVerified && (
                <div className="flex items-center justify-between pt-2 border-t">
                  <span className="text-sm text-muted-foreground">
                    Verify as human for ${(currentPrice * 0.2).toFixed(2)}
                  </span>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setShowVerification(true)}
                    data-testid="button-verify"
                  >
                    <Shield className="h-3 w-3 mr-2" />
                    Verify
                  </Button>
                </div>
              )}
              <div className="text-xs text-muted-foreground pt-2 border-t">
                {userSettings.slotsAvailable} of {userSettings.totalSlots} slots available this hour
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
                data-testid="button-send-message"
              >
                <Send className="h-4 w-4 mr-2" />
                Send Message for ${currentPrice.toFixed(2)} USDC
              </Button>

              <div className="text-center text-xs text-muted-foreground space-y-1">
                <p>✓ Messages compete for attention slots</p>
                <p>✓ Unopened after deadline? Automatic refund</p>
                <p>✓ All payments in USDC on Celo</p>
              </div>
            </div>
          </Card>
        </div>
      </main>

      {/* Modals */}
      <VerificationModal
        open={showVerification}
        onClose={() => setShowVerification(false)}
        onVerified={() => setIsVerified(true)}
      />

      <PaymentModal
        open={showPayment}
        onClose={() => setShowPayment(false)}
        amount={currentPrice}
        recipient={userSettings.displayName}
        onConfirm={() => {
          console.log("Message sent:", { senderName, senderEmail, message });
          setSenderName("");
          setSenderEmail("");
          setMessage("");
        }}
      />
    </div>
  );
}
