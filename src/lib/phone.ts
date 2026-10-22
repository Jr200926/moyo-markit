export const PHONE_ERROR = "Indique um número angolano válido, por exemplo 923 456 789";

/** Aceita 9XXXXXXXX, 2449XXXXXXXX, +2449XXXXXXXX e 002449XXXXXXXX. Devolve +2449XXXXXXXX ou null. */
export function normalizeAngolanPhone(input: string): string | null {
  let d = input.replace(/[\s\-().]/g, "");
  if (d.startsWith("+")) d = d.slice(1);
  if (d.startsWith("00")) d = d.slice(2);
  if (d.startsWith("244")) d = d.slice(3);
  return /^9\d{8}$/.test(d) ? `+244${d}` : null;
}
