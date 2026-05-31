"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { downloadLaporan, UnauthorizedError } from "@/lib/api";

const BULAN = [
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
];

export default function LaporanPage() {
  const router = useRouter();
  const now = new Date();

  const [bulan, setBulan] = useState(now.getMonth() + 1);
  const [tahun, setTahun] = useState(now.getFullYear());
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sukses, setSukses] = useState(false);

  // Pilihan tahun: 5 tahun terakhir.
  const tahunOpsi = Array.from({ length: 5 }, (_, i) => now.getFullYear() - i);

  async function unduh() {
    if (downloading) return;
    setError(null);
    setSukses(false);
    setDownloading(true);
    try {
      await downloadLaporan(bulan, tahun);
      setSukses(true);
    } catch (err) {
      if (err instanceof UnauthorizedError) {
        router.replace("/login");
        return;
      }
      setError(err instanceof Error ? err.message : "Gagal mengunduh laporan.");
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div className="max-w-[560px] mx-auto space-y-gutter">
      <div>
        <h2 className="font-headline-lg text-headline-lg text-on-surface">Laporan Transaksi</h2>
        <p className="font-body-md text-body-md text-on-surface-variant mt-xs">
          Unduh rekap transaksi bulanan dalam format CSV.
        </p>
      </div>

      <div className="bg-surface-container-lowest rounded-xl shadow-sm border border-surface-variant p-lg flex flex-col gap-lg">
        <div className="flex items-center gap-md">
          <div className="w-12 h-12 rounded-full bg-primary-container/10 text-primary-container flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>
              description
            </span>
          </div>
          <div>
            <h3 className="font-headline-md text-headline-md text-on-surface">Rekap Bulanan</h3>
            <p className="font-body-sm text-body-sm text-on-surface-variant">
              Pilih periode laporan yang ingin diunduh.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-md">
          <div className="flex flex-col gap-sm">
            <label htmlFor="bulan" className="font-label-md text-label-md text-on-surface-variant">
              Bulan
            </label>
            <select
              id="bulan"
              value={bulan}
              onChange={(e) => setBulan(Number(e.target.value))}
              className="w-full p-md bg-surface border border-outline-variant rounded-lg font-label-md text-label-md text-on-surface focus:border-primary-container focus:ring-1 focus:ring-primary-container outline-none"
            >
              {BULAN.map((nama, i) => (
                <option key={nama} value={i + 1}>
                  {nama}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-sm">
            <label htmlFor="tahun" className="font-label-md text-label-md text-on-surface-variant">
              Tahun
            </label>
            <select
              id="tahun"
              value={tahun}
              onChange={(e) => setTahun(Number(e.target.value))}
              className="w-full p-md bg-surface border border-outline-variant rounded-lg font-label-md text-label-md text-on-surface focus:border-primary-container focus:ring-1 focus:ring-primary-container outline-none"
            >
              {tahunOpsi.map((th) => (
                <option key={th} value={th}>
                  {th}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Catatan cakupan */}
        <div className="flex items-start gap-sm p-md bg-secondary-container/10 border border-secondary-container/20 rounded-lg">
          <span
            className="material-symbols-outlined text-secondary"
            style={{ fontVariationSettings: "'FILL' 1" }}
          >
            info
          </span>
          <p className="font-body-sm text-body-sm text-on-surface-variant pt-[2px]">
            Laporan mencakup seluruh transaksi pada{" "}
            <strong className="text-on-surface">
              {BULAN[bulan - 1]} {tahun}
            </strong>{" "}
            dari semua rekening Anda. Batas bulan mengikuti waktu WIB.
          </p>
        </div>

        {error && (
          <p className="flex items-center gap-xs text-error font-body-sm text-body-sm">
            <span className="material-symbols-outlined text-[18px]">error</span>
            {error}
          </p>
        )}
        {sukses && !error && (
          <p className="flex items-center gap-xs text-primary-container font-body-sm text-body-sm">
            <span className="material-symbols-outlined text-[18px]">check_circle</span>
            Laporan {BULAN[bulan - 1]} {tahun} berhasil diunduh.
          </p>
        )}

        <button
          onClick={unduh}
          disabled={downloading}
          className="h-[48px] w-full bg-primary text-on-primary font-label-md text-label-md rounded-lg hover:bg-primary-container transition-colors flex items-center justify-center gap-sm disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {downloading ? (
            <>
              <span className="material-symbols-outlined animate-spin">progress_activity</span>
              Menyiapkan...
            </>
          ) : (
            <>
              <span className="material-symbols-outlined">download</span>
              Unduh Laporan CSV
            </>
          )}
        </button>
      </div>
    </div>
  );
}
