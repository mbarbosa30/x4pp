import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Loader2, CheckCircle, XCircle, DollarSign } from "lucide-react";

interface PaymentModalProps {
  open: boolean;
  onClose: () => void;
  amount: number;
  recipient: string;
  onConfirm?: () => void;
}

type PaymentStatus = "idle" | "confirming" | "processing" | "success" | "error";

export default function PaymentModal({
  open,
  onClose,
  amount,
  recipient,
  onConfirm,
}: PaymentModalProps) {
  const [status, setStatus] = useState<PaymentStatus>("idle");

  const handleConfirm = () => {
    setStatus("confirming");
    console.log("Requesting wallet signature...");
    
    setTimeout(() => {
      setStatus("processing");
      console.log("Processing payment...");
      
      setTimeout(() => {
        setStatus("success");
        console.log("Payment successful!");
        if (onConfirm) onConfirm();
        
        setTimeout(() => {
          onClose();
          setStatus("idle");
        }, 2000);
      }, 2000);
    }, 1500);
  };

  const basePrice = amount * 0.7;
  const surge = amount * 0.25;
  const fee = amount * 0.05;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md" data-testid="modal-payment">
        <DialogHeader>
          <DialogTitle>Confirm Payment</DialogTitle>
          <DialogDescription>
            Review payment details before confirming
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Recipient</span>
              <span className="font-mono text-xs" data-testid="text-recipient">{recipient.slice(0, 10)}...</span>
            </div>
            <Separator />
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Base price</span>
              <span data-testid="text-base-price">${basePrice.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Surge pricing</span>
              <span data-testid="text-surge">${surge.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Service fee</span>
              <span data-testid="text-fee">${fee.toFixed(2)}</span>
            </div>
            <Separator />
            <div className="flex justify-between">
              <span className="font-semibold">Total</span>
              <div className="flex items-center gap-1">
                <DollarSign className="h-4 w-4 text-price" />
                <span className="text-xl font-bold tabular-nums text-price" data-testid="text-total">
                  {amount.toFixed(2)}
                </span>
                <span className="text-sm text-muted-foreground ml-1">USDC</span>
              </div>
            </div>
          </div>

          {status === "idle" && (
            <Button onClick={handleConfirm} className="w-full" size="lg" data-testid="button-confirm-payment">
              Confirm Payment
            </Button>
          )}

          {status === "confirming" && (
            <div className="flex items-center justify-center gap-3 py-4">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
              <span className="text-sm">Waiting for wallet confirmation...</span>
            </div>
          )}

          {status === "processing" && (
            <div className="flex items-center justify-center gap-3 py-4">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
              <span className="text-sm">Processing payment...</span>
            </div>
          )}

          {status === "success" && (
            <div className="flex items-center justify-center gap-3 py-4 text-success">
              <CheckCircle className="h-5 w-5" />
              <span className="text-sm font-medium">Payment successful!</span>
            </div>
          )}

          {status === "error" && (
            <div className="flex items-center justify-center gap-3 py-4 text-destructive">
              <XCircle className="h-5 w-5" />
              <span className="text-sm font-medium">Payment failed. Please try again.</span>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
