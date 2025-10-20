import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Mail, Inbox, Settings as SettingsIcon, Plus } from "lucide-react";
import WalletConnectButton from "@/components/WalletConnectButton";
import AttentionSlots from "@/components/AttentionSlots";
import MessageCard from "@/components/MessageCard";
import ComposeMessage from "@/components/ComposeMessage";
import MessageDetail from "@/components/MessageDetail";
import SettingsPanel from "@/components/SettingsPanel";
import VerificationModal from "@/components/VerificationModal";
import PaymentModal from "@/components/PaymentModal";

// TODO: Remove mock data
const mockMessages = [
  {
    id: "1",
    senderName: "Sarah Chen",
    senderVerified: true,
    messagePreview: "Hey! I'd love to collaborate on your latest project...",
    message: "Hey! I'd love to collaborate on your latest project. I've been following your work for a while and think we could build something amazing together. Let me know if you're interested in chatting more about this.",
    amount: 0.15,
    timeRemaining: "2h 45m",
    timestamp: "2 hours ago",
    opened: false,
    replyBounty: 0.05,
    reputation: {
      openRate: 0.78,
      replyRate: 0.41,
      vouchCount: 5,
      totalSent: 24,
    },
  },
  {
    id: "2",
    senderName: "Alex Rivera",
    senderVerified: false,
    messagePreview: "Quick question about your availability next week",
    message: "Quick question about your availability next week. Would you be open to a consulting call?",
    amount: 0.08,
    timeRemaining: "5h 12m",
    timestamp: "5 hours ago",
    opened: false,
    reputation: {
      openRate: 0.52,
      replyRate: 0.18,
      vouchCount: 0,
      totalSent: 8,
    },
  },
  {
    id: "3",
    senderName: "David Park",
    senderVerified: true,
    messagePreview: "Invitation to speak at our upcoming conference",
    message: "We'd like to invite you to speak at our upcoming blockchain conference in Miami. We're offering a $5k speaking fee plus travel.",
    amount: 0.25,
    timeRemaining: "1h 03m",
    timestamp: "30 minutes ago",
    opened: true,
    replyBounty: 0.10,
    reputation: {
      openRate: 0.91,
      replyRate: 0.67,
      vouchCount: 12,
      totalSent: 47,
    },
  },
];

export default function Home() {
  const [activeTab, setActiveTab] = useState("inbox");
  const [selectedMessage, setSelectedMessage] = useState<string | null>(null);
  const [showCompose, setShowCompose] = useState(false);
  const [showVerification, setShowVerification] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState(0);

  const handleComposeMessage = (recipient: string, message: string, bounty: number) => {
    console.log("Composing message:", { recipient, message, bounty });
    setPaymentAmount(isVerified ? 0.02 : 0.10);
    setShowPayment(true);
    setShowCompose(false);
  };

  const handleOpenMessage = (messageId: string) => {
    setSelectedMessage(messageId);
    setActiveTab("inbox");
  };

  const handleVouch = async (messageId: string) => {
    const msg = mockMessages.find((m) => m.id === messageId);
    if (!msg) return;

    try {
      // TODO: Replace with actual nullifiers from wallet/Self verification
      const response = await fetch("/api/vouches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          voucherNullifier: "current-user-nullifier", // Replace with actual
          voucheeNullifier: `sender-${msg.senderName}`, // Replace with actual
          messageId: messageId,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        console.error("Vouch failed:", error);
        return;
      }

      console.log("Successfully vouched for", msg.senderName);
    } catch (error) {
      console.error("Error vouching:", error);
    }
  };

  const message = mockMessages.find((m) => m.id === selectedMessage);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b backdrop-blur-lg bg-background/80">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Mail className="h-6 w-6 text-primary" />
            <h1 className="text-xl font-semibold">Attention Market</h1>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowCompose(true)}
              data-testid="button-new-message"
            >
              <Plus className="h-5 w-5" />
            </Button>
            <WalletConnectButton />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-4 md:py-8">
        <div className="max-w-6xl mx-auto">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-4 md:mb-6 w-full sm:w-auto">
              <TabsTrigger value="inbox" data-testid="tab-inbox" className="flex-1 sm:flex-initial">
                <Inbox className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Inbox</span>
              </TabsTrigger>
              <TabsTrigger value="compose" data-testid="tab-compose" className="flex-1 sm:flex-initial">
                <Mail className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Compose</span>
              </TabsTrigger>
              <TabsTrigger value="settings" data-testid="tab-settings" className="flex-1 sm:flex-initial">
                <SettingsIcon className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Settings</span>
              </TabsTrigger>
            </TabsList>

            {/* Inbox Tab */}
            <TabsContent value="inbox" className="space-y-4 md:space-y-6">
              <div className="overflow-x-auto">
                <AttentionSlots totalSlots={5} usedSlots={3} timeWindow="hour" />
              </div>

              {selectedMessage && message ? (
                <div className="space-y-4">
                  <Button
                    variant="ghost"
                    onClick={() => setSelectedMessage(null)}
                    data-testid="button-back-to-inbox"
                  >
                    ← Back to inbox
                  </Button>
                  <MessageDetail
                    senderName={message.senderName}
                    senderVerified={message.senderVerified}
                    message={message.message}
                    amount={message.amount}
                    timestamp={message.timestamp}
                    replyBounty={message.replyBounty}
                    reputation={message.reputation}
                    onReply={(reply) => console.log("Reply:", reply)}
                    onVouch={() => handleVouch(message.id)}
                    onBlock={() => console.log("Block sender")}
                    onReport={() => console.log("Report message")}
                  />
                </div>
              ) : (
                <div className="space-y-3">
                  {mockMessages.map((msg) => (
                    <MessageCard
                      key={msg.id}
                      {...msg}
                      onClick={() => handleOpenMessage(msg.id)}
                    />
                  ))}
                </div>
              )}
            </TabsContent>

            {/* Compose Tab */}
            <TabsContent value="compose">
              <ComposeMessage
                isVerified={isVerified}
                onSend={handleComposeMessage}
              />
              {!isVerified && (
                <div className="mt-6 text-center">
                  <Button
                    variant="outline"
                    onClick={() => setShowVerification(true)}
                    data-testid="button-verify-for-discount"
                  >
                    Verify humanity for discounted rates
                  </Button>
                </div>
              )}
            </TabsContent>

            {/* Settings Tab */}
            <TabsContent value="settings">
              <SettingsPanel />
            </TabsContent>
          </Tabs>
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
        amount={paymentAmount}
        recipient="0x742d35Cc6634C0532925a3b844Bc9e7595f38C4"
        onConfirm={() => console.log("Payment confirmed")}
      />
    </div>
  );
}
