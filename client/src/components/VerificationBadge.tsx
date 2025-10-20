import { ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface VerificationBadgeProps {
  verified: boolean;
  size?: "sm" | "md" | "lg";
}

export default function VerificationBadge({ verified, size = "sm" }: VerificationBadgeProps) {
  if (!verified) return null;

  const iconSize = size === "sm" ? "h-3 w-3" : size === "md" ? "h-4 w-4" : "h-5 w-5";
  
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Badge 
          variant="outline" 
          className="bg-success/10 border-success/20 text-success hover:bg-success/20" 
          data-testid="badge-verified"
        >
          <ShieldCheck className={`${iconSize} mr-1`} />
          {size !== "sm" && <span>Verified</span>}
        </Badge>
      </TooltipTrigger>
      <TooltipContent>
        <p>Verified human</p>
      </TooltipContent>
    </Tooltip>
  );
}
