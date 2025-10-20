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
    senderAddress: "0x742d35Cc6634C0532925a3b844Bc9e7595f38C4",
    senderVerified: true,
    messagePreview: "Hey! I'd love to collaborate on your latest project...",
    message: "Hey! I'd love to collaborate on your latest project. I've been following your work for a while and think we could build something amazing together. Let me know if you're interested in chatting more about this.",
    amount: 0.15,
    timeRemaining: "2h 45m",
    timestamp: "2 hours ago",
    opened: false,
    replyBounty: 0.05,
  },
  {
    id: "2",
    senderAddress: "0x8B3f9eA2c4B7d6A5F1E0a3B9C8D7E6F5A4B3C2D1",
    senderVerified: false,
    messagePreview: "Quick question about your availability next week",
    message: "Quick question about your availability next week. Would you be open to a consulting call?",
    amount: 0.08,
    timeRemaining: "5h 12m",
    timestamp: "5 hours ago",
    opened: false,
  },
  {
    id: "3",
    senderAddress: "0xA1B2C3D4E5F6G7H8I9J0K1L2M3N4O5P6Q7R8S9T0",
    senderVerified: true,
    messagePreview: "Invitation to speak at our upcoming conference",
    message: "We'd like to invite you to speak at our upcoming blockchain conference in Miami. We're offering a $5k speaking fee plus travel.",
    amount: 0.25,
    timeRemaining: "1h 03m",
    timestamp: "30 minutes ago",
    opened: true,
    replyBounty: 0.10,
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
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-6">
              <TabsTrigger value="inbox" data-testid="tab-inbox">
                <Inbox className="h-4 w-4 mr-2" />
                Inbox
              </TabsTrigger>
              <TabsTrigger value="compose" data-testid="tab-compose">
                <Mail className="h-4 w-4 mr-2" />
                Compose
              </TabsTrigger>
              <TabsTrigger value="settings" data-testid="tab-settings">
                <SettingsIcon className="h-4 w-4 mr-2" />
                Settings
              </TabsTrigger>
            </TabsList>

            {/* Inbox Tab */}
            <TabsContent value="inbox" className="space-y-6">
              <div className="flex items-center justify-between">
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
                    senderAddress={message.senderAddress}
                    senderVerified={message.senderVerified}
                    message={message.message}
                    amount={message.amount}
                    timestamp={message.timestamp}
                    replyBounty={message.replyBounty}
                    onReply={(reply) => console.log("Reply:", reply)}
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
