import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { CheckCircle, XCircle, Clock, DollarSign, Mail } from "lucide-react";

interface PendingMessage {
  id: number;
  senderName: string;
  senderEmail: string | null;
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
    const hoursRemaining = Math.max(0, Math.floor((expires.getTime() - now.getTime()) / (1000 * 60 * 60)));
    
    if (hoursRemaining === 0) {
      return "Expired";
    } else if (hoursRemaining < 1) {
      const minutesRemaining = Math.floor((expires.getTime() - now.getTime()) / (1000 * 60));
      return `${minutesRemaining}m left`;
    } else if (hoursRemaining < 24) {
      return `${hoursRemaining}h left`;
    } else {
      const daysRemaining = Math.floor(hoursRemaining / 24);
      return `${daysRemaining}d left`;
    }
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
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Pending Message Bids</h1>
        <p className="text-muted-foreground">
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
          <div className="flex items-center justify-between">
            <Badge variant="outline" className="gap-1">
              <Mail className="h-3 w-3" />
              {messages.length} pending bid{messages.length !== 1 ? 's' : ''}
            </Badge>
            <span className="text-xs text-muted-foreground">
              Sorted by bid amount (highest first)
            </span>
          </div>

          {messages.map((message) => {
            const isExpired = new Date(message.expiresAt) < new Date();
            const isProcessing = acceptMutation.isPending || declineMutation.isPending;

            return (
              <Card key={message.id} className="p-6" data-testid={`card-message-${message.id}`}>
                <div className="space-y-4">
                  {/* Header with bid amount and sender */}
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-semibold text-lg" data-testid={`text-sender-${message.id}`}>
                          {message.senderName}
                        </h3>
                        {message.senderEmail && (
                          <span className="text-sm text-muted-foreground">
                            {message.senderEmail}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        <span>Sent {new Date(message.sentAt).toLocaleDateString()}</span>
                        <span>•</span>
                        <span className={isExpired ? "text-destructive" : ""}>
                          {formatTimeRemaining(message.expiresAt)}
                        </span>
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <div className="flex items-center gap-1 mb-1">
                        <DollarSign className="h-5 w-5 text-primary" />
                        <span className="text-2xl font-bold tabular-nums" data-testid={`text-bid-${message.id}`}>
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

                  {/* Message content */}
                  <div className="border-t pt-4">
                    <p className="text-sm whitespace-pre-wrap" data-testid={`text-content-${message.id}`}>
                      {message.content}
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="border-t pt-4 flex gap-2">
                    <Button
                      variant="outline"
                      className="flex-1 gap-2"
                      onClick={() => declineMutation.mutate(message.id)}
                      disabled={isProcessing || isExpired}
                      data-testid={`button-decline-${message.id}`}
                    >
                      <XCircle className="h-4 w-4" />
                      Decline
                    </Button>
                    <Button
                      className="flex-1 gap-2"
                      onClick={() => acceptMutation.mutate(message.id)}
                      disabled={isProcessing || isExpired}
                      data-testid={`button-accept-${message.id}`}
                    >
                      <CheckCircle className="h-4 w-4" />
                      Accept ${parseFloat(message.bidUsd).toFixed(2)}
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
