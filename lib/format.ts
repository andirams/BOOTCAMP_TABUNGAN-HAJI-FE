const idID = new Intl.NumberFormat("id-ID");

export function formatRupiah(value: string | number | bigint): string {
  let n: bigint;
  if (typeof value === "bigint") n = value;
  else if (typeof value === "string") n = BigInt(value || "0");
  else n = BigInt(Math.trunc(value || 0));
  return `Rp ${idID.format(n)}`;
}

export function formatAngka(value: number): string {
  return idID.format(value);
}

export function formatTanggal(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("id-ID", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

export function formatTanggalJam(iso: string): string {
  try {
    return new Date(iso).toLocaleString("id-ID", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

export function maskRekening(nomor: string): string {
  if (nomor.length <= 8) return nomor;
  return `${nomor.slice(0, 4)} **** ${nomor.slice(-4)}`;
}

export function inisial(nama: string): string {
  return nama
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

/** Ubah string angka mentah (mis. "2500000") menjadi integer rupiah, atau null bila tak valid. */
export function parseRupiah(raw: string): number | null {
  const digits = raw.replace(/[^\d]/g, "");
  if (!digits) return null;
  const n = Number(digits);
  return Number.isSafeInteger(n) && n > 0 ? n : null;
}
