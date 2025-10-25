import { useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useWallet } from "@/providers/WalletProvider";

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isConnected } = useWallet();
  const [, setLocation] = useLocation();

  // Check if user has a valid session
  const { data: currentUser, isLoading, error } = useQuery({
    queryKey: ['/api/auth/me'],
    enabled: true, // Always check session
    retry: false,
    refetchOnWindowFocus: true,
  });

  useEffect(() => {
    // If not loading and no user session, redirect to landing
    if (!isLoading && !currentUser) {
      console.log('[ProtectedRoute] No session found, redirecting to landing');
      setLocation('/');
    }
  }, [isLoading, currentUser, setLocation]);

  // Show loading state while checking auth
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center space-y-3">
          <div className="animate-spin h-8 w-8 border-3 border-primary border-t-transparent rounded-full mx-auto" />
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // Don't render protected content if no session
  if (!currentUser) {
    return null;
  }

  // Render protected content
  return <>{children}</>;
}
