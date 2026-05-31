"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  getMutasi,
  UnauthorizedError,
  type MutasiResponse,
  type Transaksi,
} from "@/lib/api";
import { formatRupiah, formatTanggal } from "@/lib/format";

const PAGE_SIZE = 8;

/* Label metode → tampilan ramah. */
function labelMetode(metode: string | null): string {
  switch (metode) {
    case "TUNAI":
      return "Tunai";
    case "TRANSFER":
      return "Transfer";
    case "VIRTUAL_ACCOUNT":
      return "Virtual Account";
    case "QRIS":
      return "QRIS";
    default:
      return "-";
  }
}

function jamWib(iso: string): string {
  try {
    return (
      new Date(iso).toLocaleTimeString("id-ID", {
        hour: "2-digit",
        minute: "2-digit",
      }) + " WIB"
    );
  } catch {
    return "";
  }
}

export default function MutasiPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const id = params.id;

  const [data, setData] = useState<MutasiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [copied, setCopied] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getMutasi(id);
      setData(res);
    } catch (err) {
      if (err instanceof UnauthorizedError) {
        router.replace("/login");
        return;
      }
      setError(err instanceof Error ? err.message : "Gagal memuat mutasi rekening.");
    } finally {
      setLoading(false);
    }
  }, [id, router]);

  useEffect(() => {
    load();
  }, [load]);

  const semua = data?.mutasi ?? [];

  const terfilter = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return semua;
    return semua.filter((t) => {
      return (
        t.jenis.toLowerCase().includes(q) ||
        labelMetode(t.metode).toLowerCase().includes(q) ||
        t.referensi.toLowerCase().includes(q) ||
        formatTanggal(t.waktu).toLowerCase().includes(q)
      );
    });
  }, [semua, query]);

  const totalHalaman = Math.max(1, Math.ceil(terfilter.length / PAGE_SIZE));
  const halamanAman = Math.min(page, totalHalaman);
  const mulai = (halamanAman - 1) * PAGE_SIZE;
  const tampil = terfilter.slice(mulai, mulai + PAGE_SIZE);

  useEffect(() => {
    setPage(1);
  }, [query]);

  async function copyNomor() {
    if (!data) return;
    try {
      await navigator.clipboard.writeText(data.tabungan.nomorRekening);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* abaikan bila clipboard tidak tersedia */
    }
  }

  function unduhCsv() {
    if (!data) return;
    const header = ["Tanggal", "Jenis", "Metode", "Nominal", "Saldo Sebelum", "Saldo Sesudah", "Referensi"];
    const baris = terfilter.map((t) => [
      new Date(t.waktu).toLocaleString("id-ID"),
      t.jenis,
      labelMetode(t.metode),
      t.nominal,
      t.saldoSebelum,
      t.saldoSesudah,
      t.referensi,
    ]);
    const csv = [header, ...baris]
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `mutasi-${data.tabungan.nomorRekening}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-gutter pb-xxl">
      {/* Back */}
      <Link
        href="/rekening"
        className="flex items-center gap-sm text-on-surface-variant hover:text-primary transition-colors w-fit group"
      >
        <span className="material-symbols-outlined text-[20px] group-hover:-translate-x-1 transition-transform">
          arrow_back
        </span>
        <span className="font-label-md text-label-md">Kembali ke Daftar Rekening</span>
      </Link>

      {loading ? (
        <div className="flex items-center justify-center gap-sm text-on-surface-variant py-xxl">
          <span className="material-symbols-outlined animate-spin">progress_activity</span>
          <span className="font-body-md text-body-md">Memuat mutasi...</span>
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center gap-md text-center py-xxl">
          <span className="material-symbols-outlined text-error text-5xl">error</span>
          <p className="font-body-md text-body-md text-on-surface-variant max-w-[28rem]">{error}</p>
          <button
            onClick={load}
            className="h-[44px] px-lg bg-primary text-on-primary font-label-md text-label-md rounded-lg hover:opacity-90"
          >
            Coba Lagi
          </button>
        </div>
      ) : data ? (
        <>
          {/* Ringkasan rekening */}
          <section className="bg-surface-container-lowest rounded-xl shadow-sm border border-surface-variant p-lg relative overflow-hidden flex flex-col md:flex-row justify-between items-start md:items-center gap-md">
            <div className="absolute left-0 top-0 bottom-0 w-[4px] bg-primary" />
            <div className="flex flex-col gap-xs pl-sm">
              <div className="flex items-center gap-sm">
                <span className="material-symbols-outlined text-primary">account_balance</span>
                <h2 className="font-label-md text-label-md text-on-surface-variant uppercase tracking-wider">
                  Tabungan Haji
                </h2>
                <StatusBadge status={data.tabungan.status} />
              </div>
              <p className="font-headline-md text-headline-md text-on-surface flex items-center gap-sm">
                {data.tabungan.nomorRekening}
                <button
                  onClick={copyNomor}
                  className="text-primary hover:text-primary-container transition-colors"
                  title="Salin Nomor Rekening"
                >
                  <span className="material-symbols-outlined text-[20px]">
                    {copied ? "check" : "content_copy"}
                  </span>
                </button>
              </p>
            </div>
            <div className="flex flex-col items-start md:items-end pl-sm md:pl-0">
              <span className="font-label-sm text-label-sm text-on-surface-variant">
                Total Saldo Efektif
              </span>
              <p className="font-headline-lg-mobile md:font-headline-lg text-headline-lg-mobile md:text-headline-lg text-primary">
                {formatRupiah(data.tabungan.saldo)}
              </p>
            </div>
          </section>

          {/* Action bar */}
          <section className="flex flex-col md:flex-row justify-between items-start md:items-center gap-md">
            <h3 className="font-headline-md text-headline-md text-on-surface">Mutasi Rekening</h3>
            <div className="flex flex-wrap items-center gap-sm w-full md:w-auto">
              <div className="relative flex-1 md:w-56">
                <span className="material-symbols-outlined absolute left-sm top-1/2 -translate-y-1/2 text-[18px] text-on-surface-variant">
                  search
                </span>
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Cari transaksi..."
                  className="w-full bg-surface-container-lowest border border-outline-variant rounded-lg pl-xl pr-md py-sm text-on-surface focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all font-body-sm text-body-sm"
                />
              </div>
              <button
                onClick={unduhCsv}
                disabled={terfilter.length === 0}
                className="flex items-center gap-xs bg-transparent border-2 border-primary text-primary hover:bg-primary hover:text-on-primary rounded-lg px-md py-sm transition-all font-label-md text-label-md w-full md:w-auto justify-center disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-primary"
              >
                <span className="material-symbols-outlined text-[18px]">download</span>
                <span>Unduh CSV</span>
              </button>
            </div>
          </section>

          {/* Tabel */}
          <section className="bg-surface-container-lowest rounded-xl shadow-sm border border-surface-variant overflow-hidden">
            {terfilter.length === 0 ? (
              <div className="flex flex-col items-center text-center gap-sm py-xxl px-md">
                <span className="material-symbols-outlined text-on-surface-variant text-4xl">
                  receipt_long
                </span>
                <p className="font-body-md text-body-md text-on-surface-variant">
                  {semua.length === 0
                    ? "Belum ada transaksi pada rekening ini."
                    : "Tidak ada transaksi yang cocok dengan pencarian."}
                </p>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto w-full">
                  <table className="w-full text-left border-collapse min-w-[720px]">
                    <thead className="bg-surface-container text-on-surface-variant font-label-sm text-label-sm uppercase tracking-wider">
                      <tr>
                        <th className="py-sm px-md font-medium">Tanggal</th>
                        <th className="py-sm px-md font-medium">Jenis</th>
                        <th className="py-sm px-md font-medium">Metode</th>
                        <th className="py-sm px-md font-medium text-right">Nominal</th>
                        <th className="py-sm px-md font-medium text-right">Saldo Akhir</th>
                      </tr>
                    </thead>
                    <tbody className="font-body-sm text-body-sm text-on-surface divide-y divide-surface-variant">
                      {tampil.map((t) => (
                        <BarisTransaksi key={t.id} t={t} />
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Paginasi */}
                <div className="border-t border-surface-variant px-md py-sm flex items-center justify-between text-on-surface-variant font-body-sm text-body-sm">
                  <span>
                    Menampilkan {mulai + 1}-{Math.min(mulai + PAGE_SIZE, terfilter.length)} dari{" "}
                    {terfilter.length} transaksi
                  </span>
                  <div className="flex items-center gap-xs">
                    <button
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={halamanAman <= 1}
                      className="p-xs rounded hover:bg-surface-container-high transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      aria-label="Sebelumnya"
                    >
                      <span className="material-symbols-outlined text-[20px]">chevron_left</span>
                    </button>
                    <span className="px-sm font-label-sm text-label-sm">
                      {halamanAman} / {totalHalaman}
                    </span>
                    <button
                      onClick={() => setPage((p) => Math.min(totalHalaman, p + 1))}
                      disabled={halamanAman >= totalHalaman}
                      className="p-xs rounded hover:bg-surface-container-high transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      aria-label="Berikutnya"
                    >
                      <span className="material-symbols-outlined text-[20px]">chevron_right</span>
                    </button>
                  </div>
                </div>
              </>
            )}
          </section>
        </>
      ) : null}
    </div>
  );
}

function BarisTransaksi({ t }: { t: Transaksi }) {
  const setor = t.jenis === "SETOR";
  return (
    <tr className="hover:bg-surface-container-low transition-colors">
      <td className="py-md px-md">
        <div className="flex flex-col">
          <span className="font-medium text-on-surface">{formatTanggal(t.waktu)}</span>
          <span className="text-[11px] text-on-surface-variant">{jamWib(t.waktu)}</span>
        </div>
      </td>
      <td className="py-md px-md">
        <div
          className={`flex items-center gap-xs w-fit px-2 py-1 rounded-full ${
            setor
              ? "text-primary-container bg-primary-fixed/20"
              : "text-error bg-error-container/50"
          }`}
        >
          <span className="material-symbols-outlined text-[16px]">
            {setor ? "arrow_downward" : "arrow_upward"}
          </span>
          <span className="font-label-sm text-label-sm">{setor ? "Setor" : "Tarik"}</span>
        </div>
      </td>
      <td className="py-md px-md text-on-surface-variant">{labelMetode(t.metode)}</td>
      <td
        className={`py-md px-md text-right font-label-md text-label-md ${
          setor ? "text-primary-container" : "text-on-surface"
        }`}
      >
        {setor ? "+ " : "- "}
        {formatRupiah(t.nominal)}
      </td>
      <td className="py-md px-md text-right font-medium">{formatRupiah(t.saldoSesudah)}</td>
    </tr>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    AKTIF: "bg-primary/10 text-primary-container",
    TUTUP: "bg-surface-container-high text-on-surface-variant",
    BEKU: "bg-error-container/50 text-error",
  };
  return (
    <span
      className={`font-label-sm text-label-sm px-sm py-[2px] rounded-full ${map[status] ?? "bg-surface-container-high text-on-surface-variant"}`}
    >
      {status}
    </span>
  );
}
