import {
  Car,
  Dumbbell,
  Home,
  Package,
  Shirt,
  Smartphone,
  Sofa,
  Wrench,
  type LucideIcon,
} from "lucide-react";

export const CATEGORIES = [
  { value: "imoveis", label: "Imóveis", icon: Home },
  { value: "veiculos", label: "Veículos", icon: Car },
  { value: "eletronicos", label: "Eletrónicos", icon: Smartphone },
  { value: "casa", label: "Casa e móveis", icon: Sofa },
  { value: "moda", label: "Moda e beleza", icon: Shirt },
  { value: "servicos", label: "Serviços", icon: Wrench },
  { value: "desporto", label: "Desporto e lazer", icon: Dumbbell },
  { value: "outros", label: "Outros", icon: Package },
] as const satisfies readonly { value: string; label: string; icon: LucideIcon }[];

export type Category = (typeof CATEGORIES)[number]["value"];

export const CATEGORY_VALUES = CATEGORIES.map((c) => c.value) as [Category, ...Category[]];

export function categoryLabel(value: string): string {
  return CATEGORIES.find((c) => c.value === value)?.label ?? "Outros";
}
