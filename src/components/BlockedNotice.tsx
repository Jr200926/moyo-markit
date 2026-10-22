import { ShieldAlert } from "lucide-react";

export function BlockedNotice() {
  return (
    <div className="mx-auto max-w-md px-4 py-16 text-center">
      <ShieldAlert className="mx-auto mb-3 size-10 text-destructive" />
      <h1 className="text-lg font-semibold">Conta bloqueada</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        A sua conta foi bloqueada pela equipa do Moyo Markit. Não é possível publicar nem editar
        anúncios. Se acha que foi um engano, entre em contacto connosco.
      </p>
    </div>
  );
}
