import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { Clock, XCircle, Archive, DollarSign } from "lucide-react";

interface ArchivedMessage {
  id: number;
  senderName: string;
  senderEmail: string | null;
  senderDisplayName: string | null;
  senderUsername: string | null;
  senderWallet: string;
  content: string;
  bidUsd: string;
  replyBounty: string | null;
  status: string;
  sentAt: string;
  expiresAt: string;
  declinedAt: string | null;
}

export default function InboxArchived() {
  const { user, isAuthenticated } = useAuth();

  const { data: messages = [], isLoading, refetch } = useQuery<ArchivedMessage[]>({
    queryKey: ['/api/messages/archived'],
    enabled: isAuthenticated,
  });

  const getSenderDisplayInfo = (message: ArchivedMessage) => {
    const isRegistered = !!message.senderUsername;
    
    if (isRegistered) {
      return {
        name: message.senderDisplayName || message.senderUsername || 'Unknown',
        username: message.senderUsername,
        isRegistered: true,
      };
    }
    
    return {
      name: `${message.senderWallet.slice(0, 6)}...${message.senderWallet.slice(-4)}`,
      username: null,
      isRegistered: false,
    };
  };

  const getStatusInfo = (message: ArchivedMessage) => {
    if (message.status === 'declined') {
      return {
        icon: <XCircle className="h-4 w-4" />,
        label: 'Declined',
        variant: 'destructive' as const,
        description: message.declinedAt 
          ? `Declined on ${new Date(message.declinedAt).toLocaleDateString()}`
          : 'You declined this message',
      };
    }
    
    return {
      icon: <Clock className="h-4 w-4" />,
      label: 'Expired',
      variant: 'outline' as const,
      description: message.expiresAt
        ? `Expired on ${new Date(message.expiresAt).toLocaleDateString()}`
        : 'This message expired',
    };
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="p-6 max-w-md">
          <p className="text-center text-muted-foreground">Please log in to view archived messages</p>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-muted-foreground">Loading archived messages...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Archive className="h-8 w-8" />
              Archive
            </h1>
            <p className="text-muted-foreground mt-2">Expired and declined messages</p>
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => refetch()}
            disabled={isLoading}
            data-testid="button-refresh-archive"
          >
            Refresh
          </Button>
        </div>

        {messages.length === 0 ? (
          <Card className="p-8">
            <div className="text-center">
              <Archive className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No archived messages</h3>
              <p className="text-muted-foreground">Expired and declined messages will appear here</p>
            </div>
          </Card>
        ) : (
          <div className="space-y-4">
            {messages.map((message) => {
              const senderInfo = getSenderDisplayInfo(message);
              const statusInfo = getStatusInfo(message);

              return (
                <Card key={message.id} className="p-4 sm:p-6 opacity-75" data-testid={`card-archived-${message.id}`}>
                  <div className="space-y-4">
                    {/* Header */}
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 sm:gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 mb-2">
                          <h3 
                            className={`font-semibold text-base sm:text-lg truncate ${!senderInfo.isRegistered ? 'font-mono' : ''}`}
                            data-testid={`text-sender-${message.id}`}
                          >
                            From: {senderInfo.name}
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
                        <p className="text-sm text-muted-foreground line-clamp-2" data-testid={`text-content-${message.id}`}>
                          {message.content}
                        </p>
                      </div>
                      
                      <Badge 
                        variant={statusInfo.variant} 
                        className="flex items-center gap-1 shrink-0"
                        data-testid={`badge-status-${message.id}`}
                      >
                        {statusInfo.icon}
                        {statusInfo.label}
                      </Badge>
                    </div>

                    {/* Metadata */}
                    <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <DollarSign className="h-4 w-4" />
                        <span className="font-medium text-foreground">${parseFloat(message.bidUsd).toFixed(2)}</span>
                        <span>bid</span>
                      </div>
                      {message.replyBounty && parseFloat(message.replyBounty) > 0 && (
                        <div className="flex items-center gap-1">
                          <span>+</span>
                          <span className="font-medium text-foreground">${parseFloat(message.replyBounty).toFixed(2)}</span>
                          <span>reply bounty</span>
                        </div>
                      )}
                      <div className="flex items-center gap-2">
                        <Clock className="h-3 w-3" />
                        <span>Sent {new Date(message.sentAt).toLocaleDateString()}</span>
                      </div>
                      <span>•</span>
                      <span>{statusInfo.description}</span>
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
