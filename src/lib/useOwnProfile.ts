import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

export function useOwnProfile() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["own-profile", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("is_admin,is_banned")
        .eq("id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return data as { is_admin: boolean; is_banned: boolean } | null;
    },
  });
}
