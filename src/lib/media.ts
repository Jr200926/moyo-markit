import { supabase } from "@/integrations/supabase/client";

export const MAX_VIDEO_BYTES = 25 * 1024 * 1024;
export const MAX_VIDEO_MB = 25;
export const VIDEO_TYPES = ["video/mp4", "video/webm", "video/quicktime"];
export const VIDEO_ACCEPT = VIDEO_TYPES.join(",");

export function validateVideo(file: File): string | null {
  if (!VIDEO_TYPES.includes(file.type)) {
    return "Formato de vídeo não suportado. Use MP4, WebM ou MOV.";
  }
  if (file.size > MAX_VIDEO_BYTES) {
    const mb = (file.size / (1024 * 1024)).toFixed(1);
    return `O vídeo tem ${mb} MB e o limite é ${MAX_VIDEO_MB} MB. Escolha um vídeo mais curto ou de menor qualidade.`;
  }
  return null;
}

/** Link que faz o navegador descarregar o ficheiro em vez de o abrir. */
export function downloadHref(url: string, filename: string): string {
  return `${url}${url.includes("?") ? "&" : "?"}download=${encodeURIComponent(filename)}`;
}

export function fileExtension(url: string, fallback: string): string {
  const clean = url.split("?")[0];
  const ext = clean.includes(".") ? clean.split(".").pop() : undefined;
  return ext && ext.length <= 5 ? ext.toLowerCase() : fallback;
}

export function slugify(text: string): string {
  return (
    text
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40) || "anuncio"
  );
}

function pathFromUrl(url: string, bucket: string): string | null {
  const marker = `/${bucket}/`;
  const idx = url.indexOf(marker);
  if (idx === -1) return null;
  return decodeURIComponent(url.slice(idx + marker.length).split("?")[0]);
}

/** Apaga ficheiros do armazenamento. Não falha se algo correr mal. */
export async function removeFromStorage(bucket: string, urls: (string | null | undefined)[]) {
  const paths = urls
    .filter((u): u is string => !!u)
    .map((u) => pathFromUrl(u, bucket))
    .filter((p): p is string => !!p);
  if (paths.length === 0) return;
  try {
    await supabase.storage.from(bucket).remove(paths);
  } catch {
    /* melhor esforço */
  }
}
