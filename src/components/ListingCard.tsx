import { Link } from "@tanstack/react-router";
import { MapPin } from "lucide-react";
import { categoryLabel, formatKwanza } from "@/lib/format";
import { Badge } from "@/components/ui/badge";

export interface ListingCardData {
  id: string;
  title: string;
  price: number | null;
  location: string;
  category: "imoveis" | "servicos";
  photos: string[];
  created_at: string;
}

export function ListingCard({ listing }: { listing: ListingCardData }) {
  const cover = listing.photos?.[0];
  return (
    <Link
      to="/listing/$id"
      params={{ id: listing.id }}
      className="group overflow-hidden rounded-xl border bg-card shadow-[var(--shadow-card)] transition hover:shadow-[var(--shadow-elevated)]"
    >
      <div className="aspect-[4/3] overflow-hidden bg-muted">
        {cover ? (
          <img
            src={cover}
            alt={listing.title}
            loading="lazy"
            className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="grid h-full place-items-center text-sm text-muted-foreground">
            Sem foto
          </div>
        )}
      </div>
      <div className="space-y-1.5 p-3">
        <div className="flex items-center justify-between gap-2">
          <Badge variant="secondary" className="font-normal">
            {categoryLabel(listing.category)}
          </Badge>
          <span className="text-base font-semibold text-primary">
            {formatKwanza(listing.price)}
          </span>
        </div>
        <h3 className="line-clamp-2 text-sm font-medium leading-snug">{listing.title}</h3>
        {listing.location && (
          <p className="flex items-center gap-1 text-xs text-muted-foreground">
            <MapPin className="size-3" /> {listing.location}
          </p>
        )}
      </div>
    </Link>
  );
}
