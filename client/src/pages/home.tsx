import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Mail, Inbox, Send, Settings as SettingsIcon, LogOut } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useWallet } from "@/providers/WalletProvider";
import InboxPending from "@/pages/inbox-pending";
import ComposeMessage from "@/components/ComposeMessage";
import SettingsPanel from "@/components/SettingsPanel";
import { Link } from "wouter";

export default function Home() {
  const [activeTab, setActiveTab] = useState("inbox");
  const { user, isAuthenticated, isLoading: isLoadingAuth } = useAuth();
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

  // Show loading state while checking authentication
  if (isLoadingAuth) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  // Show login prompt if not authenticated
  if (!isAuthenticated || !user) {
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

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b backdrop-blur-lg bg-background/95">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Mail className="h-6 w-6 text-primary" />
            <div>
              <h1 className="text-xl font-semibold">x4pp</h1>
              <p className="text-xs text-muted-foreground">@{user.username}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/profile">
              <Button variant="ghost" data-testid="button-profile">
                Profile
              </Button>
            </Link>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleLogout}
              disabled={logoutMutation.isPending}
              data-testid="button-logout"
            >
              <LogOut className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6">
        <div className="max-w-6xl mx-auto">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-6 w-full sm:w-auto grid grid-cols-3 sm:flex h-11">
              <TabsTrigger value="inbox" data-testid="tab-inbox" className="gap-2">
                <Inbox className="h-4 w-4" />
                <span className="hidden sm:inline">Inbox</span>
              </TabsTrigger>
              <TabsTrigger value="compose" data-testid="tab-compose" className="gap-2">
                <Send className="h-4 w-4" />
                <span className="hidden sm:inline">Compose</span>
              </TabsTrigger>
              <TabsTrigger value="settings" data-testid="tab-settings" className="gap-2">
                <SettingsIcon className="h-4 w-4" />
                <span className="hidden sm:inline">Settings</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="inbox" className="mt-0">
              <InboxPending />
            </TabsContent>

            <TabsContent value="compose" className="mt-0">
              <div className="max-w-4xl mx-auto p-6">
                <div className="mb-6">
                  <h1 className="text-3xl font-bold mb-2">Send Message</h1>
                  <p className="text-muted-foreground">
                    Compose and send a message to someone's attention market
                  </p>
                </div>
                <ComposeMessage isVerified={false} />
              </div>
            </TabsContent>

            <TabsContent value="settings" className="mt-0">
              <div className="max-w-4xl mx-auto p-6">
                <div className="mb-6">
                  <h1 className="text-3xl font-bold mb-2">Settings</h1>
                  <p className="text-muted-foreground">
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
