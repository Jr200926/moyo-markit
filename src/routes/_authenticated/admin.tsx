import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { ShieldAlert, Trash2, Ban } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useOwnProfile } from "@/lib/useOwnProfile";
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
  head: () => ({ meta: [{ title: "Administração — Moyo Mark" }] }),
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
  category: "imoveis" | "servicos";
  price: number | null;
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
        .select("id,user_id,title,category,price,created_at")
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

  async function deleteListing(l: ListingRow) {
    const { error } = await supabase.from("listings").delete().eq("id", l.id);
    if (error) {
      toast.error(error.message);
      return;
    }
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
          Esta área é reservada aos administradores do Moyo Mark.
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
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === "listings" && (
        <div className="mt-4 space-y-2">
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
