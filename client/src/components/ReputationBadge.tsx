import { TrendingUp, MessageCircle, CheckCircle2 } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface ReputationBadgeProps {
  openRate?: number;
  replyRate?: number;
  vouchCount?: number;
  totalSent?: number;
  totalReceived?: number;
  showFor?: "sender" | "recipient";
  compact?: boolean;
}

export default function ReputationBadge({
  openRate = 0,
  replyRate = 0,
  vouchCount = 0,
  totalSent = 0,
  totalReceived = 0,
  showFor = "sender",
  compact = false,
}: ReputationBadgeProps) {
  const hasEnoughData = showFor === "sender" ? totalSent >= 3 : totalReceived >= 3;

  if (!hasEnoughData && vouchCount === 0) {
    return null;
  }

  const openPercentage = Math.round(openRate * 100);
  const replyPercentage = Math.round(replyRate * 100);

  if (compact) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            {hasEnoughData && (
              <>
                <MessageCircle className="h-3 w-3" />
                <span>{replyPercentage}%</span>
              </>
            )}
            {vouchCount > 0 && (
              <>
                <CheckCircle2 className="h-3 w-3 text-success" />
                <span>{vouchCount}</span>
              </>
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <div className="text-xs space-y-1">
            {hasEnoughData && (
              <>
                <p>Opens: {openPercentage}%</p>
                <p>Replies: {replyPercentage}%</p>
              </>
            )}
            {vouchCount > 0 && <p>{vouchCount} vouches</p>}
          </div>
        </TooltipContent>
      </Tooltip>
    );
  }

  return (
    <div className="flex items-center gap-3 text-xs text-muted-foreground" data-testid="reputation-badge">
      {hasEnoughData && (
        <>
          <div className="flex items-center gap-1">
            <TrendingUp className="h-3 w-3" />
            <span>Opens: {openPercentage}%</span>
          </div>
          <div className="flex items-center gap-1">
            <MessageCircle className="h-3 w-3" />
            <span>Replies: {replyPercentage}%</span>
          </div>
        </>
      )}
      {vouchCount > 0 && (
        <div className="flex items-center gap-1 text-success">
          <CheckCircle2 className="h-3 w-3" />
          <span>{vouchCount} {vouchCount === 1 ? "vouch" : "vouches"}</span>
        </div>
      )}
    </div>
  );
}
