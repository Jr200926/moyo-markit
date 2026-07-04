import { Link, useRouterState } from "@tanstack/react-router";
import { Home, PlusCircle, User } from "lucide-react";
import { useAuth } from "@/lib/auth";

export function BottomNav() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { user } = useAuth();

  const items = [
    { to: "/", label: "Home", icon: Home, match: (p: string) => p === "/" },
    {
      to: "/new",
      label: "Publicar",
      icon: PlusCircle,
      match: (p: string) => p.startsWith("/new"),
    },
    {
      to: user ? `/profile/${user.id}` : "/auth",
      label: "Perfil",
      icon: User,
      match: (p: string) => p.startsWith("/profile") || p.startsWith("/auth"),
    },
  ];

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t bg-card/95 backdrop-blur md:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      aria-label="Navegação principal"
    >
      <ul className="mx-auto grid max-w-md grid-cols-3">
        {items.map((it) => {
          const active = it.match(pathname);
          const Icon = it.icon;
          return (
            <li key={it.label}>
              <Link
                to={it.to}
                className={`flex flex-col items-center justify-center gap-1 py-2.5 text-xs font-medium transition ${
                  active ? "text-primary" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Icon className={`size-5 ${active ? "stroke-[2.5]" : ""}`} />
                {it.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
