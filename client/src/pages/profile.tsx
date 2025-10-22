import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Link } from "wouter";
import {
  Mail,
  DollarSign,
  Clock,
  Copy,
  Settings,
  ExternalLink,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import VerificationBadge from "@/components/VerificationBadge";

interface ProfileData {
  id: string;
  username: string;
  displayName: string;
  verified: boolean;
  walletAddress: string | null;
  minBasePrice: string;
  slaHours: number;
  stats: {
    messagesReceived: number;
    messagesOpened: number;
    totalEarned: string;
  };
  reputation: {
    openRate: number;
    replyRate: number;
    vouchCount: number;
    recipientScore: number;
  } | null;
}

export default function Profile() {
  const { toast } = useToast();
  const { user, isAuthenticated, isLoading: isLoadingAuth } = useAuth();
  
  const currentUsername = user?.username;

  const { data: profile, isLoading } = useQuery<ProfileData>({
    queryKey: ['/api/profile', currentUsername],
    enabled: !!currentUsername,
  });

  const copyShareableLink = () => {
    if (!currentUsername) return;
    const link = `${window.location.origin}/@${currentUsername}`;
    navigator.clipboard.writeText(link);
    toast({
      title: "Link copied!",
      description: "Your shareable profile link has been copied to clipboard",
    });
  };

  // Show loading state
  if (isLoadingAuth || isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-muted-foreground">Loading profile...</div>
      </div>
    );
  }

  // Show login prompt if not authenticated
  if (!isAuthenticated || !user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <p className="text-muted-foreground">Please log in to view your profile</p>
          <Link href="/">
            <Button>Go to Home</Button>
          </Link>
        </div>
      </div>
    );
  }

  // Show error if profile not found
  if (!profile) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <p className="text-muted-foreground">Profile not found</p>
          <Link href="/app">
            <Button>Go to App</Button>
          </Link>
        </div>
      </div>
    );
  }

  const shareableLink = `${window.location.origin}/@${currentUsername}`;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/app">
            <Button variant="ghost" data-testid="button-back">
              ← Back to App
            </Button>
          </Link>
          <Link href="/app">
            <Button variant="outline" data-testid="button-settings">
              <Settings className="h-4 w-4 mr-2" />
              Settings
            </Button>
          </Link>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 max-w-4xl space-y-6">
        {/* Profile Header */}
        <Card className="p-6">
          <div className="flex items-start gap-6">
            <Avatar className="h-20 w-20">
              <AvatarFallback className="bg-primary/10 text-primary font-semibold text-2xl">
                {profile.displayName.charAt(0)}
              </AvatarFallback>
            </Avatar>
            
            <div className="flex-1 space-y-3">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h1 className="text-3xl font-bold" data-testid="text-display-name">{profile.displayName}</h1>
                  <VerificationBadge verified={profile.verified} size="lg" />
                </div>
                <p className="text-muted-foreground">@{profile.username}</p>
              </div>

              <div className="flex flex-wrap gap-2">
                <Badge variant="outline">
                  <DollarSign className="h-3 w-3 mr-1" />
                  ${parseFloat(profile.minBasePrice).toFixed(2)} minimum bid
                </Badge>
                <Badge variant="outline">
                  <Clock className="h-3 w-3 mr-1" />
                  {profile.slaHours}h SLA
                </Badge>
              </div>
            </div>
          </div>
        </Card>

        {/* Shareable Link */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Your Shareable Link</h3>
          <div className="flex gap-2">
            <div className="flex-1 font-mono text-sm bg-muted p-3 rounded border" data-testid="text-shareable-link">
              {shareableLink}
            </div>
            <Button onClick={copyShareableLink} data-testid="button-copy-link">
              <Copy className="h-4 w-4 mr-2" />
              Copy
            </Button>
            <a href={shareableLink} target="_blank" rel="noopener noreferrer">
              <Button variant="outline" data-testid="button-view-public">
                <ExternalLink className="h-4 w-4 mr-2" />
                View
              </Button>
            </a>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Share this link to receive paid messages
          </p>
        </Card>

        {/* Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="p-6">
            <div className="space-y-2">
              <div className="flex items-center text-muted-foreground">
                <Mail className="h-4 w-4 mr-2" />
                <span className="text-sm">Messages Received</span>
              </div>
              <p className="text-3xl font-bold" data-testid="stat-messages-received">{profile.stats.messagesReceived}</p>
            </div>
          </Card>

          <Card className="p-6">
            <div className="space-y-2">
              <div className="flex items-center text-muted-foreground">
                <Mail className="h-4 w-4 mr-2" />
                <span className="text-sm">Messages Opened</span>
              </div>
              <p className="text-3xl font-bold" data-testid="stat-messages-opened">{profile.stats.messagesOpened}</p>
            </div>
          </Card>

          <Card className="p-6">
            <div className="space-y-2">
              <div className="flex items-center text-muted-foreground">
                <DollarSign className="h-4 w-4 mr-2" />
                <span className="text-sm">Total Earned</span>
              </div>
              <p className="text-3xl font-bold text-primary" data-testid="stat-total-earned">${profile.stats.totalEarned}</p>
            </div>
          </Card>
        </div>

        {/* Pricing Configuration */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Pricing Configuration</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Minimum Bid</p>
              <p className="text-2xl font-bold">${parseFloat(profile.minBasePrice).toFixed(2)} USDC</p>
            </div>
            
            <div>
              <p className="text-sm text-muted-foreground mb-1">Response SLA</p>
              <p className="text-2xl font-bold">{profile.slaHours} hours</p>
            </div>
          </div>
        </Card>

        {/* Wallet Info */}
        {profile.walletAddress && (
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Payment Wallet</h3>
            <div className="flex items-center gap-2">
              <p className="font-mono text-sm bg-muted p-3 rounded border flex-1" data-testid="text-wallet-address">
                {profile.walletAddress}
              </p>
              <a 
                href={`https://celoscan.io/address/${profile.walletAddress}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Button variant="outline" size="sm">
                  <ExternalLink className="h-4 w-4 mr-2" />
                  View on Celoscan
                </Button>
              </a>
            </div>
          </Card>
        )}

        {/* Reputation */}
        {profile.reputation && (
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Reputation</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Open Rate</p>
                <p className="text-xl font-bold">{(profile.reputation.openRate * 100).toFixed(0)}%</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">Reply Rate</p>
                <p className="text-xl font-bold">{(profile.reputation.replyRate * 100).toFixed(0)}%</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">Vouches</p>
                <p className="text-xl font-bold">{profile.reputation.vouchCount}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">Score</p>
                <p className="text-xl font-bold">{profile.reputation.recipientScore}</p>
              </div>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
