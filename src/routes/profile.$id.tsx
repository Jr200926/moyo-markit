import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import {
  Calendar,
  Camera,
  Inbox,
  Loader2,
  MapPin,
  Pencil,
  Plus,
  User as UserIcon,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { resizeToSquareJpeg } from "@/lib/image";
import { normalizeAngolanPhone, PHONE_ERROR } from "@/lib/phone";
import { purgeUserFiles } from "@/lib/accounts";
import { ListingCard, type ListingCardData } from "@/components/ListingCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export const Route = createFileRoute("/profile/$id")({
  head: () => ({ meta: [{ title: "Perfil — Moyo Markit" }] }),
  component: ProfilePage,
});

interface ProfileData {
  id: string;
  full_name: string;
  phone: string | null;
  location: string;
  bio: string;
  avatar_url: string | null;
  created_at: string;
}

const profileSchema = z.object({
  full_name: z.string().trim().min(2, "Indique o seu nome").max(80, "Nome demasiado longo"),
  phone: z
    .string()
    .trim()
    .refine((v) => v === "" || normalizeAngolanPhone(v) !== null, PHONE_ERROR),
  location: z.string().trim().max(80, "Localização demasiado longa"),
  bio: z.string().trim().max(280, "A descrição pode ter no máximo 280 caracteres"),
});

