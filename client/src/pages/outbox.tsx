import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Clock, CheckCircle, XCircle, Mail, Shield } from "lucide-react";

interface SentMessage {
  id: string;
  recipientWallet: string;
  content: string;
  bidUsd: string;
  replyBounty: string | null;
  status: string;
  sentAt: string;
  expiresAt: string;
  acceptedAt: string | null;
  declinedAt: string | null;
  recipientDisplayName: string | null;
  recipientUsername: string | null;
}

export default function Outbox() {
  const { isAuthenticated, user } = useAuth();

  const { data: messages = [], isLoading, error, refetch } = useQuery<SentMessage[]>({
    queryKey: ['/api/messages/sent'],
    enabled: isAuthenticated,
    staleTime: 0, // Always fetch fresh data
    gcTime: 0, // Don't cache
    refetchOnMount: 'always', // Always refetch when component mounts
  });

  console.log('[Outbox] Component state:', {
    isAuthenticated,
    userId: user?.id,
    username: user?.username,
    userWallet: user?.walletAddress,
    messageCount: messages?.length,
    isLoading,
    hasError: !!error,
    errorMessage: error ? String(error) : null,
  });

  const getRecipientDisplayInfo = (message: SentMessage) => {
    if (message.recipientUsername) {
      return {
        primary: message.recipientDisplayName || message.recipientUsername,
        secondary: `@${message.recipientUsername}`,
      };
    }
    return {
      primary: `${message.recipientWallet.slice(0, 6)}...${message.recipientWallet.slice(-4)}`,
      secondary: null,
    };
  };

  const getStatusInfo = (message: SentMessage) => {
    switch (message.status) {
      case 'pending':
        return {
          icon: <Clock className="h-4 w-4" />,
          label: 'Pending',
          variant: 'secondary' as const,
        };
      case 'accepted':
        return {
          icon: <CheckCircle className="h-4 w-4" />,
          label: 'Accepted',
          variant: 'default' as const,
        };
      case 'declined':
        return {
          icon: <XCircle className="h-4 w-4" />,
          label: 'Declined',
          variant: 'destructive' as const,
        };
      case 'expired':
        return {
          icon: <Clock className="h-4 w-4" />,
          label: 'Expired',
          variant: 'outline' as const,
        };
      default:
        return {
          icon: <Mail className="h-4 w-4" />,
          label: message.status,
          variant: 'outline' as const,
        };
    }
  };

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

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="p-6 max-w-md">
          <p className="text-center text-muted-foreground">Please log in to view your sent messages</p>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-muted-foreground">Loading sent messages...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="p-6 max-w-md">
          <h3 className="text-lg font-medium mb-2 text-destructive">Error loading messages</h3>
          <p className="text-sm text-muted-foreground">{String(error)}</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Sent Messages</h1>
            <p className="text-muted-foreground mt-2">Track your outgoing bids</p>
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => refetch()}
            disabled={isLoading}
            data-testid="button-refresh-outbox"
          >
            Refresh
          </Button>
        </div>

        {messages.length === 0 ? (
          <Card className="p-8">
            <div className="text-center">
              <Mail className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No sent messages</h3>
              <p className="text-muted-foreground">Messages you send will appear here</p>
              {user?.walletAddress && (
                <p className="text-xs text-muted-foreground mt-4">
                  Wallet: {user.walletAddress.slice(0, 6)}...{user.walletAddress.slice(-4)}
                </p>
              )}
            </div>
          </Card>
        ) : (
          <div className="space-y-4">
            {messages.map((message) => {
              const recipientInfo = getRecipientDisplayInfo(message);
              const statusInfo = getStatusInfo(message);
              const isExpired = new Date(message.expiresAt) < new Date();

              return (
                <Card key={message.id} className="p-4" data-testid={`message-${message.id}`}>
                  <div className="flex flex-col gap-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium" data-testid={`text-recipient-${message.id}`}>
                            To: {recipientInfo.primary}
                          </span>
                          {recipientInfo.secondary && (
                            <span className="text-sm text-muted-foreground">
                              {recipientInfo.secondary}
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground line-clamp-2" data-testid={`text-content-${message.id}`}>
                          {message.content}
                        </p>
                      </div>
                      <Badge variant={statusInfo.variant} className="flex items-center gap-1 shrink-0" data-testid={`badge-status-${message.id}`}>
                        {statusInfo.icon}
                        {statusInfo.label}
                      </Badge>
                    </div>

                    <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <span className="font-medium text-foreground">${message.bidUsd}</span>
                        <span>bid</span>
                      </div>
                      {message.replyBounty && parseFloat(message.replyBounty) > 0 && (
                        <div className="flex items-center gap-1">
                          <span>+</span>
                          <span className="font-medium text-foreground">${message.replyBounty}</span>
                          <span>reply bounty</span>
                        </div>
                      )}
                      <div className="flex items-center gap-2">
                        <Clock className="h-3 w-3" />
                        <span>Sent {new Date(message.sentAt).toLocaleDateString()}</span>
                      </div>
                      {message.status === 'pending' && !isExpired && (
                        <>
                          <span>•</span>
                          <span data-testid={`text-time-remaining-${message.id}`}>
                            {formatTimeRemaining(message.expiresAt)}
                          </span>
                        </>
                      )}
                      {message.acceptedAt && (
                        <>
                          <span>•</span>
                          <span className="text-green-600 dark:text-green-400">
                            Accepted {new Date(message.acceptedAt).toLocaleDateString()}
                          </span>
                        </>
                      )}
                      {message.declinedAt && (
                        <>
                          <span>•</span>
                          <span className="text-destructive">
                            Declined {new Date(message.declinedAt).toLocaleDateString()}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
