import { useState } from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Clock, DollarSign } from "lucide-react";
import VerificationBadge from "./VerificationBadge";

interface MessageCardProps {
  id: string;
  senderAddress: string;
  senderVerified: boolean;
  messagePreview: string;
  amount: number;
  timeRemaining: string;
  opened: boolean;
  onClick?: () => void;
}

export default function MessageCard({
  id,
  senderAddress,
  senderVerified,
  messagePreview,
  amount,
  timeRemaining,
  opened,
  onClick,
}: MessageCardProps) {
  const [isHovered, setIsHovered] = useState(false);

  const getInitials = (address: string) => {
    return address.slice(2, 4).toUpperCase();
  };

  return (
    <Card
      className={`p-4 cursor-pointer transition-all hover-elevate ${
        !opened ? "bg-card border-primary/20" : "opacity-75"
      }`}
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      data-testid={`message-card-${id}`}
    >
      <div className="flex items-center gap-4">
        <Avatar className="h-12 w-12">
          <AvatarFallback className="bg-primary/10 text-primary font-medium">
            {getInitials(senderAddress)}
          </AvatarFallback>
        </Avatar>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className={`font-mono text-sm ${!opened ? "font-semibold" : ""}`} data-testid="text-sender">
              {senderAddress}
            </span>
            <VerificationBadge verified={senderVerified} size="sm" />
          </div>
          <p className={`text-sm text-muted-foreground truncate ${!opened ? "font-medium text-foreground" : ""}`} data-testid="text-preview">
            {messagePreview}
          </p>
        </div>

        <div className="flex flex-col items-end gap-2">
          <Badge variant="outline" className="bg-price/10 border-price/20 text-price font-semibold" data-testid="badge-amount">
            <DollarSign className="h-3 w-3 mr-0.5" />
            {amount.toFixed(2)}
          </Badge>
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Clock className="h-3 w-3" />
            <span data-testid="text-time-remaining">{timeRemaining}</span>
          </div>
        </div>
      </div>

      {!opened && (
        <div className="mt-3 h-1 bg-muted rounded-full overflow-hidden">
          <div className="h-full bg-success transition-all" style={{ width: "65%" }} />
        </div>
      )}
    </Card>
  );
}
