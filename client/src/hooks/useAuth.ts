import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";

interface User {
  id: string;
  username: string;
  displayName: string;
  walletAddress: string;
  verified: boolean;
}

interface AuthResponse {
  user: User;
}

export function useAuth() {
  const { data, isLoading } = useQuery<AuthResponse | null>({
    queryKey: ["/api/auth/me"],
    retry: false,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    // Return null on 401 instead of throwing
    queryFn: async () => {
      try {
        const res = await fetch("/api/auth/me", {
          credentials: "include",
        });
        console.log('Auth check response:', res.status);
        if (res.status === 401) {
          console.log('Not authenticated');
          return null;
        }
        if (!res.ok) {
          console.log('Auth check failed:', res.status, res.statusText);
          throw new Error(`${res.status}: ${res.statusText}`);
        }
        const authData = await res.json();
        console.log('Authenticated as:', authData.user?.username);
        return authData;
      } catch (error) {
        console.log('Auth check error:', error);
        return null;
      }
    },
  });

  const loginMutation = useMutation({
    mutationFn: async (username: string) => {
      const response = await apiRequest("POST", "/api/auth/login", { username });
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/auth/logout", {});
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
    },
  });

  return {
    user: data?.user || null,
    isLoading,
    isAuthenticated: !!data?.user,
    login: loginMutation.mutate,
    logout: logoutMutation.mutate,
    isLoggingIn: loginMutation.isPending,
    isLoggingOut: logoutMutation.isPending,
  };
}
