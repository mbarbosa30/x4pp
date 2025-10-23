import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { CheckCircle, DollarSign, Mail, Calendar } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface AcceptedMessage {
  id: string;
  senderWallet: string;
  senderName: string;
  senderDisplayName: string | null;
  senderUsername: string | null;
  content: string;
  bidUsd: string;
  acceptedAt: string;
  sentAt: string;
}

export default function InboxAccepted() {
  const { isAuthenticated } = useAuth();

  const { data: messages = [], isLoading } = useQuery<AcceptedMessage[]>({
    queryKey: ['/api/messages/accepted'],
    enabled: isAuthenticated,
  });

  const formatSenderName = (message: AcceptedMessage) => {
    if (message.senderDisplayName) return message.senderDisplayName;
    if (message.senderUsername) return message.senderUsername;
    return `${message.senderWallet.slice(0, 6)}...${message.senderWallet.slice(-4)}`;
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="p-8 max-w-md w-full">
          <h2 className="text-xl font-semibold mb-2">Login Required</h2>
          <p className="text-muted-foreground">Connect your wallet to view accepted messages.</p>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-muted-foreground">Loading messages...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto p-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2" data-testid="text-heading">Accepted Messages</h1>
          <p className="text-muted-foreground">Messages you've received and accepted</p>
        </div>

        {messages.length === 0 ? (
          <Card className="p-12">
            <div className="text-center">
              <Mail className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-2">No accepted messages yet</h3>
              <p className="text-muted-foreground">
                Messages you accept will appear here
              </p>
            </div>
          </Card>
        ) : (
          <div className="space-y-4">
            {messages.map((message) => (
              <Card key={message.id} className="p-6" data-testid={`card-message-${message.id}`}>
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold" data-testid={`text-sender-${message.id}`}>
                        {formatSenderName(message)}
                      </h3>
                      <Badge variant="secondary" className="flex items-center gap-1" data-testid={`badge-status-${message.id}`}>
                        <CheckCircle className="h-3 w-3" />
                        Accepted
                      </Badge>
                    </div>
                    {message.senderUsername && (
                      <p className="text-sm text-muted-foreground" data-testid={`text-username-${message.id}`}>
                        @{message.senderUsername}
                      </p>
                    )}
                  </div>
                  <div className="text-right">
                    <div className="flex items-center gap-1 text-sm font-semibold mb-1" data-testid={`text-bid-${message.id}`}>
                      <DollarSign className="h-4 w-4" />
                      {parseFloat(message.bidUsd).toFixed(2)}
                    </div>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground" data-testid={`text-accepted-${message.id}`}>
                      <Calendar className="h-3 w-3" />
                      {formatDistanceToNow(new Date(message.acceptedAt), { addSuffix: true })}
                    </div>
                  </div>
                </div>

                <div className="bg-muted/30 rounded-lg p-4">
                  <p className="text-sm whitespace-pre-wrap break-words" data-testid={`text-content-${message.id}`}>
                    {message.content}
                  </p>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
