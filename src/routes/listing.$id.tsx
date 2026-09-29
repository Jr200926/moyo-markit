import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { MapPin, Calendar, MessageCircle, Pencil, User as UserIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { buildWhatsAppUrl, categoryLabel, formatKwanza } from "@/lib/format";

interface ListingDetail {
  id: string;
  user_id: string;
  category: "imoveis" | "servicos";
  title: string;
  description: string;
  price: number | null;
  location: string;
  phone: string;
  photos: string[];
  created_at: string;
  seller_name?: string | null;
}

export const Route = createFileRoute("/listing/$id")({
  component: ListingDetailPage,
  errorComponent: ({ error }) => (
    <div className="p-10 text-center text-muted-foreground">
      Não foi possível carregar o anúncio. {error.message}
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

  const { data: listing, isLoading } = useQuery({
    queryKey: ["listing", id],
    queryFn: async (): Promise<ListingDetail> => {
      const { data, error } = await supabase
        .from("listings")
        .select(
          "id,user_id,category,title,description,price,location,phone,photos,created_at",
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
  const waUrl = buildWhatsAppUrl(
    listing.phone,
    `Olá! Vi o seu anúncio na Moyo Mark: "${listing.title}". Ainda está disponível?`,
  );

  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      {/* Photo gallery */}
      <div className="overflow-hidden rounded-2xl border bg-muted">
        <div className="aspect-[16/10] bg-muted">
          {photos[activePhoto] ? (
            <img
              src={photos[activePhoto]}
              alt={listing.title}
              className="h-full w-full object-cover"
            />
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
