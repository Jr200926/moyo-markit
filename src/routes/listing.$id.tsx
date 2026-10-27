import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { MapPin, Calendar, MessageCircle, Pencil, Download, User as UserIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { daysLeft } from "@/lib/accounts";
import { toast } from "sonner";
import { downloadHref, fileExtension, slugify } from "@/lib/media";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { buildWhatsAppUrl, categoryLabel, formatKwanza } from "@/lib/format";

interface ListingDetail {
  id: string;
  user_id: string;
  category: string;
  title: string;
  description: string;
  price: number | null;
  location: string;
  phone: string;
  photos: string[];
  video_url: string | null;
  expires_at: string;
  created_at: string;
  seller_name?: string | null;
}

export const Route = createFileRoute("/listing/$id")({
  component: ListingDetailPage,
  errorComponent: ({ error }) => (
    <div className="p-10 text-center text-muted-foreground">
      Não foi possível carregar o anúncio. {error instanceof Error ? error.message : ""}
    </div>
  ),
  notFoundComponent: () => (
    <div className="p-10 text-center text-muted-foreground">Anúncio não encontrado.</div>
  ),
});

function ListingDetailPage() {
  const { id } = Route.useParams();
  const { user } = useAuth();
  const [activePhoto, setActivePhoto] = useState(0);
  const queryClient = useQueryClient();

  const { data: listing, isLoading } = useQuery({
    queryKey: ["listing", id],
    queryFn: async (): Promise<ListingDetail> => {
      const { data, error } = await supabase
        .from("listings")
        .select(
          "id,user_id,category,title,description,price,location,phone,photos,video_url,expires_at,created_at",
        )
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      if (!data) throw notFound();
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", data.user_id)
        .maybeSingle();
      return { ...(data as Omit<ListingDetail, "seller_name">), seller_name: profile?.full_name ?? null };
    },
  });

  if (isLoading) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-8">
        <div className="aspect-[16/10] animate-pulse rounded-2xl bg-muted" />
      </div>
    );
  }
  if (!listing) return null;

  const photos = listing.photos.length > 0 ? listing.photos : [];
  const baseName = `moyo-markit-${slugify(listing.title)}`;
  const waUrl = buildWhatsAppUrl(
    listing.phone,
    `Olá! Vi o seu anúncio na Moyo Markit: "${listing.title}". Ainda está disponível?`,
  );

  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      {/* Photo gallery */}
      <div className="overflow-hidden rounded-2xl border bg-muted">
        <div className="relative aspect-[16/10] bg-muted">
          {photos[activePhoto] ? (
            <>
              <img
                src={photos[activePhoto]}
                alt={listing.title}
                className="h-full w-full object-cover"
              />
              <a
                href={downloadHref(
                  photos[activePhoto],
                  `${baseName}-${activePhoto + 1}.${fileExtension(photos[activePhoto], "jpg")}`,
                )}
                download
                rel="noopener"
                className="absolute bottom-3 right-3 flex items-center gap-1.5 rounded-full bg-black/60 px-3 py-1.5 text-xs font-medium text-white backdrop-blur hover:bg-black/75"
              >
                <Download className="size-4" />
                Baixar foto
              </a>
            </>
          ) : (
            <div className="grid h-full place-items-center text-muted-foreground">Sem fotos</div>
          )}
        </div>
        {photos.length > 1 && (
          <div className="flex gap-2 overflow-x-auto bg-card p-2">
            {photos.map((p, i) => (
              <button
                key={i}
                onClick={() => setActivePhoto(i)}
                className={`h-16 w-20 flex-shrink-0 overflow-hidden rounded-md border-2 transition ${
                  i === activePhoto ? "border-primary" : "border-transparent"
                }`}
              >
                <img src={p} alt="" className="h-full w-full object-cover" />
              </button>
            ))}
          </div>
        )}
      </div>

      {listing.video_url && (
        <div className="mt-4 overflow-hidden rounded-2xl border bg-card">
          <video
            src={listing.video_url}
            controls
            playsInline
            preload="metadata"
            poster={photos[0]}
            className="aspect-video w-full bg-black"
          />
          <div className="flex items-center justify-between gap-3 p-3">
            <span className="text-sm font-medium">Vídeo do anúncio</span>
            <Button asChild variant="outline" size="sm">
              <a
                href={downloadHref(
                  listing.video_url,
                  `${baseName}.${fileExtension(listing.video_url, "mp4")}`,
                )}
                download
                rel="noopener"
              >
                <Download className="size-4" />
                Baixar vídeo
              </a>
            </Button>
          </div>
        </div>
      )}

      <div className="mt-6 grid gap-6 md:grid-cols-3">
        <div className="md:col-span-2">
          <Badge variant="secondary" className="mb-3">
            {categoryLabel(listing.category)}
          </Badge>
          <h1 className="text-2xl font-bold sm:text-3xl">{listing.title}</h1>
          <p className="mt-2 text-3xl font-bold text-primary">{formatKwanza(listing.price)}</p>

          <div className="mt-4 flex flex-wrap gap-4 text-sm text-muted-foreground">
            {listing.location && (
              <span className="flex items-center gap-1.5">
                <MapPin className="size-4" /> {listing.location}
              </span>
            )}
            <span className="flex items-center gap-1.5">
              <Calendar className="size-4" />{" "}
              {new Date(listing.created_at).toLocaleDateString("pt-PT")}
            </span>
          </div>

          <div className="mt-6">
            <h2 className="mb-2 text-lg font-semibold">Descrição</h2>
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">
              {listing.description || "Sem descrição."}
            </p>
          </div>
        </div>

        <aside className="space-y-3">
          {user?.id === listing.user_id && (daysLeft(listing.expires_at) ?? 1) <= 0 && (
            <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-3 text-sm">
              <p className="font-medium">Este anúncio expirou</p>
              <p className="mt-0.5 text-muted-foreground">
                Só você o vê. Renove para voltar a aparecer a todos por mais 30 dias.
              </p>
              <Button
                size="sm"
                className="mt-2"
                onClick={async () => {
                  const { error } = await supabase.rpc("renew_listing", { listing_id: listing.id });
                  if (error) {
                    toast.error(error.message);
                    return;
                  }
                  toast.success("Anúncio renovado por mais 30 dias.");
                  queryClient.invalidateQueries({ queryKey: ["listing", id] });
                }}
              >
                Renovar anúncio
              </Button>
            </div>
          )}
          {user?.id === listing.user_id && (
            <Button asChild variant="outline" size="lg" className="w-full">
              <Link to="/listing/$id/edit" params={{ id: listing.id }}>
                <Pencil className="size-4" />
                Editar anúncio
              </Link>
            </Button>
          )}
          <div className="rounded-xl border bg-card p-4 shadow-[var(--shadow-card)]">
            <Link
              to="/profile/$id"
              params={{ id: listing.user_id }}
              className="flex items-center gap-3"
            >
              <div className="grid size-10 place-items-center rounded-full bg-muted">
                <UserIcon className="size-5 text-muted-foreground" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Vendedor</p>
                <p className="text-sm font-medium">
                  {listing.seller_name || "Utilizador"}
                </p>
              </div>
            </Link>
          </div>

          <Button
            asChild
            size="lg"
            className="h-14 w-full bg-[var(--color-whatsapp)] text-[var(--color-whatsapp-foreground)] hover:opacity-90"
          >
            <a href={waUrl} target="_blank" rel="noopener noreferrer">
              <MessageCircle className="size-5" />
              Falar no WhatsApp
            </a>
          </Button>
          <p className="text-center text-xs text-muted-foreground">
            Combine sempre presencialmente. Não envie dinheiro antes de ver.
          </p>
        </aside>
      </div>
    </div>
  );
}
