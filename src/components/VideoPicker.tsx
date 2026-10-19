import { useEffect, useMemo } from "react";
import { toast } from "sonner";
import { Video, X } from "lucide-react";
import { MAX_VIDEO_MB, VIDEO_ACCEPT, validateVideo } from "@/lib/media";
import { Label } from "@/components/ui/label";

export function VideoPicker({
  file,
  existingUrl,
  onPick,
  onRemove,
}: {
  file: File | null;
  existingUrl?: string | null;
  onPick: (file: File) => void;
  onRemove: () => void;
}) {
  const previewUrl = useMemo(() => (file ? URL.createObjectURL(file) : null), [file]);
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const src = previewUrl ?? existingUrl ?? null;

  function onChange(e: React.ChangeEvent<HTMLInputElement>) {
    const picked = e.target.files?.[0];
    e.target.value = "";
    if (!picked) return;
    const problem = validateVideo(picked);
    if (problem) {
      toast.error(problem);
      return;
    }
    onPick(picked);
  }

  return (
    <div className="space-y-2">
      <Label>Vídeo (opcional)</Label>
      {src ? (
        <div className="relative overflow-hidden rounded-lg border bg-black">
          <video
            src={src}
            controls
            playsInline
            preload="metadata"
            className="aspect-video w-full"
          />
          <button
            type="button"
            onClick={onRemove}
            aria-label="Remover vídeo"
            className="absolute right-2 top-2 grid size-7 place-items-center rounded-full bg-foreground/70 text-background hover:bg-foreground"
          >
            <X className="size-4" />
          </button>
        </div>
      ) : (
        <label className="flex cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border border-dashed bg-muted/40 px-4 py-6 text-center text-xs text-muted-foreground hover:bg-muted">
          <Video className="size-6" />
          <span className="text-sm font-medium text-foreground">Adicionar vídeo</span>
          MP4, WebM ou MOV, até {MAX_VIDEO_MB} MB
          <input type="file" accept={VIDEO_ACCEPT} className="hidden" onChange={onChange} />
        </label>
      )}
    </div>
  );
}
