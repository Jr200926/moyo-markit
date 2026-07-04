export function formatKwanza(value: number | null | undefined): string {
  if (value == null) return "Sob consulta";
  try {
    return new Intl.NumberFormat("pt-AO", {
      style: "currency",
      currency: "AOA",
      maximumFractionDigits: 0,
    }).format(Number(value));
  } catch {
    return `Kz ${Number(value).toLocaleString("pt-PT")}`;
  }
}

export function categoryLabel(c: "imoveis" | "servicos"): string {
  return c === "imoveis" ? "Imóveis" : "Serviços";
}

export function buildWhatsAppUrl(phone: string, message: string): string {
  const digits = phone.replace(/\D/g, "");
  // Default to Angola country code if user typed local number
  const withCc = digits.startsWith("244") || digits.length > 9 ? digits : `244${digits}`;
  return `https://wa.me/${withCc}?text=${encodeURIComponent(message)}`;
}
