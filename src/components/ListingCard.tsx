import { Link, useNavigate } from "@tanstack/react-router";
import { MapPin, Pencil, Trash2, Loader2, RefreshCw, Video } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { categoryLabel, formatKwanza } from "@/lib/format";
import { removeFromStorage } from "@/lib/media";
import { daysLeft } from "@/lib/accounts";
import { Badge } from "@/components/ui/badge";
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

export interface ListingCardData {
  id: string;
  title: string;
  price: number | null;
  location: string;
  category: "imoveis" | "servicos";
  photos: string[];
  video_url?: string | null;
  expires_at?: string;
  created_at: string;
}

export function ListingCard({
  listing,
  showOwnerActions,
  onDeleted,
  onRenewed,
}: {
  listing: ListingCardData;
  /** Mostra os botões de editar/apagar (só deve ser usado quando o utilizador vê o próprio perfil) */
  showOwnerActions?: boolean;
  /** Chamado depois de o anúncio ser apagado com sucesso, para atualizar a lista */
  onDeleted?: (id: string) => void;
  /** Chamado depois de o anúncio ser renovado, para atualizar a lista */
  onRenewed?: () => void;
}) {
  const [deleting, setDeleting] = useState(false);
  const [renewing, setRenewing] = useState(false);
  const left = showOwnerActions ? daysLeft(listing.expires_at) : null;
  const expired = left !== null && left <= 0;
  const navigate = useNavigate();
  const cover = listing.photos?.[0];

  async function handleRenew() {
    setRenewing(true);
    try {
      const { error } = await supabase.rpc("renew_listing", { listing_id: listing.id });
      if (error) throw error;
      toast.success("Anúncio renovado por mais 30 dias.");
      onRenewed?.();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao renovar o anúncio");
    } finally {
      setRenewing(false);
    }
  }

  async function handleDelete() {
    setDeleting(true);
    try {
      const { error } = await supabase.from("listings").delete().eq("id", listing.id);
      if (error) throw error;
      await removeFromStorage("listing-photos", listing.photos ?? []);
      await removeFromStorage("listing-videos", [listing.video_url]);
      toast.success("Anúncio apagado.");
      onDeleted?.(listing.id);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao apagar anúncio");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="group relative overflow-hidden rounded-xl border bg-card shadow-[var(--shadow-card)] transition hover:shadow-[var(--shadow-elevated)]">
      {showOwnerActions && (
        <div className="absolute right-2 top-2 z-10 flex gap-1.5">
          {left !== null && left <= 7 && (
            <button
              onClick={handleRenew}
              disabled={renewing}
              className="flex h-8 items-center gap-1 rounded-full bg-background/90 px-3 text-xs font-medium text-foreground shadow hover:bg-background"
              aria-label="Renovar anúncio"
            >
              {renewing ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <RefreshCw className="size-3.5" />
              )}
              Renovar
            </button>
          )}
          <button
            onClick={() => navigate({ to: "/listing/$id/edit", params: { id: listing.id } })}
            className="grid size-8 place-items-center rounded-full bg-background/90 text-foreground shadow hover:bg-background"
            aria-label="Editar anúncio"
          >
            <Pencil className="size-4" />
          </button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <button
                disabled={deleting}
                className="grid size-8 place-items-center rounded-full bg-background/90 text-destructive shadow hover:bg-background"
                aria-label="Apagar anúncio"
              >
                {deleting ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Trash2 className="size-4" />
                )}
              </button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Apagar este anúncio?</AlertDialogTitle>
                <AlertDialogDescription>
                  Esta ação não pode ser desfeita. O anúncio "{listing.title}" será removido
                  permanentemente.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDelete}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Apagar
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      )}
      <Link to="/listing/$id" params={{ id: listing.id }} className="block">
        <div className="relative aspect-[4/3] overflow-hidden bg-muted">
          {cover ? (
            <img
              src={cover}
              alt={listing.title}
              loading="lazy"
              className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
            />
          ) : (
            <div className="grid h-full place-items-center text-sm text-muted-foreground">
              Sem foto
            </div>
          )}
          {left !== null && left <= 7 && (
            <span
              className={`absolute left-2 top-2 rounded-full px-2 py-0.5 text-xs font-medium text-white ${
                expired ? "bg-destructive" : "bg-amber-600"
              }`}
            >
              {expired ? "Expirado" : `Expira em ${left} ${left === 1 ? "dia" : "dias"}`}
            </span>
          )}
          {listing.video_url && (
            <span className="absolute bottom-2 left-2 flex items-center gap-1 rounded-full bg-black/60 px-2 py-0.5 text-xs font-medium text-white">
              <Video className="size-3" /> Vídeo
            </span>
          )}
        </div>
        <div className="space-y-1.5 p-3">
          <div className="flex items-center justify-between gap-2">
            <Badge variant="secondary" className="font-normal">
              {categoryLabel(listing.category)}
            </Badge>
            <span className="text-base font-semibold text-primary">
              {formatKwanza(listing.price)}
            </span>
          </div>
          <h3 className="line-clamp-2 text-sm font-medium leading-snug">{listing.title}</h3>
          {listing.location && (
            <p className="flex items-center gap-1 text-xs text-muted-foreground">
              <MapPin className="size-3" /> {listing.location}
            </p>
          )}
        </div>
      </Link>
    </div>
  );
}
