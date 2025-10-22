import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Mail, Inbox, Settings as SettingsIcon, Plus } from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import WalletConnectButton from "@/components/WalletConnectButton";
import AttentionSlots from "@/components/AttentionSlots";
import MessageCard from "@/components/MessageCard";
import ComposeMessage from "@/components/ComposeMessage";
import MessageDetail from "@/components/MessageDetail";
import SettingsPanel from "@/components/SettingsPanel";
import VerificationModal from "@/components/VerificationModal";
import PaymentModal from "@/components/PaymentModal";

// Helper to format time remaining
function formatTimeRemaining(expiresAt: string): string {
  const now = new Date();
  const expiry = new Date(expiresAt);
  const diffMs = expiry.getTime() - now.getTime();
  
  if (diffMs < 0) return "Expired";
  
  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
  
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

// Helper to format timestamp
function formatTimestamp(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  
  const minutes = Math.floor(diffMs / (1000 * 60));
  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  
  if (minutes < 60) return `${minutes} minutes ago`;
  if (hours < 24) return `${hours} hours ago`;
  return `${days} days ago`;
}

export default function Home() {
  const [activeTab, setActiveTab] = useState("inbox");
  const [selectedMessage, setSelectedMessage] = useState<string | null>(null);
  const [showCompose, setShowCompose] = useState(false);
  const [showVerification, setShowVerification] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState(0);
  const { toast } = useToast();

  // Fetch inbox data for current user (demo_recipient)
  const recipientId = "demo_recipient";
  const { data: inboxData, isLoading: isLoadingInbox } = useQuery({
    queryKey: ["/api/inbox", recipientId],
    enabled: activeTab === "inbox",
  });

  // Mutation to open a message
  const openMessageMutation = useMutation({
    mutationFn: async (messageId: string) => {
      return await apiRequest(`/api/open/${messageId}`, {
        method: "POST",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/inbox"] });
      toast({
        title: "Message opened",
        description: "Funds have been released to your wallet",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to open message",
        description: error.message || "Please try again",
        variant: "destructive",
      });
    },
  });

  const handleComposeMessage = (recipient: string, message: string, bounty: number) => {
    console.log("Composing message:", { recipient, message, bounty });
    setPaymentAmount(isVerified ? 0.02 : 0.10);
    setShowPayment(true);
    setShowCompose(false);
  };

  const handleOpenMessage = async (messageId: string, isOpened: boolean) => {
    // If message is not yet opened, call the open API
    if (!isOpened) {
      await openMessageMutation.mutateAsync(messageId);
    }
    setSelectedMessage(messageId);
    setActiveTab("inbox");
  };

  const handleVouch = async (senderNullifier: string, messageId: string) => {
    try {
      const response = await fetch("/api/vouches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          voucherNullifier: "demo_recipient_001",
          voucheeNullifier: senderNullifier,
          messageId: messageId,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        toast({
          title: "Vouch failed",
          description: error.error || "Please try again",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Vouch sent",
        description: "You vouched for this sender",
      });
    } catch (error) {
      console.error("Error vouching:", error);
      toast({
        title: "Error",
        description: "Failed to vouch for sender",
        variant: "destructive",
      });
    }
  };

  // Find selected message from inbox data
  const message = inboxData?.messages?.find((m: any) => m.id === selectedMessage);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b backdrop-blur-lg bg-background/95">
        <div className="container mx-auto px-3 md:px-4 h-14 md:h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 md:gap-3">
            <Mail className="h-5 w-5 md:h-6 md:w-6 text-primary" />
            <h1 className="text-lg md:text-xl font-semibold">x4pp</h1>
          </div>
          <div className="flex items-center gap-2 md:gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowCompose(true)}
              data-testid="button-new-message"
              className="h-9 w-9 md:h-10 md:w-10"
            >
              <Plus className="h-5 w-5" />
            </Button>
            <WalletConnectButton />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-3 md:px-4 py-3 md:py-6">
        <div className="max-w-6xl mx-auto">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-3 md:mb-6 w-full sm:w-auto grid grid-cols-3 sm:flex h-11">
              <TabsTrigger value="inbox" data-testid="tab-inbox" className="text-xs sm:text-sm">
                <Inbox className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Inbox</span>
              </TabsTrigger>
              <TabsTrigger value="compose" data-testid="tab-compose" className="text-xs sm:text-sm">
                <Mail className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Compose</span>
              </TabsTrigger>
              <TabsTrigger value="settings" data-testid="tab-settings" className="text-xs sm:text-sm">
                <SettingsIcon className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Settings</span>
              </TabsTrigger>
            </TabsList>

            {/* Inbox Tab */}
            <TabsContent value="inbox" className="space-y-3 md:space-y-4 mt-0">
              <div className="overflow-x-auto -mx-3 px-3 md:mx-0 md:px-0">
                <AttentionSlots 
                  totalSlots={inboxData?.queueStatus?.capacity || 5} 
                  usedSlots={inboxData?.queueStatus?.queued || 0} 
                  timeWindow={inboxData?.recipientSettings?.timeWindow || "hour"} 
                />
              </div>

              {selectedMessage && message ? (
                <div className="space-y-3 md:space-y-4">
                  <Button
                    variant="ghost"
                    onClick={() => setSelectedMessage(null)}
                    data-testid="button-back-to-inbox"
                    className="text-sm"
                  >
                    ← Back to inbox
                  </Button>
                  <MessageDetail
                    senderName={message.senderName}
                    senderVerified={message.senderVerified || false}
                    message={message.content}
                    amount={parseFloat(message.amount)}
                    timestamp={formatTimestamp(message.sentAt)}
                    replyBounty={message.replyBounty ? parseFloat(message.replyBounty) : undefined}
                    reputation={message.reputation}
                    onReply={(reply) => console.log("Reply:", reply)}
                    onVouch={() => handleVouch(message.senderNullifier, message.id)}
                    onBlock={() => console.log("Block sender")}
                    onReport={() => console.log("Report message")}
                  />
                </div>
              ) : isLoadingInbox ? (
                <div className="text-center py-8 text-muted-foreground" data-testid="text-loading">
                  Loading inbox...
                </div>
              ) : inboxData?.messages && inboxData.messages.length > 0 ? (
                <div className="space-y-2 md:space-y-3">
                  <div className="text-xs text-muted-foreground mb-2 px-1" data-testid="text-queue-info">
                    Showing top {inboxData.messages.length} of {inboxData.queueStatus?.queued || 0} queued messages
                  </div>
                  {inboxData.messages.map((msg: any, index: number) => (
                    <MessageCard
                      key={msg.id}
                      id={msg.id}
                      senderName={msg.senderName}
                      senderVerified={msg.senderVerified || false}
                      messagePreview={msg.content.substring(0, 60) + (msg.content.length > 60 ? "..." : "")}
                      amount={parseFloat(msg.amount)}
                      timeRemaining={formatTimeRemaining(msg.expiresAt)}
                      opened={!!msg.openedAt}
                      queuePosition={index + 1}
                      reputation={msg.reputation}
                      onClick={() => handleOpenMessage(msg.id, !!msg.openedAt)}
                    />
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground" data-testid="text-no-messages">
                  No messages in your inbox
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