function ProfilePage() {
  const { id } = Route.useParams();
  const { user, signOut } = useAuth();
  const queryClient = useQueryClient();
  const isOwnProfile = user?.id === id;
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [photoOpen, setPhotoOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const navigate = useNavigate();

  const { data: profile } = useQuery({
    queryKey: ["profile", id],
    queryFn: async (): Promise<ProfileData | null> => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id,full_name,phone,location,bio,avatar_url,created_at")
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      return data as ProfileData | null;
    },
  });

  const { data: listings, isLoading } = useQuery({
    queryKey: ["profile-listings", id],
    queryFn: async (): Promise<ListingCardData[]> => {
      const { data, error } = await supabase
        .from("listings")
        .select("id,title,price,location,category,photos,video_url,expires_at,created_at")
        .eq("user_id", id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as ListingCardData[];
    },
  });

  const total = listings?.length ?? 0;

  const memberSince = profile?.created_at
    ? new Date(profile.created_at).toLocaleDateString("pt-PT", { year: "numeric", month: "long" })
    : null;

  async function onPickAvatar(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !user) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Escolha um ficheiro de imagem.");
      return;
    }
    setUploading(true);
    try {
      const blob = await resizeToSquareJpeg(file, 512);
      const path = `${user.id}/${crypto.randomUUID()}.jpg`;
      const { error: upErr } = await supabase.storage
        .from("avatars")
        .upload(path, blob, { contentType: "image/jpeg", upsert: false });
      if (upErr) throw upErr;
      const { data } = supabase.storage.from("avatars").getPublicUrl(path);

      const { error } = await supabase
        .from("profiles")
        .update({ avatar_url: data.publicUrl })
        .eq("id", user.id);
      if (error) throw error;

      const old = profile?.avatar_url;
      if (old && old.includes("/avatars/")) {
        const oldPath = decodeURIComponent(old.split("/avatars/")[1] ?? "");
        if (oldPath) await supabase.storage.from("avatars").remove([oldPath]);
      }

      toast.success("Foto atualizada!");
      queryClient.invalidateQueries({ queryKey: ["profile", id] });
      queryClient.invalidateQueries({ queryKey: ["own-profile", user.id] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao enviar a foto");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 sm:py-8">
      <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary to-[oklch(0.45_0.14_180)] p-5 text-primary-foreground shadow-[var(--shadow-card)] sm:p-6">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
          <div className="relative size-24 shrink-0 sm:size-28">
            <button
              type="button"
              onClick={() => {
                if (profile?.avatar_url) setPhotoOpen(true);
                else if (isOwnProfile) fileRef.current?.click();
              }}
              disabled={!profile?.avatar_url && !isOwnProfile}
              aria-label={profile?.avatar_url ? "Ver foto de perfil" : "Adicionar foto de perfil"}
              className="grid size-full cursor-pointer place-items-center overflow-hidden rounded-full bg-white/90 ring-4 ring-white/30 transition enabled:hover:ring-white/60 disabled:cursor-default"
            >
              {profile?.avatar_url ? (
                <img
                  src={profile.avatar_url}
                  alt={profile.full_name}
                  className="size-full object-cover"
                />
              ) : (
                <UserIcon className="size-12 text-primary/60" />
              )}
            </button>
            {isOwnProfile && (
              <>
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  disabled={uploading}
                  aria-label="Alterar foto de perfil"
                  className="absolute -bottom-1 -right-1 grid size-9 place-items-center rounded-full bg-white text-primary shadow-md transition hover:scale-105"
                >
                  {uploading ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Camera className="size-4" />
                  )}
                </button>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={onPickAvatar}
                />
              </>
            )}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <h1 className="text-2xl font-bold leading-tight sm:text-3xl">
                {profile?.full_name || "Utilizador"}
              </h1>
              {isOwnProfile && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setEditOpen(true)}
                  className="border-white/40 bg-transparent text-white hover:bg-white/10 hover:text-white"
                >
                  <Pencil className="size-4" />
                  Editar perfil
                </Button>
              )}
            </div>

            <div className="mt-2 space-y-1 text-sm text-primary-foreground/90">
              {memberSince && (
                <p className="flex items-center gap-2">
                  <Calendar className="size-4 shrink-0" />
                  Membro na Moyo Markit desde {memberSince}
                </p>
              )}
              {profile?.location && (
                <p className="flex items-center gap-2">
                  <MapPin className="size-4 shrink-0" />
                  {profile.location}
                </p>
              )}
            </div>

            {profile?.bio ? (
              <p className="mt-3 max-w-xl whitespace-pre-line text-sm text-primary-foreground/95">
                {profile.bio}
              </p>
            ) : (
              isOwnProfile && (
                <button
                  type="button"
                  onClick={() => setEditOpen(true)}
                  className="mt-3 text-sm text-primary-foreground/80 underline-offset-2 hover:underline"
                >
                  Adicione uma descrição sobre si
                </button>
              )
            )}
          </div>
        </div>
      </section>

      <Tabs defaultValue="anuncios" className="mt-6">
        <TabsList className="w-full justify-start sm:w-auto">
          <TabsTrigger value="anuncios">Anúncios{listings ? ` (${total})` : ""}</TabsTrigger>
          <TabsTrigger value="sobre">Sobre</TabsTrigger>
        </TabsList>

        <TabsContent value="anuncios" className="mt-4">
          {isLoading ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="aspect-[4/3] animate-pulse rounded-xl bg-muted" />
              ))}
            </div>
          ) : listings && listings.length > 0 ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {listings.map((l) => (
                <ListingCard
                  key={l.id}
                  listing={l}
                  showOwnerActions={isOwnProfile}
                  onRenewed={() =>
                    queryClient.invalidateQueries({ queryKey: ["profile-listings", id] })
                  }
                  onDeleted={() =>
                    queryClient.setQueryData(
                      ["profile-listings", id],
                      (cur: ListingCardData[] | undefined) =>
                        cur?.filter((item) => item.id !== l.id),
                    )
                  }
                />
              ))}
            </div>
          ) : isOwnProfile ? (
            <div className="rounded-2xl border border-dashed p-8 text-center">
              <div className="mx-auto grid size-16 place-items-center rounded-full bg-primary/10 text-primary">
                <Inbox className="size-8" />
              </div>
              <h3 className="mt-4 text-lg font-semibold">Ainda não tens anúncios</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Quando publicares, eles aparecerão aqui.
              </p>
              <Button asChild className="mt-4">
                <Link to="/new">
                  <Plus className="size-4" />
                  Publicar anúncio
                </Link>
              </Button>
            </div>
          ) : (
            <p className="rounded-xl border border-dashed p-8 text-center text-muted-foreground">
              Este utilizador ainda não publicou anúncios.
            </p>
          )}
        </TabsContent>

        <TabsContent value="sobre" className="mt-4">
          <div className="space-y-4 rounded-2xl border bg-card p-5 shadow-[var(--shadow-card)]">
            <div>
              <h3 className="text-sm font-medium text-muted-foreground">Descrição</h3>
              <p className="mt-1 whitespace-pre-line text-sm">
                {profile?.bio ||
                  (isOwnProfile
                    ? "Ainda não escreveu nada sobre si."
                    : "Este utilizador ainda não escreveu uma descrição.")}
              </p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-muted-foreground">Localização</h3>
              <p className="mt-1 text-sm">{profile?.location || "Não indicada"}</p>
            </div>
            {memberSince && (
              <div>
                <h3 className="text-sm font-medium text-muted-foreground">Membro desde</h3>
                <p className="mt-1 text-sm">{memberSince}</p>
              </div>
            )}
            {isOwnProfile && (
              <div className="border-t pt-4">
                <h3 className="text-sm font-medium text-destructive">Zona de perigo</h3>
                <p className="mt-1 text-xs text-muted-foreground">
                  Apagar a conta remove o seu perfil, anúncios, fotos e vídeos. Não pode ser
                  desfeito.
                </p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="mt-2 border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive"
                  onClick={() => setDeleteOpen(true)}
                >
                  Apagar a minha conta
                </Button>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>

      <Dialog open={photoOpen} onOpenChange={setPhotoOpen}>
        <DialogContent className="max-w-sm gap-0 overflow-hidden p-0 sm:max-w-md">
          <DialogHeader className="sr-only">
            <DialogTitle>Foto de perfil</DialogTitle>
            <DialogDescription>{profile?.full_name}</DialogDescription>
          </DialogHeader>
          {profile?.avatar_url && (
            <img
              src={profile.avatar_url}
              alt={profile.full_name}
              className="aspect-square w-full object-cover"
            />
          )}
        </DialogContent>
      </Dialog>

      {isOwnProfile && user && (
        <DeleteAccountDialog
          open={deleteOpen}
          onOpenChange={setDeleteOpen}
          userId={user.id}
          onDeleted={async () => {
            await signOut();
            queryClient.clear();
            navigate({ to: "/" });
          }}
        />
      )}

      {isOwnProfile && profile && (
        <EditProfileDialog
          open={editOpen}
          onOpenChange={setEditOpen}
          profile={profile}
          onSaved={() => queryClient.invalidateQueries({ queryKey: ["profile", id] })}
        />
      )}
    </div>
  );
}

