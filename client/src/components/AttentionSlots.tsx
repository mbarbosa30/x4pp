import { Circle } from "lucide-react";

interface AttentionSlotsProps {
  totalSlots: number;
  usedSlots: number;
  timeWindow?: "hour" | "day" | "week";
}

export default function AttentionSlots({ totalSlots, usedSlots, timeWindow = "hour" }: AttentionSlotsProps) {
  const availableSlots = totalSlots - usedSlots;
  
  return (
    <div className="flex items-center gap-4" data-testid="attention-slots">
      <div className="flex gap-2">
        {Array.from({ length: totalSlots }).map((_, i) => (
          <div
            key={i}
            className={`h-8 w-8 rounded-full border-2 flex items-center justify-center transition-colors ${
              i < usedSlots
                ? "bg-success/20 border-success"
                : "bg-muted/20 border-border"
            }`}
            data-testid={`slot-${i}`}
          >
            <Circle
              className={`h-4 w-4 ${
                i < usedSlots ? "fill-success text-success" : "text-muted-foreground"
              }`}
            />
          </div>
        ))}
      </div>
      <div className="text-sm">
        <span className="font-semibold" data-testid="text-available-slots">{availableSlots}</span>
        <span className="text-muted-foreground"> of {totalSlots} slots available this {timeWindow}</span>
      </div>
    </div>
  );
}
