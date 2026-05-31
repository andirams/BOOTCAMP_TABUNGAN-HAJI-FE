"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "@/lib/session";
import { openRekening, UnauthorizedError } from "@/lib/api";
import { parseRupiah } from "@/lib/format";

const QUICK = [
  { label: "+1 Jt", amount: 1_000_000 },
  { label: "+5 Jt", amount: 5_000_000 },
  { label: "+25 Jt", amount: 25_000_000 },
];

export default function BukaRekeningPage() {
  const router = useRouter();
  const { refresh } = useSession();

  const [nominalRaw, setNominalRaw] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const setoranAwal = parseRupiah(nominalRaw); // null = tanpa setoran awal

  function onNominalChange(value: string) {
    const digits = value.replace(/\D/g, "");
    setNominalRaw(digits ? Number(digits).toLocaleString("id-ID") : "");
  }

  function tambah(amount: number) {
    const current = parseRupiah(nominalRaw) ?? 0;
    setNominalRaw((current + amount).toLocaleString("id-ID"));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    setError(null);
    setSubmitting(true);
    try {
      await openRekening(setoranAwal ?? undefined);
      await refresh();
      router.push("/rekening");
    } catch (err) {
      if (err instanceof UnauthorizedError) {
        router.replace("/login");
        return;
      }
      setError(err instanceof Error ? err.message : "Gagal membuka rekening.");
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-[520px] mx-auto">
      <Link
        href="/rekening"
        className="flex items-center gap-sm text-on-surface-variant hover:text-primary transition-colors w-fit group mb-lg"
      >
        <span className="material-symbols-outlined text-[20px] group-hover:-translate-x-1 transition-transform">
          arrow_back
        </span>
        <span className="font-label-md text-label-md">Kembali ke Daftar Rekening</span>
      </Link>

      <div className="bg-surface rounded-xl shadow-[0_8px_24px_rgba(27,28,28,0.10)] border border-surface-variant flex flex-col overflow-hidden">
        <div className="px-lg py-md border-b border-surface-variant">
          <h2 className="font-headline-md text-headline-md text-on-surface">Buka Rekening Haji</h2>
          <p className="font-body-sm text-body-sm text-on-surface-variant mt-xs">
            Rekening baru langsung aktif. Setoran awal bersifat opsional.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="p-lg flex flex-col gap-xl">
          <div className="flex flex-col gap-sm">
            <label htmlFor="nominal" className="font-label-md text-label-md text-on-surface-variant">
              Setoran Awal <span className="text-on-surface-variant/60">(opsional)</span>
            </label>
            <div className="relative flex items-center">
              <span className="absolute left-md font-headline-md text-headline-md text-on-surface-variant pointer-events-none">
                Rp
              </span>
              <input
                id="nominal"
                inputMode="numeric"
                placeholder="0"
                value={nominalRaw}
                onChange={(e) => onNominalChange(e.target.value)}
                className="w-full pl-[56px] pr-md py-md bg-surface border border-outline rounded-lg font-headline-md text-headline-md text-on-surface focus:border-primary-container focus:ring-1 focus:ring-primary-container outline-none transition-all"
              />
            </div>
            <div className="flex gap-sm mt-xs flex-wrap">
              {QUICK.map((q) => (
                <button
                  key={q.label}
                  type="button"
                  onClick={() => tambah(q.amount)}
                  className="px-sm py-xs border border-outline-variant rounded-full font-label-sm text-label-sm text-on-surface-variant hover:bg-surface-container-low transition-colors"
                >
                  {q.label}
                </button>
              ))}
            </div>
            <p className="font-body-sm text-body-sm text-on-surface-variant">
              Saldo minimal Rp 25.000.000 diperlukan untuk memperoleh nomor porsi haji.
            </p>
          </div>

          {error && (
            <p className="flex items-center gap-xs text-error font-body-sm text-body-sm">
              <span className="material-symbols-outlined text-[18px]">error</span>
              {error}
            </p>
          )}

          <div className="flex items-center justify-end gap-md pt-sm border-t border-surface-variant">
            <Link
              href="/rekening"
              className="font-label-md text-label-md text-primary-container px-lg py-sm rounded-full hover:bg-primary/5 transition-colors"
            >
              Batal
            </Link>
            <button
              type="submit"
              disabled={submitting}
              className="font-label-md text-label-md text-on-primary bg-primary-container px-xl py-sm rounded-full shadow-sm hover:bg-primary transition-colors flex items-center gap-xs disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? (
                <>
                  <span className="material-symbols-outlined text-[18px] animate-spin">
                    progress_activity
                  </span>
                  Memproses...
                </>
              ) : (
                <>
                  Buka Rekening
                  <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
