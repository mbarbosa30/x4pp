import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Shield, QrCode as QrCodeIcon, Loader2, CheckCircle } from "lucide-react";

interface VerificationModalProps {
  open: boolean;
  onClose: () => void;
  onVerified?: () => void;
}

type VerificationStatus = "scan" | "verifying" | "verified";

export default function VerificationModal({
  open,
  onClose,
  onVerified,
}: VerificationModalProps) {
  const [status, setStatus] = useState<VerificationStatus>("scan");

  const handleVerify = () => {
    setStatus("verifying");
    console.log("Verifying humanity...");
    
    // TODO: Implement actual Self verification
    setTimeout(() => {
      setStatus("verified");
      console.log("Verified as unique human!");
      if (onVerified) onVerified();
      
      setTimeout(() => {
        onClose();
        setStatus("scan");
      }, 2000);
    }, 3000);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md" data-testid="modal-verification">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-success" />
            Verify Humanity
          </DialogTitle>
          <DialogDescription>
            Scan the QR code with your Self app to verify you're a unique human
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {status === "scan" && (
            <>
              <div className="flex justify-center">
                <div className="p-8 bg-white rounded-lg border-4 border-muted">
                  <div className="w-48 h-48 bg-gradient-to-br from-primary/20 to-success/20 rounded flex items-center justify-center">
                    <QrCodeIcon className="h-32 w-32 text-muted-foreground/30" />
                  </div>
                </div>
              </div>
              <div className="text-center space-y-2">
                <p className="text-sm text-muted-foreground">
                  Scan with Self app to complete verification
                </p>
                <Button onClick={handleVerify} variant="outline" size="sm" data-testid="button-simulate-verify">
                  <QrCodeIcon className="h-4 w-4 mr-2" />
                  Simulate Scan (Demo)
                </Button>
              </div>
            </>
          )}

          {status === "verifying" && (
            <div className="flex flex-col items-center justify-center gap-4 py-8">
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
              <div className="text-center">
                <p className="font-medium">Verifying your humanity...</p>
                <p className="text-sm text-muted-foreground mt-1">
                  This may take a moment
                </p>
              </div>
            </div>
          )}

          {status === "verified" && (
            <div className="flex flex-col items-center justify-center gap-4 py-8 text-success">
              <CheckCircle className="h-12 w-12" />
              <div className="text-center">
                <p className="font-medium text-lg">Verified!</p>
                <p className="text-sm text-muted-foreground mt-1">
                  You're now eligible for discounted rates
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="text-xs text-muted-foreground text-center space-y-1 border-t pt-4">
          <p>✓ No personal data stored</p>
          <p>✓ Proof cached for 30 days</p>
          <p>✓ One verification per unique human</p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
