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
  const { data, isLoading, error } = useQuery<AuthResponse | null>({
    queryKey: ["/api/auth/me"],
    retry: false,
    // Return null on 401 instead of throwing
    queryFn: async () => {
      try {
        const res = await fetch("/api/auth/me", {
          credentials: "include",
        });
        if (res.status === 401) {
          return null;
        }
        if (!res.ok) {
          throw new Error(`${res.status}: ${res.statusText}`);
        }
        return await res.json();
      } catch (error) {
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
