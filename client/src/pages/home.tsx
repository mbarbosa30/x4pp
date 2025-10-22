import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Mail, Inbox, Settings as SettingsIcon, LogOut } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useWallet } from "@/providers/WalletProvider";
import InboxPending from "@/pages/inbox-pending";
import SettingsPanel from "@/components/SettingsPanel";
import { Link } from "wouter";

export default function Home() {
  const [activeTab, setActiveTab] = useState("inbox");
  const { user, isAuthenticated, isLoading } = useAuth();
  const { disconnect } = useWallet();
  const { toast } = useToast();

  const logoutMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/auth/logout", {});
      return response.json();
    },
    onSuccess: () => {
      disconnect();
      queryClient.clear();
      toast({
        title: "Logged out",
        description: "You've been logged out successfully",
      });
      window.location.href = "/";
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to log out",
        variant: "destructive",
      });
    },
  });

  const handleLogout = () => {
    logoutMutation.mutate();
  };

  // Show loading state while checking auth
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  // Show login prompt ONLY if we're done checking AND not authenticated
  if (!isLoading && (!isAuthenticated || !user)) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="p-8 max-w-md w-full text-center space-y-4">
          <Mail className="h-16 w-16 mx-auto text-primary" />
          <h1 className="text-2xl font-bold">Welcome to x4pp</h1>
          <p className="text-muted-foreground">
            Please log in to access your message dashboard
          </p>
          <div className="pt-4">
            <Link href="/">
              <Button className="w-full" data-testid="button-go-home">
                Go to Home
              </Button>
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  // At this point we're guaranteed to have a user (TypeScript safety)
  if (!user) return null;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b backdrop-blur-lg bg-background/95">
        <div className="container mx-auto px-4 h-14 sm:h-16 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
            <Mail className="h-5 w-5 sm:h-6 sm:w-6 text-primary flex-shrink-0" />
            <div className="min-w-0">
              <h1 className="text-base sm:text-xl font-semibold">x4pp</h1>
              <p className="text-xs text-muted-foreground truncate">@{user.username}</p>
            </div>
          </div>
          <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
            <Link href="/send">
              <Button variant="outline" size="sm" data-testid="button-send-message" className="text-xs sm:text-sm">
                Send Message
              </Button>
            </Link>
            <Link href="/profile">
              <Button variant="ghost" size="sm" data-testid="button-profile" className="text-xs sm:text-sm">
                <span className="hidden sm:inline">Profile</span>
                <span className="sm:hidden">P</span>
              </Button>
            </Link>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleLogout}
              disabled={logoutMutation.isPending}
              data-testid="button-logout"
              className="h-8 w-8 sm:h-10 sm:w-10"
            >
              <LogOut className="h-4 w-4 sm:h-5 sm:w-5" />
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6">
        <div className="max-w-6xl mx-auto">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-6 w-full sm:w-auto grid grid-cols-2 sm:flex h-11">
              <TabsTrigger value="inbox" data-testid="tab-inbox" className="gap-2">
                <Inbox className="h-4 w-4" />
                <span className="hidden sm:inline">Inbox</span>
              </TabsTrigger>
              <TabsTrigger value="settings" data-testid="tab-settings" className="gap-2">
                <SettingsIcon className="h-4 w-4" />
                <span className="hidden sm:inline">Settings</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="inbox" className="mt-0">
              <InboxPending />
            </TabsContent>

            <TabsContent value="settings" className="mt-0">
              <div className="max-w-4xl mx-auto p-4 sm:p-6">
                <div className="mb-6">
                  <h1 className="text-2xl sm:text-3xl font-bold mb-2">Settings</h1>
                  <p className="text-sm sm:text-base text-muted-foreground">
                    Configure your attention market pricing and preferences
                  </p>
                </div>
                <SettingsPanel />
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
}
