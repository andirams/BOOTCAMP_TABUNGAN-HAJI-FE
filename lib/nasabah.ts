import { authFetch } from "@/lib/api";

/* ---------------------------------------------------------------- *
 * Tipe data nasabah (mengikuti bentuk respons backend /nasabah).
 * ---------------------------------------------------------------- */

export type NasabahRecord = {
  id: string;
  nik: string;
  nama: string;
  email: string;
  nomorHp: string;
  createdAt: string;
  updatedAt: string;
};

/** Field untuk membuat nasabah baru. NIK wajib & tidak bisa diubah setelahnya. */
export type NasabahCreateInput = {
  nik: string;
  nama: string;
  email: string;
  nomorHp: string;
};

/** Field yang boleh diperbarui (NIK dikecualikan oleh backend). */
export type NasabahUpdateInput = Partial<Omit<NasabahCreateInput, "nik">>;

const JSON_HEADER = { "Content-Type": "application/json" };

/** Rangkai pesan error yang ramah dari berbagai bentuk respons error backend. */
async function pesanError(res: Response, fallback: string): Promise<string> {
  const data = await res.json().catch(() => null);
  const detail =
    data?.details && typeof data.details === "object"
      ? Object.values(data.details).flat().filter(Boolean).join(" ")
      : null;
  return detail || data?.message || data?.error?.message || data?.error || fallback;
}

/* ---------------------------------------------------------------- *
 * Controller CRUD nasabah — cermin dari nasabahController di backend.
 * ---------------------------------------------------------------- */

export const nasabahApi = {
  /** GET /nasabah — seluruh nasabah (terbaru lebih dulu). */
  async list(): Promise<NasabahRecord[]> {
    const res = await authFetch("/nasabah");
    if (!res.ok) throw new Error(await pesanError(res, "Gagal memuat daftar nasabah."));
    const json = await res.json();
    return (json?.data ?? []) as NasabahRecord[];
  },

  /** GET /nasabah/:id — satu nasabah. */
  async get(id: string): Promise<NasabahRecord> {
    const res = await authFetch(`/nasabah/${id}`);
    if (res.status === 404) throw new Error("Nasabah tidak ditemukan.");
    if (!res.ok) throw new Error(await pesanError(res, "Gagal memuat nasabah."));
    return (await res.json()) as NasabahRecord;
  },

  /** POST /nasabah — tambah nasabah baru. */
  async create(input: NasabahCreateInput): Promise<NasabahRecord> {
    const res = await authFetch("/nasabah", {
      method: "POST",
      headers: JSON_HEADER,
      body: JSON.stringify(input),
    });
    if (!res.ok) throw new Error(await pesanError(res, "Gagal menambah nasabah."));
    return (await res.json()) as NasabahRecord;
  },

  /** PATCH /nasabah/:id — perbarui data nasabah (selain NIK). */
  async update(id: string, input: NasabahUpdateInput): Promise<NasabahRecord> {
    const res = await authFetch(`/nasabah/${id}`, {
      method: "PATCH",
      headers: JSON_HEADER,
      body: JSON.stringify(input),
    });
    if (!res.ok) throw new Error(await pesanError(res, "Gagal memperbarui nasabah."));
    return (await res.json()) as NasabahRecord;
  },

  /** DELETE /nasabah/:id — hapus nasabah. */
  async remove(id: string): Promise<void> {
    const res = await authFetch(`/nasabah/${id}`, { method: "DELETE" });
    if (!res.ok) throw new Error(await pesanError(res, "Gagal menghapus nasabah."));
  },
};
