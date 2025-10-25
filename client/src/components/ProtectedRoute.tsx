import { useEffect, type ReactNode } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { getQueryFn } from "@/lib/queryClient";

interface ProtectedRouteProps {
  children: ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const [, setLocation] = useLocation();

  // Check if user has a valid session
  // Use custom queryFn that returns null on 401 instead of throwing
  const { data: currentUser, isLoading, error, refetch } = useQuery({
    queryKey: ['/api/auth/me'],
    queryFn: getQueryFn({ on401: "returnNull" }),
    enabled: true, // Always check session
    retry: false,
    refetchOnWindowFocus: true,
  });

  useEffect(() => {
    // Only redirect if query succeeded (no error) and there's no user
    // This means 401 was returned (via getQueryFn returning null)
    if (!isLoading && !error && !currentUser) {
      console.log('[ProtectedRoute] No session found (401), redirecting to landing');
      setLocation('/');
    }
  }, [isLoading, currentUser, error, setLocation]);

  // Show loading state while checking auth
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center space-y-3">
          <div className="animate-spin h-8 w-8 border-3 border-primary border-t-transparent rounded-full mx-auto" />
          <p className="text-sm text-muted-foreground">Checking authentication...</p>
        </div>
      </div>
    );
  }

  // Show error state for network/server errors (not 401s)
  // Don't redirect - let user retry
  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center space-y-4 max-w-md px-4">
          <p className="text-destructive font-medium">Connection Error</p>
          <p className="text-sm text-muted-foreground">
            Failed to verify your session. Please check your connection and try again.
          </p>
          <button 
            onClick={() => refetch()} 
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover-elevate active-elevate-2"
            data-testid="button-retry-auth"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // If no error but also no user, we're either redirecting or about to redirect
  // Show fallback during redirect (query succeeded with null user = 401)
  if (!currentUser) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center space-y-3">
          <div className="animate-spin h-8 w-8 border-3 border-primary border-t-transparent rounded-full mx-auto" />
          <p className="text-sm text-muted-foreground">Redirecting...</p>
        </div>
      </div>
    );
  }

  // Render protected content (currentUser exists and no errors)
  return <>{children}</>;
}
