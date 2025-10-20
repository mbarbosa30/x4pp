import { useState } from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Clock, DollarSign } from "lucide-react";
import VerificationBadge from "./VerificationBadge";
import ReputationBadge from "./ReputationBadge";

interface MessageCardProps {
  id: string;
  senderName: string;
  senderVerified: boolean;
  messagePreview: string;
  amount: number;
  timeRemaining: string;
  opened: boolean;
  onClick?: () => void;
  reputation?: {
    openRate?: number;
    replyRate?: number;
    vouchCount?: number;
    totalSent?: number;
  };
}

export default function MessageCard({
  id,
  senderName,
  senderVerified,
  messagePreview,
  amount,
  timeRemaining,
  opened,
  onClick,
  reputation,
}: MessageCardProps) {
  const [isHovered, setIsHovered] = useState(false);

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  return (
    <Card
      className={`p-3 md:p-4 cursor-pointer transition-all hover-elevate active-elevate-2 ${
        !opened ? "bg-card border-primary/20" : "opacity-75"
      }`}
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      data-testid={`message-card-${id}`}
    >
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
        {/* Header row on mobile, left side on desktop */}
        <div className="flex items-center gap-3 sm:gap-4 flex-1 min-w-0">
          <Avatar className="h-10 w-10 sm:h-12 sm:w-12 flex-shrink-0">
            <AvatarFallback className="bg-primary/10 text-primary font-medium text-sm sm:text-base">
              {getInitials(senderName)}
            </AvatarFallback>
          </Avatar>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className={`text-sm ${!opened ? "font-semibold" : ""}`} data-testid="text-sender">
                {senderName}
              </span>
              <VerificationBadge verified={senderVerified} size="sm" />
            </div>
            <p className={`text-sm text-muted-foreground line-clamp-1 ${!opened ? "font-medium text-foreground" : ""}`} data-testid="text-preview">
              {messagePreview}
            </p>
            {/* Reputation badge on mobile below name */}
            {reputation && (
              <div className="mt-1 sm:hidden">
                <ReputationBadge
                  openRate={reputation.openRate}
                  replyRate={reputation.replyRate}
                  vouchCount={reputation.vouchCount}
                  totalSent={reputation.totalSent}
                  showFor="sender"
                  compact={true}
                />
              </div>
            )}
          </div>
        </div>

        {/* Amount and time on mobile as second row, desktop as right column */}
        <div className="flex items-center justify-between sm:flex-col sm:items-end gap-2 sm:flex-shrink-0">
          <Badge variant="outline" className="bg-price/10 border-price/20 text-price font-semibold text-xs sm:text-sm" data-testid="badge-amount">
            <DollarSign className="h-3 w-3 mr-0.5" />
            {amount.toFixed(2)}
          </Badge>
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Clock className="h-3 w-3" />
            <span data-testid="text-time-remaining">{timeRemaining}</span>
          </div>
        </div>

        {/* Reputation on desktop only (inline with content) */}
        {reputation && (
          <div className="hidden sm:block">
            <ReputationBadge
              openRate={reputation.openRate}
              replyRate={reputation.replyRate}
              vouchCount={reputation.vouchCount}
              totalSent={reputation.totalSent}
              showFor="sender"
              compact={true}
            />
          </div>
        )}
      </div>

      {!opened && (
        <div className="mt-3 h-1 bg-muted rounded-full overflow-hidden">
          <div className="h-full bg-success transition-all" style={{ width: "65%" }} />
        </div>
      )}
    </Card>
  );
}
