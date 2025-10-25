import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { WalletProvider } from "@/providers/WalletProvider";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import Landing from "@/pages/landing";
import Home from "@/pages/home";
import Send from "@/pages/send";
import PublicMessage from "@/pages/public-message";
import AdminDashboard from "@/pages/admin/dashboard";
import Profile from "@/pages/profile";
import Register from "@/pages/register";
import InboxPending from "@/pages/inbox-pending";
import InboxAccepted from "@/pages/inbox-accepted";
import Outbox from "@/pages/outbox";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      {/* Public routes - specific paths first */}
      <Route path="/" component={Landing} />
      <Route path="/send" component={Send} />
      <Route path="/register" component={Register} />
      
      {/* Protected routes - require authentication */}
      <Route path="/app">
        <ProtectedRoute>
          <Home />
        </ProtectedRoute>
      </Route>
      <Route path="/profile">
        <ProtectedRoute>
          <Profile />
        </ProtectedRoute>
      </Route>
      <Route path="/inbox">
        <ProtectedRoute>
          <InboxPending />
        </ProtectedRoute>
      </Route>
      <Route path="/inbox/accepted">
        <ProtectedRoute>
          <InboxAccepted />
        </ProtectedRoute>
      </Route>
      <Route path="/outbox">
        <ProtectedRoute>
          <Outbox />
        </ProtectedRoute>
      </Route>
      <Route path="/admin">
        <ProtectedRoute>
          <AdminDashboard />
        </ProtectedRoute>
      </Route>
      
      {/* Catch-all for usernames and wallet addresses - must be last */}
      <Route path="/:identifier" component={PublicMessage} />
      
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <WalletProvider>
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </WalletProvider>
    </QueryClientProvider>
  );
}

export default App;
