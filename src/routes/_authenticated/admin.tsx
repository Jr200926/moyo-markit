import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { ShieldAlert, Trash2, Ban } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useOwnProfile } from "@/lib/useOwnProfile";
import { removeFromStorage } from "@/lib/media";
import { purgeUserFiles, daysLeft, GRACE_DAYS } from "@/lib/accounts";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatKwanza, categoryLabel } from "@/lib/format";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({ meta: [{ title: "Administração — Moyo Markit" }] }),
  component: AdminPage,
});

interface ProfileRow {
  id: string;
  full_name: string;
  phone: string | null;
  is_admin: boolean;
  is_banned: boolean;
  created_at: string;
}

interface ListingRow {
  id: string;
  user_id: string;
  title: string;
  category: string;
  price: number | null;
  photos: string[];
  video_url: string | null;
  expires_at: string;
  created_at: string;
}

function AdminPage() {
  const { data: ownProfile, isLoading: loadingOwn } = useOwnProfile();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<"users" | "listings">("users");

  const usersQuery = useQuery({
    queryKey: ["admin-users"],
    enabled: !!ownProfile?.is_admin,
    queryFn: async (): Promise<ProfileRow[]> => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id,full_name,phone,is_admin,is_banned,created_at")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const listingsQuery = useQuery({
    queryKey: ["admin-listings"],
    enabled: !!ownProfile?.is_admin,
    queryFn: async (): Promise<ListingRow[]> => {
      const { data, error } = await supabase
        .from("listings")
        .select("id,user_id,title,category,price,photos,video_url,expires_at,created_at")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  async function toggleBan(u: ProfileRow) {
    const { error } = await supabase
      .from("profiles")
      .update({ is_banned: !u.is_banned })
      .eq("id", u.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(u.is_banned ? "Utilizador desbloqueado." : "Utilizador bloqueado.");
    queryClient.invalidateQueries({ queryKey: ["admin-users"] });
    queryClient.invalidateQueries({ queryKey: ["admin-listings"] });
  }

  async function deleteAccount(u: ProfileRow) {
    try {
      await purgeUserFiles(u.id);
      const { error } = await supabase.rpc("admin_delete_user", { target: u.id });
      if (error) throw error;
      toast.success("Conta apagada.");
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      queryClient.invalidateQueries({ queryKey: ["admin-listings"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível apagar a conta");
    }
  }

  const staleListings = (listingsQuery.data ?? []).filter(
    (l) => (daysLeft(l.expires_at) ?? 1) <= -GRACE_DAYS,
  );

  async function cleanStale() {
    let removed = 0;
    try {
      for (let i = 0; i < staleListings.length; i += 20) {
        const batch = staleListings.slice(i, i + 20);
        await removeFromStorage(
          "listing-photos",
          batch.flatMap((l) => l.photos ?? []),
        );
        await removeFromStorage(
          "listing-videos",
          batch.map((l) => l.video_url),
        );
        const { error } = await supabase
          .from("listings")
          .delete()
          .in(
            "id",
            batch.map((l) => l.id),
          );
        if (error) throw error;
        removed += batch.length;
      }
      toast.success(`${removed} anúncio(s) expirado(s) apagado(s).`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao limpar anúncios expirados");
    }
    queryClient.invalidateQueries({ queryKey: ["admin-listings"] });
  }

  async function deleteListing(l: ListingRow) {
    const { error } = await supabase.from("listings").delete().eq("id", l.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    await removeFromStorage("listing-photos", l.photos ?? []);
    await removeFromStorage("listing-videos", [l.video_url]);
    toast.success("Anúncio apagado.");
    queryClient.invalidateQueries({ queryKey: ["admin-listings"] });
  }

  if (loadingOwn) {
    return <div className="mx-auto max-w-3xl px-4 py-10 text-muted-foreground">A carregar...</div>;
  }

  if (!ownProfile?.is_admin) {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center">
        <ShieldAlert className="mx-auto mb-3 size-10 text-muted-foreground" />
        <h1 className="text-lg font-semibold">Sem permissão</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Esta área é reservada aos administradores do Moyo Markit.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="text-2xl font-bold sm:text-3xl">Administração</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Bloqueie utilizadores problemáticos ou remova anúncios indevidos.
      </p>

      <div className="mt-6 flex gap-2 border-b">
        <button
          onClick={() => setTab("users")}
          className={`border-b-2 px-3 py-2 text-sm font-medium ${
            tab === "users" ? "border-primary text-primary" : "border-transparent text-muted-foreground"
          }`}
        >
          Utilizadores
        </button>
        <button
          onClick={() => setTab("listings")}
          className={`border-b-2 px-3 py-2 text-sm font-medium ${
            tab === "listings"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground"
          }`}
        >
          Anúncios
        </button>
      </div>

      {tab === "users" && (
        <div className="mt-4 space-y-2">
          {usersQuery.data?.map((u) => (
            <div
              key={u.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-card p-3"
            >
              <div>
                <Link
                  to="/profile/$id"
                  params={{ id: u.id }}
                  className="font-medium hover:underline"
                >
                  {u.full_name || "Sem nome"}
                </Link>
                <p className="text-xs text-muted-foreground">{u.phone ?? "sem telefone"}</p>
              </div>
              <div className="flex items-center gap-2">
                {u.is_admin && <Badge variant="secondary">Admin</Badge>}
                {u.is_banned && <Badge variant="destructive">Bloqueado</Badge>}
                {!u.is_admin && (
                  <Button
                    size="sm"
                    variant={u.is_banned ? "outline" : "destructive"}
                    onClick={() => toggleBan(u)}
                  >
                    <Ban className="size-4" />
                    {u.is_banned ? "Desbloquear" : "Bloquear"}
                  </Button>
                )}
                {!u.is_admin && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button size="sm" variant="outline" aria-label="Apagar conta">
                        <Trash2 className="size-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Apagar a conta de {u.full_name || "este utilizador"}?</AlertDialogTitle>
                        <AlertDialogDescription>
                          O perfil, todos os anúncios, fotos e vídeos desta conta serão removidos
                          para sempre. A pessoa poderá criar uma conta nova.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => deleteAccount(u)}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          Apagar conta
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === "listings" && (
        <div className="mt-4 space-y-2">
          {staleListings.length > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-500/40 bg-amber-500/10 p-3">
              <p className="text-sm">
                <strong>{staleListings.length}</strong> anúncio(s) expirado(s) há mais de{" "}
                {GRACE_DAYS} dias, a ocupar espaço.
              </p>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button size="sm" variant="destructive">
                    <Trash2 className="size-4" />
                    Limpar agora
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Apagar {staleListings.length} anúncio(s) expirado(s)?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Serão removidos para sempre, com as respetivas fotos e vídeos. Os donos já
                      tiveram {GRACE_DAYS} dias para os renovar.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={cleanStale}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      Apagar
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          )}
          {listingsQuery.data?.map((l) => (
            <div
              key={l.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-card p-3"
            >
              <div>
                <Link to="/listing/$id" params={{ id: l.id }} className="font-medium hover:underline">
                  {l.title}
                </Link>
                <p className="text-xs text-muted-foreground">
                  {categoryLabel(l.category)} · {formatKwanza(l.price)}
                  {(daysLeft(l.expires_at) ?? 1) <= 0 && (
                    <span className="ml-2 rounded-full bg-destructive px-2 py-0.5 text-[10px] font-medium text-white">
                      Expirado
                    </span>
                  )}
                </p>
              </div>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button size="sm" variant="destructive">
                    <Trash2 className="size-4" />
                    Apagar
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Apagar este anúncio?</AlertDialogTitle>
                    <AlertDialogDescription>
                      O anúncio "{l.title}" será removido permanentemente.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => deleteListing(l)}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      Apagar
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
