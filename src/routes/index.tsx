import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Home, Search, Wrench } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ListingCard, type ListingCardData } from "@/components/ListingCard";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Moyo Mark — Imóveis e Serviços em Luanda" },
      {
        name: "description",
        content:
          "Encontre casas para arrendar, comprar e profissionais de confiança em Luanda. Anuncie grátis.",
      },
    ],
  }),
  component: Home_,
});

function Home_() {
  const [q, setQ] = useState("");
  const navigate = useNavigate();
  const handleDelete = async (id: string) => {
  const confirmDelete = confirm("Tens a certeza que queres apagar?");
  if (!confirmDelete) return;

  const { error } = await supabase
    .from("listings")
    .delete()
    .eq("id", id);

  if (error) {
    console.error(error);
    alert("Erro ao apagar");
  } else {
    alert("Apagado com sucesso");
    window.location.reload();
  }
};

  const { data: listings, isLoading } = useQuery({
    queryKey: ["recent-listings"],
    queryFn: async (): Promise<ListingCardData[]> => {
      const { data, error } = await supabase
        .from("listings")
        .select("id,title,price,location,category,photos,created_at")
        .order("created_at", { ascending: false })
        .limit(12);
      if (error) throw error;
      return (data ?? []) as ListingCardData[];
    },
  });

  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-primary to-[oklch(0.45_0.14_180)] text-primary-foreground">
        <div className="mx-auto max-w-6xl px-4 py-14 sm:py-20">
          <h1 className="max-w-2xl text-3xl font-bold leading-tight sm:text-5xl">
            Imóveis e serviços em Luanda, ao alcance de uma mensagem.
          </h1>
          <p className="mt-3 max-w-xl text-sm opacity-90 sm:text-base">
            Procure, anuncie e fale diretamente com o vendedor no WhatsApp. Simples e gratuito.
          </p>

          <form
            className="mt-6 flex max-w-xl flex-col gap-2 sm:flex-row"
            onSubmit={(e) => {
              e.preventDefault();
              navigate({ to: "/search", search: { q: q || undefined } });
            }}
          >
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Ex.: Casa T2 no Benfica"
                className="h-12 bg-card pl-9 text-foreground"
              />
            </div>
            <Button type="submit" size="lg" variant="secondary" className="h-12 px-6">
              Procurar
            </Button>
          </form>

          <div className="mt-6 flex flex-wrap gap-2">
            <CategoryChip to="/search" search={{ category: "imoveis" }} icon={<Home className="size-4" />}>
              Imóveis
            </CategoryChip>
            <CategoryChip to="/search" search={{ category: "servicos" }} icon={<Wrench className="size-4" />}>
              Serviços
            </CategoryChip>
          </div>
        </div>
      </section>

      {/* Recent */}
      <section className="mx-auto max-w-6xl px-4 py-10">
        <div className="mb-5 flex items-end justify-between">
          <h2 className="text-xl font-semibold sm:text-2xl">Anúncios recentes</h2>
          <Link to="/search" className="text-sm font-medium text-primary hover:underline">
            Ver todos →
          </Link>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="aspect-[4/3] animate-pulse rounded-xl bg-muted" />
            ))}
          </div>
        ) : listings && listings.length > 0 ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
           {listings.map((l) => (
  <ListingCard
    key={l.id}
    listing={l}
    onDelete={() => handleDelete(l.id)}
  />
))}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed p-10 text-center">
            <p className="text-muted-foreground">Ainda não há anúncios. Seja o primeiro!</p>
            <Button asChild className="mt-4">
              <Link to="/new">Publicar anúncio</Link>
            </Button>
          </div>
        )}
      </section>
    </div>
  );
}

function CategoryChip({
  to,
  search,
  icon,
  children,
}: {
  to: string;
  search: Record<string, string>;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Link
      to={to}
      search={search as never}
      className="inline-flex items-center gap-2 rounded-full bg-primary-foreground/15 px-4 py-2 text-sm font-medium backdrop-blur-sm transition hover:bg-primary-foreground/25"
    >
      {icon}
      {children}
    </Link>
  );
}
