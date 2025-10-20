import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Reply, Ban, Flag, DollarSign, Clock, ThumbsUp } from "lucide-react";
import VerificationBadge from "./VerificationBadge";
import ReputationBadge from "./ReputationBadge";
import { useToast } from "@/hooks/use-toast";

interface MessageDetailProps {
  senderName: string;
  senderVerified: boolean;
  message: string;
  amount: number;
  timestamp: string;
  replyBounty?: number;
  onReply?: (message: string) => void;
  onBlock?: () => void;
  onReport?: () => void;
  onVouch?: () => void;
  reputation?: {
    openRate?: number;
    replyRate?: number;
    vouchCount?: number;
    totalSent?: number;
  };
}

export default function MessageDetail({
  senderName,
  senderVerified,
  message,
  amount,
  timestamp,
  replyBounty,
  onReply,
  onBlock,
  onReport,
  onVouch,
  reputation,
}: MessageDetailProps) {
  const [replyText, setReplyText] = useState("");
  const [showReply, setShowReply] = useState(false);
  const { toast } = useToast();

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const handleReply = () => {
    if (!replyText.trim()) {
      toast({
        title: "Empty reply",
        description: "Please write a message",
        variant: "destructive",
      });
      return;
    }

    console.log("Replying with:", replyText);
    if (onReply) {
      onReply(replyText);
    }
    
    toast({
      title: "Reply sent",
      description: replyBounty ? `You earned $${replyBounty.toFixed(2)} USDC!` : "Reply delivered",
    });
    
    setReplyText("");
    setShowReply(false);
  };

  const handleVouchClick = () => {
    if (onVouch) {
      onVouch();
      toast({
        title: "Vouch sent",
        description: `You vouched for ${senderName}`,
      });
    }
  };

  return (
    <Card className="p-6">
      <div className="space-y-6">
        <div className="flex items-start gap-4">
          <Avatar className="h-14 w-14">
            <AvatarFallback className="bg-primary/10 text-primary font-medium text-lg">
              {getInitials(senderName)}
            </AvatarFallback>
          </Avatar>

          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <span className="text-sm font-semibold" data-testid="text-sender-address">
                {senderName}
              </span>
              <VerificationBadge verified={senderVerified} size="md" />
            </div>
            {reputation && (
              <div className="mb-2">
                <ReputationBadge
                  openRate={reputation.openRate}
                  replyRate={reputation.replyRate}
                  vouchCount={reputation.vouchCount}
                  totalSent={reputation.totalSent}
                  showFor="sender"
                  compact={false}
                />
              </div>
            )}
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <span data-testid="text-timestamp">{timestamp}</span>
              <Badge variant="outline" className="bg-price/10 border-price/20 text-price">
                <DollarSign className="h-3 w-3 mr-0.5" />
                {amount.toFixed(2)} USDC
              </Badge>
            </div>
          </div>
        </div>

        <div className="prose prose-sm max-w-none">
          <p className="text-foreground whitespace-pre-wrap" data-testid="text-message-body">
            {message}
          </p>
        </div>

        {replyBounty && replyBounty > 0 && (
          <Card className="p-4 bg-success/5 border-success/20">
            <div className="flex items-center gap-2 text-success">
              <DollarSign className="h-4 w-4" />
              <span className="text-sm font-medium">
                Reply bounty: ${replyBounty.toFixed(2)} USDC
              </span>
              <Clock className="h-3 w-3 ml-auto" />
              <span className="text-xs">within 24 hours</span>
            </div>
          </Card>
        )}

        <Separator />

        {!showReply ? (
          <div className="flex items-center gap-3 flex-wrap">
            <Button onClick={() => setShowReply(true)} data-testid="button-reply">
              <Reply className="h-4 w-4 mr-2" />
              Reply
            </Button>
            {onVouch && (
              <Button variant="outline" onClick={handleVouchClick} data-testid="button-vouch">
                <ThumbsUp className="h-4 w-4 mr-2" />
                Vouch
              </Button>
            )}
            <Button variant="outline" onClick={onBlock} data-testid="button-block">
              <Ban className="h-4 w-4 mr-2" />
              Block sender
            </Button>
            <Button variant="ghost" onClick={onReport} data-testid="button-report">
              <Flag className="h-4 w-4 mr-2" />
              Report
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            <Textarea
              placeholder="Write your reply..."
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              className="min-h-24"
              data-testid="input-reply"
            />
            <div className="flex items-center gap-3">
              <Button onClick={handleReply} data-testid="button-send-reply">
                <Reply className="h-4 w-4 mr-2" />
                Send Reply
              </Button>
              <Button variant="ghost" onClick={() => setShowReply(false)} data-testid="button-cancel-reply">
                Cancel
              </Button>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}