function EditProfileDialog({
  open,
  onOpenChange,
  profile,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  profile: ProfileData;
  onSaved: () => void;
}) {
  const [fullName, setFullName] = useState(profile.full_name);
  const [phone, setPhone] = useState(profile.phone ?? "");
  const [location, setLocation] = useState(profile.location ?? "");
  const [bio, setBio] = useState(profile.bio ?? "");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setFullName(profile.full_name);
      setPhone(profile.phone ?? "");
      setLocation(profile.location ?? "");
      setBio(profile.bio ?? "");
    }
  }, [open, profile]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = profileSchema.safeParse({
      full_name: fullName,
      phone,
      location,
      bio,
    });
    if (!parsed.success) {
      toast.error(parsed.error.errors[0].message);
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: parsed.data.full_name,
          phone: parsed.data.phone ? normalizeAngolanPhone(parsed.data.phone) : null,
          location: parsed.data.location,
          bio: parsed.data.bio,
        })
        .eq("id", profile.id);
      if (error) throw error;
      toast.success("Perfil atualizado!");
      onSaved();
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao guardar o perfil");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={onSubmit} className="space-y-4">
          <DialogHeader>
            <DialogTitle>Editar perfil</DialogTitle>
            <DialogDescription>Estes dados aparecem no seu perfil público.</DialogDescription>
          </DialogHeader>

          <div className="space-y-1.5">
            <Label htmlFor="full_name">Nome</Label>
            <Input
              id="full_name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              maxLength={80}
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="phone">Telefone</Label>
            <Input
              id="phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              maxLength={20}
              placeholder="923 456 789"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="location">Localização</Label>
            <Input
              id="location"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              maxLength={80}
              placeholder="Luanda, Angola"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="bio">Sobre si</Label>
            <Textarea
              id="bio"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              maxLength={280}
              rows={4}
              placeholder="Conte em poucas palavras quem é e o que anuncia."
            />
            <p className="text-right text-xs text-muted-foreground">{bio.length}/280</p>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "A guardar..." : "Guardar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function DeleteAccountDialog({
  open,
  onOpenChange,
  userId,
  onDeleted,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  userId: string;
  onDeleted: () => Promise<void>;
}) {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);

  async function confirm() {
    setBusy(true);
    try {
      await purgeUserFiles(userId);
      const { error } = await supabase.rpc("delete_my_account");
      if (error) throw error;
      toast.success("A sua conta foi apagada.");
      await onDeleted();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível apagar a conta");
      setBusy(false);
    }
  }

  return (
    <AlertDialog
      open={open}
      onOpenChange={(v) => {
        if (!busy) {
          setText("");
          onOpenChange(v);
        }
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Apagar a sua conta?</AlertDialogTitle>
          <AlertDialogDescription>
            Todos os seus anúncios, fotos e vídeos serão removidos para sempre. Para confirmar,
            escreva <strong>APAGAR</strong> abaixo.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <Input value={text} onChange={(e) => setText(e.target.value)} placeholder="APAGAR" />
        <AlertDialogFooter>
          <AlertDialogCancel disabled={busy}>Cancelar</AlertDialogCancel>
          <Button
            variant="destructive"
            disabled={busy || text.trim().toUpperCase() !== "APAGAR"}
            onClick={confirm}
          >
            {busy ? "A apagar..." : "Apagar conta"}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
