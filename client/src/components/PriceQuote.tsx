import { DollarSign, TrendingUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface PriceQuoteProps {
  verifiedPrice: number;
  unverifiedPrice: number;
  isVerified: boolean;
  surgeMultiplier?: number;
  className?: string;
}

export default function PriceQuote({ 
  verifiedPrice, 
  unverifiedPrice, 
  isVerified,
  surgeMultiplier = 1,
  className = ""
}: PriceQuoteProps) {
  const currentPrice = isVerified ? verifiedPrice : unverifiedPrice;
  const hasSurge = surgeMultiplier > 1;

  return (
    <div className={`flex items-center gap-3 ${className}`} data-testid="price-quote">
      <div className="flex items-baseline gap-2">
        <div className="flex items-center">
          <DollarSign className="h-4 w-4 text-price opacity-70" />
          <span className="text-3xl font-bold tabular-nums text-price" data-testid="text-current-price">
            {currentPrice.toFixed(2)}
          </span>
        </div>
        <span className="text-sm text-muted-foreground">USDC</span>
      </div>
      
      {hasSurge && (
        <Badge variant="outline" className="bg-warning/10 border-warning/20 text-warning">
          <TrendingUp className="h-3 w-3 mr-1" />
          {surgeMultiplier}x surge
        </Badge>
      )}
      
      {!isVerified && verifiedPrice < unverifiedPrice && (
        <div className="text-sm text-muted-foreground">
          <span className="line-through">${verifiedPrice.toFixed(2)}</span>
          <span className="ml-2">with verification</span>
        </div>
      )}
    </div>
  );
}
