import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { ImagePlus, X } from "lucide-react";
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

export const Route = createFileRoute("/_authenticated/new")({
  head: () => ({ meta: [{ title: "Publicar anúncio — Moyo Mark" }] }),
  component: NewListing,
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

function NewListing() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [category, setCategory] = useState<"imoveis" | "servicos">("imoveis");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [location, setLocation] = useState("");
  const [phone, setPhone] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);

  // Pre-fill phone from profile
  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("phone")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data?.phone && !phone) setPhone(data.phone);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  function onFilesChange(e: React.ChangeEvent<HTMLInputElement>) {
    const next = Array.from(e.target.files ?? []);
    const combined = [...files, ...next].slice(0, 6);
    setFiles(combined);
    e.target.value = "";
  }

  function removeFile(idx: number) {
    setFiles((cur) => cur.filter((_, i) => i !== idx));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    const parsed = schema.safeParse({ category, title, description, price, location, phone });
    if (!parsed.success) {
      toast.error(parsed.error.errors[0].message);
      return;
    }
    setSubmitting(true);
    try {
      // Upload photos
      const photoUrls: string[] = [];
      for (const file of files) {
        const ext = file.name.split(".").pop() || "jpg";
        const path = `${user.id}/${crypto.randomUUID()}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from("listing-photos")
          .upload(path, file, { contentType: file.type, upsert: false });
        if (upErr) throw upErr;
        const { data } = supabase.storage.from("listing-photos").getPublicUrl(path);
        photoUrls.push(data.publicUrl);
      }

      const priceNum = parsed.data.price ? Number(parsed.data.price) : null;
      const { data, error } = await supabase
        .from("listings")
        .insert({
          user_id: user.id,
          category: parsed.data.category,
          title: parsed.data.title,
          description: parsed.data.description ?? "",
          price: Number.isFinite(priceNum as number) ? priceNum : null,
          location: parsed.data.location ?? "",
          phone: parsed.data.phone,
          photos: photoUrls,
        })
        .select("id")
        .single();
      if (error) throw error;
      toast.success("Anúncio publicado!");
      navigate({ to: "/listing/$id", params: { id: data.id } });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao publicar");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="text-2xl font-bold sm:text-3xl">Publicar anúncio</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Preencha os campos abaixo. Compradores irão contactá-lo no WhatsApp.
      </p>

      <form onSubmit={onSubmit} className="mt-6 space-y-4 rounded-2xl border bg-card p-5 shadow-[var(--shadow-card)]">
        <div className="space-y-1.5">
          <Label>Categoria</Label>
          <Select
            value={category}
            onValueChange={(v) => setCategory(v as "imoveis" | "servicos")}
          >
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
            placeholder="Ex.: Apartamento T2 no Benfica"
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
              placeholder="Ex.: Luanda, Benfica"
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
            placeholder="+244 9XX XXX XXX"
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
            placeholder="Detalhes, características, condições..."
          />
        </div>

        <div className="space-y-2">
          <Label>Fotos (até 6)</Label>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
            {files.map((f, i) => (
              <div key={i} className="relative aspect-square overflow-hidden rounded-lg border">
                <img src={URL.createObjectURL(f)} alt="" className="h-full w-full object-cover" />
                <button
                  type="button"
                  onClick={() => removeFile(i)}
                  className="absolute right-1 top-1 grid size-6 place-items-center rounded-full bg-foreground/70 text-background hover:bg-foreground"
                >
                  <X className="size-3.5" />
                </button>
              </div>
            ))}
            {files.length < 6 && (
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
          {submitting ? "A publicar..." : "Publicar anúncio"}
        </Button>
      </form>
    </div>
  );
}
