import { Link, useNavigate } from "@tanstack/react-router";
import { LogOut, Plus, ShieldAlert, User as UserIcon } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useOwnProfile } from "@/lib/useOwnProfile";
import { Button } from "@/components/ui/button";

export function Header() {
  const { user, signOut } = useAuth();
  const { data: ownProfile } = useOwnProfile();
  const navigate = useNavigate();

  return (
    <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        <Link to="/" className="flex items-center gap-2">
          <img src="/logo-icon.png" alt="Moyo Markit" className="h-9 w-9" />
          <span className="text-lg font-bold tracking-tight">
            <span className="text-[#0a5c2b] dark:text-[#7be04a]">Moyo</span>
            <span className="text-[#3bb61d]">Markit</span>
          </span>
        </Link>

        <nav className="flex items-center gap-2">
          {user ? (
            <>
              {ownProfile?.is_admin && (
                <Button asChild variant="ghost" size="sm">
                  <Link to="/admin">
                    <ShieldAlert className="size-4" />
                    <span className="hidden sm:inline">Admin</span>
                  </Link>
                </Button>
              )}
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
