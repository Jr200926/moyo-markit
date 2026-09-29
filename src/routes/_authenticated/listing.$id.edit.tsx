import { createFileRoute, useNavigate, Link, notFound } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { toast } from "sonner";
import { ImagePlus, X, ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/_authenticated/listing/$id/edit")({
  head: () => ({ meta: [{ title: "Editar anúncio — Moyo Mark" }] }),
  component: EditListing,
});

const schema = z.object({
  category: z.enum(["imoveis", "servicos"]),
  title: z.string().trim().min(4, "Título demasiado curto").max(120),
  description: z.string().trim().max(2000).default(""),
  price: z.string().optional(),
  location: z.string().trim().max(120).default(""),
  phone: z
    .string()
    .trim()
    .min(9, "Telefone obrigatório")
    .max(20)
    .regex(/^[+\d\s-]+$/, "Telefone inválido"),
});

interface ListingRow {
  id: string;
  user_id: string;
  category: "imoveis" | "servicos";
  title: string;
  description: string;
  price: number | null;
  location: string;
  phone: string;
  photos: string[];
}

function EditListing() {
  const { id } = Route.useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const { data: listing, isLoading } = useQuery({
    queryKey: ["listing-edit", id],
    queryFn: async (): Promise<ListingRow> => {
      const { data, error } = await supabase
        .from("listings")
        .select("id,user_id,category,title,description,price,location,phone,photos")
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      if (!data) throw notFound();
      return data as ListingRow;
    },
  });

  const [category, setCategory] = useState<"imoveis" | "servicos">("imoveis");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [location, setLocation] = useState("");
  const [phone, setPhone] = useState("");
  const [existingPhotos, setExistingPhotos] = useState<string[]>([]);
  const [newFiles, setNewFiles] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [loaded, setLoaded] = useState(false);

  // Pre-fill form once the listing loads
  useEffect(() => {
    if (!listing || loaded) return;
    setCategory(listing.category);
    setTitle(listing.title);
    setDescription(listing.description ?? "");
    setPrice(listing.price != null ? String(listing.price) : "");
    setLocation(listing.location ?? "");
    setPhone(listing.phone ?? "");
    setExistingPhotos(listing.photos ?? []);
    setLoaded(true);
  }, [listing, loaded]);

  const totalPhotoCount = existingPhotos.length + newFiles.length;

  function onFilesChange(e: React.ChangeEvent<HTMLInputElement>) {
    const next = Array.from(e.target.files ?? []);
    const remainingSlots = Math.max(0, 6 - existingPhotos.length - newFiles.length);
    setNewFiles((cur) => [...cur, ...next].slice(0, cur.length + remainingSlots));
    e.target.value = "";
  }

  function removeExistingPhoto(url: string) {
    setExistingPhotos((cur) => cur.filter((p) => p !== url));
  }

  function removeNewFile(idx: number) {
    setNewFiles((cur) => cur.filter((_, i) => i !== idx));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !listing) return;
    const parsed = schema.safeParse({ category, title, description, price, location, phone });
    if (!parsed.success) {
      toast.error(parsed.error.errors[0].message);
      return;
    }
    setSubmitting(true);
    try {
      const uploadedUrls: string[] = [];
      for (const file of newFiles) {
        const ext = file.name.split(".").pop() || "jpg";
        const path = `${user.id}/${crypto.randomUUID()}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from("listing-photos")
          .upload(path, file, { contentType: file.type, upsert: false });
        if (upErr) throw upErr;
        const { data } = supabase.storage.from("listing-photos").getPublicUrl(path);
        uploadedUrls.push(data.publicUrl);
      }

      const priceNum = parsed.data.price ? Number(parsed.data.price) : null;
      const { error } = await supabase
        .from("listings")
        .update({
          category: parsed.data.category,
          title: parsed.data.title,
          description: parsed.data.description ?? "",
          price: Number.isFinite(priceNum as number) ? priceNum : null,
          location: parsed.data.location ?? "",
          phone: parsed.data.phone,
          photos: [...existingPhotos, ...uploadedUrls],
        })
        .eq("id", listing.id);
      if (error) throw error;
      toast.success("Anúncio atualizado!");
      navigate({ to: "/listing/$id", params: { id: listing.id } });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao atualizar anúncio");
    } finally {
      setSubmitting(false);
    }
  }

  if (isLoading || !loaded) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-8">
        <div className="h-64 animate-pulse rounded-2xl bg-muted" />
      </div>
    );
  }

  if (listing && user && listing.user_id !== user.id) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center text-muted-foreground">
        Não tem permissão para editar este anúncio.
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <Link
        to="/listing/$id"
        params={{ id }}
        className="mb-2 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> Voltar ao anúncio
      </Link>
      <h1 className="text-2xl font-bold sm:text-3xl">Editar anúncio</h1>
      <p className="mt-1 text-sm text-muted-foreground">Atualize os dados do seu anúncio.</p>

      <form
        onSubmit={onSubmit}
        className="mt-6 space-y-4 rounded-2xl border bg-card p-5 shadow-[var(--shadow-card)]"
      >
        <div className="space-y-1.5">
          <Label>Categoria</Label>
          <Select value={category} onValueChange={(v) => setCategory(v as "imoveis" | "servicos")}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="imoveis">Imóveis</SelectItem>
              <SelectItem value="servicos">Serviços</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="title">Título</Label>
          <Input
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={120}
            required
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="price">Preço (Kz)</Label>
            <Input
              id="price"
              type="number"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="Opcional"
              min={0}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="location">Localização</Label>
            <Input
              id="location"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              maxLength={120}
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="phone">Telefone WhatsApp</Label>
          <Input
            id="phone"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            required
            maxLength={20}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="description">Descrição</Label>
          <Textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={5}
            maxLength={2000}
          />
        </div>

        <div className="space-y-2">
          <Label>Fotos (até 6)</Label>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
            {existingPhotos.map((url) => (
              <div key={url} className="relative aspect-square overflow-hidden rounded-lg border">
                <img src={url} alt="" className="h-full w-full object-cover" />
                <button
                  type="button"
                  onClick={() => removeExistingPhoto(url)}
                  className="absolute right-1 top-1 grid size-6 place-items-center rounded-full bg-foreground/70 text-background hover:bg-foreground"
                >
                  <X className="size-3.5" />
                </button>
              </div>
            ))}
            {newFiles.map((f, i) => (
              <div key={i} className="relative aspect-square overflow-hidden rounded-lg border">
                <img src={URL.createObjectURL(f)} alt="" className="h-full w-full object-cover" />
                <button
                  type="button"
                  onClick={() => removeNewFile(i)}
                  className="absolute right-1 top-1 grid size-6 place-items-center rounded-full bg-foreground/70 text-background hover:bg-foreground"
                >
                  <X className="size-3.5" />
                </button>
              </div>
            ))}
            {totalPhotoCount < 6 && (
              <label className="flex aspect-square cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border border-dashed bg-muted/40 text-xs text-muted-foreground hover:bg-muted">
                <ImagePlus className="size-5" />
                Adicionar
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={onFilesChange}
                />
              </label>
            )}
          </div>
        </div>

        <Button type="submit" disabled={submitting} className="w-full" size="lg">
          {submitting ? "A guardar..." : "Guardar alterações"}
        </Button>
      </form>
    </div>
  );
}
