import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { z } from "zod";
import { Search as SearchIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ListingCard, type ListingCardData } from "@/components/ListingCard";

const searchSchema = z.object({
  q: z.string().optional(),
  category: z.enum(["imoveis", "servicos"]).optional(),
  location: z.string().optional(),
  min: z.coerce.number().optional(),
  max: z.coerce.number().optional(),
});

export const Route = createFileRoute("/search")({
  validateSearch: searchSchema,
  head: () => ({
    meta: [
      { title: "Procurar anúncios — Moyo Mark" },
      { name: "description", content: "Procure imóveis e serviços em Luanda." },
    ],
  }),
  component: SearchPage,
});

function SearchPage() {
  const params = Route.useSearch();
  const navigate = useNavigate();

  const [q, setQ] = useState(params.q ?? "");
  const [category, setCategory] = useState<string>(params.category ?? "all");
  const [location, setLocation] = useState(params.location ?? "");
  const [min, setMin] = useState(params.min?.toString() ?? "");
  const [max, setMax] = useState(params.max?.toString() ?? "");

  useEffect(() => {
    setQ(params.q ?? "");
    setCategory(params.category ?? "all");
    setLocation(params.location ?? "");
    setMin(params.min?.toString() ?? "");
    setMax(params.max?.toString() ?? "");
  }, [params]);

  const { data, isLoading } = useQuery({
    queryKey: ["search", params],
    queryFn: async (): Promise<ListingCardData[]> => {
      let query = supabase
        .from("listings")
        .select("id,title,price,location,category,photos,created_at")
        .order("created_at", { ascending: false })
        .limit(60);

      if (params.q) query = query.ilike("title", `%${params.q}%`);
      if (params.category) query = query.eq("category", params.category);
      if (params.location) query = query.ilike("location", `%${params.location}%`);
      if (params.min != null) query = query.gte("price", params.min);
      if (params.max != null) query = query.lte("price", params.max);

      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []) as ListingCardData[];
    },
  });

  function apply(e: React.FormEvent) {
    e.preventDefault();
    navigate({
      to: "/search",
      search: {
        q: q || undefined,
        category: category === "all" ? undefined : (category as "imoveis" | "servicos"),
        location: location || undefined,
        min: min ? Number(min) : undefined,
        max: max ? Number(max) : undefined,
      },
    });
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <form
        onSubmit={apply}
        className="grid gap-3 rounded-xl border bg-card p-4 shadow-[var(--shadow-card)] sm:grid-cols-2 lg:grid-cols-6"
      >
        <div className="relative lg:col-span-2">
          <Label className="sr-only">Pesquisa</Label>
          <SearchIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="O que procura?"
            className="pl-9"
          />
        </div>
        <div>
          <Label className="sr-only">Categoria</Label>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger>
              <SelectValue placeholder="Categoria" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              <SelectItem value="imoveis">Imóveis</SelectItem>
              <SelectItem value="servicos">Serviços</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Input
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          placeholder="Localização"
        />
        <Input
          value={min}
          onChange={(e) => setMin(e.target.value)}
          type="number"
          placeholder="Preço mín."
          min={0}
        />
        <Input
          value={max}
          onChange={(e) => setMax(e.target.value)}
          type="number"
          placeholder="Preço máx."
          min={0}
        />
        <Button type="submit" className="lg:col-span-6">
          Aplicar filtros
        </Button>
      </form>

      <div className="mt-6">
        {isLoading ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="aspect-[4/3] animate-pulse rounded-xl bg-muted" />
            ))}
          </div>
        ) : data && data.length > 0 ? (
          <>
            <p className="mb-3 text-sm text-muted-foreground">
              {data.length} resultado{data.length === 1 ? "" : "s"}
            </p>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {data.map((l) => (
                <ListingCard key={l.id} listing={l} />
              ))}
            </div>
          </>
        ) : (
          <div className="rounded-xl border border-dashed p-10 text-center text-muted-foreground">
            Nenhum anúncio encontrado. Tente outros filtros.
          </div>
        )}
      </div>
    </div>
  );
}
