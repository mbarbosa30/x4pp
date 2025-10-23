import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { CheckCircle, XCircle, Clock, DollarSign, Mail, Shield } from "lucide-react";

interface PendingMessage {
  id: number;
  senderName: string;
  senderEmail: string | null;
  senderDisplayName: string | null;
  senderUsername: string | null;
  content: string;
  bidUsd: string;
  replyBounty: string | null;
  sentAt: string;
  expiresAt: string;
  status: string;
}

export default function InboxPending() {
  const { toast } = useToast();
  const { user, isAuthenticated } = useAuth();

  // Fetch pending messages
  const { data: messages = [], isLoading, refetch } = useQuery<PendingMessage[]>({
    queryKey: ['/api/messages/pending'],
    enabled: isAuthenticated,
  });

  const acceptMutation = useMutation({
    mutationFn: async (messageId: number) => {
      const response = await apiRequest("POST", `/api/messages/${messageId}/accept`, {});
      return response.json();
    },
    onSuccess: (data, messageId) => {
      queryClient.invalidateQueries({ queryKey: ['/api/messages/pending'] });
      toast({
        title: "Message Accepted",
        description: `Payment settled on-chain. TX: ${data.txHash?.slice(0, 10)}...`,
      });
    },
    onError: (error: any, messageId) => {
      toast({
        title: "Accept Failed",
        description: error.message || "Unable to accept message",
        variant: "destructive",
      });
    },
  });

  const declineMutation = useMutation({
    mutationFn: async (messageId: number) => {
      const response = await apiRequest("POST", `/api/messages/${messageId}/decline`, {});
      return response.json();
    },
    onSuccess: (data, messageId) => {
      queryClient.invalidateQueries({ queryKey: ['/api/messages/pending'] });
      toast({
        title: "Message Declined",
        description: "Authorization marked unused",
      });
    },
    onError: (error: any, messageId) => {
      toast({
        title: "Decline Failed",
        description: error.message || "Unable to decline message",
        variant: "destructive",
      });
    },
  });

  const formatTimeRemaining = (expiresAt: string) => {
    const now = new Date();
    const expires = new Date(expiresAt);
    const msRemaining = expires.getTime() - now.getTime();
    
    if (msRemaining <= 0) {
      return "Expired";
    }
    
    const minutesRemaining = Math.floor(msRemaining / (1000 * 60));
    const hoursRemaining = Math.floor(msRemaining / (1000 * 60 * 60));
    const daysRemaining = Math.floor(hoursRemaining / 24);
    
    if (minutesRemaining === 0) {
      return "<1m left";
    } else if (minutesRemaining < 60) {
      return `${minutesRemaining}m left`;
    } else if (hoursRemaining < 24) {
      return `${hoursRemaining}h left`;
    } else {
      return `${daysRemaining}d left`;
    }
  };

  const formatSenderName = (senderName: string) => {
    // If it looks like a wallet address, format it
    if (senderName && senderName.startsWith('0x') && senderName.length === 42) {
      return `${senderName.slice(0, 6)}...${senderName.slice(-4)}`;
    }
    return senderName;
  };

  const getSenderDisplayInfo = (message: PendingMessage) => {
    // Prefer display name from registered profile
    if (message.senderDisplayName) {
      return {
        name: message.senderDisplayName,
        username: message.senderUsername,
        isRegistered: true,
      };
    }
    
    // Fall back to username if available
    if (message.senderUsername) {
      return {
        name: message.senderUsername,
        username: null,
        isRegistered: true,
      };
    }
    
    // Fall back to formatted wallet address
    return {
      name: formatSenderName(message.senderName),
      username: null,
      isRegistered: false,
    };
  };

  if (!isAuthenticated || !user) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <Card className="p-8 text-center">
          <Mail className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h2 className="text-xl font-semibold mb-2">Login Required</h2>
          <p className="text-muted-foreground">
            Please log in to view your pending message bids
          </p>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <Card className="p-8 text-center">
          <div className="text-muted-foreground">Loading pending messages...</div>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6">
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold mb-2">Pending Message Bids</h1>
        <p className="text-sm sm:text-base text-muted-foreground">
          Review and accept/decline incoming message bids
        </p>
      </div>

      {messages.length === 0 ? (
        <Card className="p-8 text-center">
          <Mail className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h2 className="text-xl font-semibold mb-2">No Pending Bids</h2>
          <p className="text-muted-foreground">
            You don't have any pending message bids at the moment
          </p>
        </Card>
      ) : (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <Badge variant="outline" className="gap-1 w-fit">
              <Mail className="h-3 w-3" />
              {messages.length} pending bid{messages.length !== 1 ? 's' : ''}
            </Badge>
            <span className="text-xs text-muted-foreground">
              Sorted by bid (highest first)
            </span>
          </div>

          {messages.map((message) => {
            const isExpired = new Date(message.expiresAt) < new Date();
            const isProcessing = acceptMutation.isPending || declineMutation.isPending;
            const senderInfo = getSenderDisplayInfo(message);

            return (
              <Card key={message.id} className="p-4 sm:p-6" data-testid={`card-message-${message.id}`}>
                <div className="space-y-4">
                  {/* Header with bid amount and sender */}
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 sm:gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 mb-2">
                        <h3 className={`font-semibold text-base sm:text-lg truncate ${!senderInfo.isRegistered ? 'font-mono' : ''}`} data-testid={`text-sender-${message.id}`}>
                          {senderInfo.name}
                        </h3>
                        {senderInfo.username && (
                          <span className="text-xs sm:text-sm text-muted-foreground truncate">
                            @{senderInfo.username}
                          </span>
                        )}
                        {message.senderEmail && (
                          <span className="text-xs sm:text-sm text-muted-foreground truncate">
                            {message.senderEmail}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground flex-wrap">
                        <Clock className="h-3 w-3" />
                        <span>Sent {new Date(message.sentAt).toLocaleDateString()}</span>
                        <span>•</span>
                        <span className={isExpired ? "text-destructive" : ""}>
                          {formatTimeRemaining(message.expiresAt)}
                        </span>
                      </div>
                    </div>
                    
                    <div className="text-left sm:text-right flex-shrink-0">
                      <div className="flex items-center gap-1 mb-1">
                        <DollarSign className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                        <span className="text-xl sm:text-2xl font-bold tabular-nums" data-testid={`text-bid-${message.id}`}>
                          {parseFloat(message.bidUsd).toFixed(2)}
                        </span>
                      </div>
                      <div className="text-xs text-muted-foreground">USDC bid</div>
                      {message.replyBounty && (
                        <Badge variant="outline" className="mt-2 text-xs">
                          +${parseFloat(message.replyBounty).toFixed(2)} bounty
                        </Badge>
                      )}
                    </div>
                  </div>

                  {/* Authorization Details */}
                  <div className="border-t pt-4">
                    <div className="bg-gradient-to-br from-primary/5 to-primary/10 border border-primary/20 rounded-md p-3 mb-3">
                      <div className="flex gap-2 items-start mb-2">
                        <Shield className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
                        <div className="flex-1">
                          <div className="text-xs font-semibold text-foreground mb-1">
                            EIP-3009 Deferred Authorization
                          </div>
                          <div className="text-xs text-muted-foreground">
                            Sender signed a payment authorization. Their USDC stays in their wallet—it only moves when you accept.
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 pt-2 border-t border-primary/10">
                        <Clock className="h-3.5 w-3.5 text-primary" />
                        <span className="text-xs text-muted-foreground">
                          <span className={isExpired ? "text-destructive font-medium" : "text-foreground font-medium"}>
                            {formatTimeRemaining(message.expiresAt)}
                          </span>
                          {!isExpired && " to accept"}
                          {isExpired && " — authorization expired"}
                        </span>
                      </div>
                    </div>

                    <div className="p-4 bg-muted/30 rounded-md border border-dashed">
                      <p className="text-sm text-muted-foreground italic text-center" data-testid={`text-content-${message.id}`}>
                        Message content will be visible after you accept this bid
                      </p>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="border-t pt-4 flex flex-col sm:flex-row gap-2">
                    <Button
                      variant="outline"
                      className="flex-1 gap-2"
                      size="sm"
                      onClick={() => declineMutation.mutate(message.id)}
                      disabled={isProcessing || isExpired}
                      data-testid={`button-decline-${message.id}`}
                    >
                      <XCircle className="h-4 w-4" />
                      Decline
                    </Button>
                    <Button
                      className="flex-1 gap-2"
                      size="sm"
                      onClick={() => acceptMutation.mutate(message.id)}
                      disabled={isProcessing || isExpired}
                      data-testid={`button-accept-${message.id}`}
                    >
                      <CheckCircle className="h-4 w-4" />
                      <span className="hidden sm:inline">Accept ${parseFloat(message.bidUsd).toFixed(2)}</span>
                      <span className="sm:hidden">Accept</span>
                    </Button>
                  </div>

                  {isExpired && (
                    <div className="text-xs text-destructive text-center">
                      This bid has expired and will be auto-refunded
                    </div>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
