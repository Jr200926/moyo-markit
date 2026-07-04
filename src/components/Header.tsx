import { Link, useNavigate } from "@tanstack/react-router";
import { LogOut, Plus, User as UserIcon } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";

export function Header() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  return (
    <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        <Link to="/" className="flex items-center gap-2">
          <div className="grid h-8 w-8 place-items-center rounded-lg bg-primary text-primary-foreground font-bold">
            M
          </div>
          <span className="text-lg font-semibold tracking-tight">Moyo Mark</span>
        </Link>

        <nav className="flex items-center gap-2">
          {user ? (
            <>
              <Button asChild variant="default" size="sm">
                <Link to="/new">
                  <Plus className="size-4" /> Publicar
                </Link>
              </Button>
              <Button asChild variant="ghost" size="sm">
                <Link to="/profile/$id" params={{ id: user.id }}>
                  <UserIcon className="size-4" />
                  <span className="hidden sm:inline">Perfil</span>
                </Link>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={async () => {
                  await signOut();
                  navigate({ to: "/" });
                }}
              >
                <LogOut className="size-4" />
              </Button>
            </>
          ) : (
            <>
              <Button asChild variant="ghost" size="sm">
                <Link to="/auth">Entrar</Link>
              </Button>
              <Button asChild size="sm">
                <Link to="/auth">Publicar</Link>
              </Button>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
