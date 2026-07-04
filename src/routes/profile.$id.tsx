import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { User as UserIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { ListingCard, type ListingCardData } from "@/components/ListingCard";

export const Route = createFileRoute("/profile/$id")({
  head: () => ({ meta: [{ title: "Perfil — Moyo Mark" }] }),
  component: ProfilePage,
});

function ProfilePage() {
  const { id } = Route.useParams();

  const { data: profile } = useQuery({
    queryKey: ["profile", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id,full_name,created_at")
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const { data: listings, isLoading } = useQuery({
    queryKey: ["profile-listings", id],
    queryFn: async (): Promise<ListingCardData[]> => {
      const { data, error } = await supabase
        .from("listings")
        .select("id,title,price,location,category,photos,created_at")
        .eq("user_id", id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as ListingCardData[];
    },
  });

  const memberSince = profile?.created_at
    ? new Date(profile.created_at).toLocaleDateString("pt-PT", {
        year: "numeric",
        month: "long",
      })
    : null;

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <div className="flex items-center gap-4 rounded-2xl border bg-card p-5 shadow-[var(--shadow-card)]">
        <div className="grid size-16 place-items-center rounded-full bg-muted">
          <UserIcon className="size-7 text-muted-foreground" />
        </div>
        <div>
          <h1 className="text-xl font-bold">{profile?.full_name || "Utilizador"}</h1>
          {memberSince && (
            <p className="text-sm text-muted-foreground">Na Moyo Mark desde {memberSince}</p>
          )}
          <p className="mt-1 text-sm text-muted-foreground">
            {listings?.length ?? 0} anúncio{(listings?.length ?? 0) === 1 ? "" : "s"} publicado
            {(listings?.length ?? 0) === 1 ? "" : "s"}
          </p>
        </div>
      </div>

      <div className="mt-6">
        <h2 className="mb-3 text-lg font-semibold">Anúncios</h2>
        {isLoading ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="aspect-[4/3] animate-pulse rounded-xl bg-muted" />
            ))}
          </div>
        ) : listings && listings.length > 0 ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {listings.map((l) => (
              <ListingCard key={l.id} listing={l} />
            ))}
          </div>
        ) : (
          <p className="rounded-xl border border-dashed p-8 text-center text-muted-foreground">
            Este utilizador ainda não publicou anúncios.
          </p>
        )}
      </div>
    </div>
  );
}
