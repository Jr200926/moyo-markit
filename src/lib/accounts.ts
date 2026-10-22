import { supabase } from "@/integrations/supabase/client";
import { removeFromStorage } from "@/lib/media";

/** Apaga do armazenamento as fotos, vídeos e avatar de um utilizador (melhor esforço). */
export async function purgeUserFiles(userId: string) {
  const { data: listings } = await supabase
    .from("listings")
    .select("photos,video_url")
    .eq("user_id", userId);
  const { data: profile } = await supabase
    .from("profiles")
    .select("avatar_url")
    .eq("id", userId)
    .maybeSingle();

  await removeFromStorage(
    "listing-photos",
    (listings ?? []).flatMap((l) => l.photos ?? []),
  );
  await removeFromStorage(
    "listing-videos",
    (listings ?? []).map((l) => l.video_url),
  );
  await removeFromStorage("avatars", [profile?.avatar_url]);
}

export function daysLeft(expiresAt: string | null | undefined): number | null {
  if (!expiresAt) return null;
  return Math.ceil((new Date(expiresAt).getTime() - Date.now()) / 86_400_000);
}
