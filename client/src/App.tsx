import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { WalletProvider } from "@/providers/WalletProvider";
import Landing from "@/pages/landing";
import Home from "@/pages/home";
import Send from "@/pages/send";
import PublicMessage from "@/pages/public-message";
import AdminDashboard from "@/pages/admin/dashboard";
import Profile from "@/pages/profile";
import Register from "@/pages/register";
import InboxPending from "@/pages/inbox-pending";
import Outbox from "@/pages/outbox";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Landing} />
      <Route path="/app" component={Home} />
      <Route path="/send" component={Send} />
      <Route path="/register" component={Register} />
      <Route path="/profile" component={Profile} />
      <Route path="/inbox" component={InboxPending} />
      <Route path="/outbox" component={Outbox} />
      <Route path="/admin" component={AdminDashboard} />
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
