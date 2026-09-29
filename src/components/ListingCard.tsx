import { Link, useNavigate } from "@tanstack/react-router";
import { MapPin, Pencil, Trash2, Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { categoryLabel, formatKwanza } from "@/lib/format";
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
  created_at: string;
}

export function ListingCard({
  listing,
  showOwnerActions,
  onDeleted,
}: {
  listing: ListingCardData;
  /** Mostra os botões de editar/apagar (só deve ser usado quando o utilizador vê o próprio perfil) */
  showOwnerActions?: boolean;
  /** Chamado depois de o anúncio ser apagado com sucesso, para atualizar a lista */
  onDeleted?: (id: string) => void;
}) {
  const [deleting, setDeleting] = useState(false);
  const navigate = useNavigate();
  const cover = listing.photos?.[0];

  async function handleDelete() {
    setDeleting(true);
    try {
      const { error } = await supabase.from("listings").delete().eq("id", listing.id);
      if (error) throw error;
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
        <div className="aspect-[4/3] overflow-hidden bg-muted">
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
