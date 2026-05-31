"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "@/lib/session";
import {
  getEstimasiHaji,
  UnauthorizedError,
  type EstimasiHaji,
  type Tabungan,
} from "@/lib/api";
import { formatRupiah, formatAngka, maskRekening } from "@/lib/format";

/** Urutkan rekening: saldo terbesar dulu (paling relevan untuk estimasi porsi). */
function urutSaldo(tabungan: Tabungan[]): Tabungan[] {
  return [...tabungan].sort((a, b) => (BigInt(b.saldo) > BigInt(a.saldo) ? 1 : -1));
}

export default function EstimasiPage() {
  const router = useRouter();
  const { me } = useSession();

  const rekeningList = useMemo(() => (me ? urutSaldo(me.tabungan) : []), [me]);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [estimasi, setEstimasi] = useState<EstimasiHaji | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Pilih rekening utama (saldo terbesar) begitu data sesi tersedia.
  useEffect(() => {
    if (!me) return;
    if (rekeningList.length === 0) {
      setLoading(false);
      return;
    }
    if (!selectedId) setSelectedId(rekeningList[0].id);
  }, [me, rekeningList, selectedId]);

  const load = useCallback(
    async (tabunganId: string) => {
      setLoading(true);
      setError(null);
      try {
        const est = await getEstimasiHaji(tabunganId);
        setEstimasi(est);
      } catch (err) {
        if (err instanceof UnauthorizedError) {
          router.replace("/login");
          return;
        }
        setError(err instanceof Error ? err.message : "Gagal memuat estimasi keberangkatan.");
      } finally {
        setLoading(false);
      }
    },
    [router],
  );

  useEffect(() => {
    if (selectedId) load(selectedId);
  }, [selectedId, load]);

  if (!me) return null;

  const rekening = rekeningList.find((t) => t.id === selectedId) ?? null;

  return (
    <div className="islamic-pattern -m-gutter p-gutter min-h-full">
      {/* Header: tombol kembali + judul + pemilih rekening */}
      <div className="flex flex-col gap-md mb-lg">
        <div className="flex items-center gap-sm">
          <button
            type="button"
            onClick={() => router.back()}
            aria-label="Kembali"
            className="p-2 text-on-surface-variant hover:bg-surface-container rounded-full transition-colors"
          >
            <span className="material-symbols-outlined">arrow_back</span>
          </button>
          <h2 className="font-headline-lg text-headline-lg font-bold text-primary">
            Estimasi Keberangkatan Haji
          </h2>
        </div>

        {rekeningList.length > 1 && (
          <div className="flex items-center gap-sm">
            <span className="material-symbols-outlined text-on-surface-variant text-[20px]">
              savings
            </span>
            <label htmlFor="rekening" className="font-body-sm text-body-sm text-on-surface-variant">
              Rekening:
            </label>
            <select
              id="rekening"
              value={selectedId ?? ""}
              onChange={(e) => setSelectedId(e.target.value)}
              className="font-label-md text-label-md text-on-surface bg-surface-container-lowest border border-outline-variant rounded-lg px-sm py-xs focus:outline-none focus:border-primary-container focus:ring-1 focus:ring-primary-container"
            >
              {rekeningList.map((t) => (
                <option key={t.id} value={t.id}>
                  {maskRekening(t.nomorRekening)} · {formatRupiah(t.saldo)}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Konten */}
      {rekeningList.length === 0 ? (
        <EmptyState />
      ) : loading ? (
        <LoadingState />
      ) : error ? (
        <ErrorState message={error} onRetry={() => selectedId && load(selectedId)} />
      ) : estimasi ? (
        <EstimasiView estimasi={estimasi} nomorRekening={rekening?.nomorRekening ?? ""} />
      ) : null}
    </div>
  );
}

/* -------------------------------- states -------------------------------- */

function LoadingState() {
  return (
    <div className="flex items-center justify-center gap-sm text-on-surface-variant py-xxl">
      <span className="material-symbols-outlined animate-spin">progress_activity</span>
      <span className="font-body-md text-body-md">Memuat estimasi...</span>
    </div>
  );
}

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center gap-md text-center py-xxl">
      <span className="material-symbols-outlined text-error text-5xl">error</span>
      <p className="font-body-md text-body-md text-on-surface-variant max-w-[28rem]">{message}</p>
      <button
        onClick={onRetry}
        className="h-[44px] px-lg bg-primary text-on-primary font-label-md text-label-md rounded-lg hover:opacity-90"
      >
        Coba Lagi
      </button>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="bg-surface-container-lowest rounded-xl p-xl soft-shadow border border-surface-container-highest flex flex-col items-center text-center gap-md max-w-[32rem] mx-auto mt-lg">
      <div className="w-16 h-16 rounded-full bg-primary-container/10 text-primary-container flex items-center justify-center">
        <span className="material-symbols-outlined text-3xl" style={{ fontVariationSettings: "'FILL' 1" }}>
          mosque
        </span>
      </div>
      <div>
        <h3 className="font-headline-md text-headline-md text-on-surface mb-xs">
          Belum ada rekening Tabungan Haji
        </h3>
        <p className="font-body-md text-body-md text-on-surface-variant">
          Buka rekening Tabungan Haji terlebih dahulu untuk melihat estimasi keberangkatan Anda.
        </p>
      </div>
      <Link
        href="/dashboard"
        className="h-[44px] px-lg bg-primary-container text-on-primary font-label-md text-label-md rounded-lg hover:bg-primary transition-colors flex items-center gap-sm"
      >
        <span className="material-symbols-outlined">arrow_back</span>
        Kembali ke Dashboard
      </Link>
    </div>
  );
}

/* ------------------------------ main view ------------------------------ */

function EstimasiView({
  estimasi,
  nomorRekening,
}: {
  estimasi: EstimasiHaji;
  nomorRekening: string;
}) {
  // Normalisasi nilai untuk ditampilkan. Percabangan inline pada `status`
  // membuat TypeScript mempersempit tipe union dengan benar.
  const v =
    estimasi.status === "DAPAT_PORSI"
      ? {
          dapatPorsi: true,
          tahun: String(estimasi.estimasiTahunBerangkat),
          primaryIcon: "confirmation_number",
          primaryLabel: "Nomor Porsi",
          primaryValue: formatAngka(estimasi.nomorPorsi),
          kuota: formatAngka(estimasi.kuotaPerTahun),
          masaTunggu: estimasi.masaTungguTahun,
          kekurangan: null as string | null,
          batasLabel: "Terpenuhi",
          pct: 100,
        }
      : {
          dapatPorsi: false,
          tahun: "—",
          primaryIcon: "trending_down",
          primaryLabel: "Kekurangan Saldo",
          primaryValue: formatRupiah(estimasi.kekurangan),
          kuota: null,
          masaTunggu: null,
          kekurangan: estimasi.kekurangan,
          batasLabel: formatRupiah(estimasi.batasPorsi),
          pct: pctMenujuPorsi(estimasi.saldo, estimasi.batasPorsi),
        };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-gutter">
      {/* Kolom kiri: status & info utama */}
      <div className="lg:col-span-2 flex flex-col gap-gutter">
        {/* Hero status card */}
        <div
          className={`bg-surface-container-lowest rounded-xl p-lg relative overflow-hidden soft-shadow border-l-4 ${
            v.dapatPorsi ? "border-primary-container" : "border-secondary-fixed-dim"
          }`}
        >
          <div
            className={`absolute top-0 right-0 w-32 h-32 opacity-5 rounded-bl-full -mr-8 -mt-8 ${
              v.dapatPorsi ? "bg-primary-container" : "bg-secondary-fixed-dim"
            }`}
          />
          <div className="flex items-start justify-between mb-lg relative z-10">
            <div>
              <p className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider mb-xs">
                Status Haji Anda
              </p>
              {v.dapatPorsi ? (
                <span className="bg-primary/10 text-primary-container font-label-md text-label-md px-sm py-xs rounded-full inline-flex items-center gap-xs">
                  <span className="material-symbols-outlined text-[16px]">check_circle</span>
                  DAPAT PORSI
                </span>
              ) : (
                <span className="bg-secondary-container/30 text-on-secondary-fixed-variant font-label-md text-label-md px-sm py-xs rounded-full inline-flex items-center gap-xs">
                  <span className="material-symbols-outlined text-[16px]">hourglass_top</span>
                  BELUM PORSI
                </span>
              )}
              {nomorRekening && (
                <p className="font-body-sm text-body-sm text-on-surface-variant mt-sm">
                  Rekening {maskRekening(nomorRekening)}
                </p>
              )}
            </div>
            <div className="text-right">
              <p className="font-label-sm text-label-sm text-on-surface-variant mb-xs">
                Estimasi Berangkat
              </p>
              <p className="font-headline-xl text-headline-xl text-primary font-bold">{v.tahun}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-md relative z-10">
            <div className="bg-surface-container-low p-md rounded-lg">
              <div className="flex items-center gap-sm mb-xs text-on-surface-variant">
                <span className="material-symbols-outlined text-[20px]">{v.primaryIcon}</span>
                <p className="font-label-md text-label-md">{v.primaryLabel}</p>
              </div>
              <p className="font-headline-md text-headline-md text-on-surface font-semibold tracking-wide">
                {v.primaryValue}
              </p>
            </div>
            <div className="bg-surface-container-low p-md rounded-lg">
              <div className="flex items-center gap-sm mb-xs text-on-surface-variant">
                <span className="material-symbols-outlined text-[20px]">account_balance_wallet</span>
                <p className="font-label-md text-label-md">Saldo Saat Ini</p>
              </div>
              <p className="font-headline-md text-headline-md text-on-surface font-semibold">
                {formatRupiah(estimasi.saldo)}
              </p>
            </div>
          </div>
        </div>

        {/* Statistik bento (saat sudah dapat porsi) / dorongan (saat belum) */}
        {v.dapatPorsi ? (
          <div className="grid grid-cols-2 gap-md">
            <div className="bg-surface-container-lowest p-md rounded-xl soft-shadow flex flex-col justify-between border border-surface-container-highest">
              <div className="w-10 h-10 rounded-full bg-secondary-container/20 text-secondary-container flex items-center justify-center mb-sm">
                <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>
                  groups
                </span>
              </div>
              <div>
                <p className="font-label-sm text-label-sm text-on-surface-variant mb-xs">
                  Kuota Nasional / Tahun
                </p>
                <p className="font-headline-md text-headline-md text-on-surface">
                  {v.kuota}{" "}
                  <span className="font-body-sm text-body-sm text-on-surface-variant font-normal">
                    jemaah
                  </span>
                </p>
              </div>
            </div>
            <div className="bg-surface-container-lowest p-md rounded-xl soft-shadow flex flex-col justify-between border border-surface-container-highest">
              <div className="w-10 h-10 rounded-full bg-primary-container/10 text-primary-container flex items-center justify-center mb-sm">
                <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>
                  hourglass_empty
                </span>
              </div>
              <div>
                <p className="font-label-sm text-label-sm text-on-surface-variant mb-xs">
                  Estimasi Masa Tunggu
                </p>
                <p className="font-headline-md text-headline-md text-on-surface">
                  ± {v.masaTunggu}{" "}
                  <span className="font-body-sm text-body-sm text-on-surface-variant font-normal">
                    tahun
                  </span>
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-surface-container-lowest p-lg rounded-xl soft-shadow border border-surface-container-highest flex items-start gap-md">
            <div className="w-10 h-10 shrink-0 rounded-full bg-secondary-container/20 text-secondary-container flex items-center justify-center">
              <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>
                savings
              </span>
            </div>
            <div>
              <p className="font-label-md text-label-md text-on-surface mb-xs">Tinggal sedikit lagi!</p>
              <p className="font-body-sm text-body-sm text-on-surface-variant">
                Tambah saldo sebesar <strong className="text-on-surface">{v.kekurangan}</strong> untuk
                mencapai batas minimal porsi dan memperoleh nomor antrean keberangkatan.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Kolom kanan: konteks finansial & info */}
      <div className="flex flex-col gap-gutter">
        <div className="bg-surface-container-lowest p-lg rounded-xl soft-shadow border border-surface-container-highest">
          <h3 className="font-headline-md text-headline-md text-on-surface mb-md">Status Finansial</h3>
          <div className="mb-md">
            <div className="flex justify-between items-end mb-xs">
              <p className="font-body-sm text-body-sm text-on-surface-variant">Batas Minimal Porsi</p>
              <p className="font-label-md text-label-md text-on-surface">{v.batasLabel}</p>
            </div>
            <div className="w-full bg-surface-container h-2 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full ${v.dapatPorsi ? "bg-primary-container" : "bg-secondary-container"}`}
                style={{ width: `${v.pct}%` }}
              />
            </div>
            {v.dapatPorsi ? (
              <p className="font-label-sm text-label-sm text-primary-container mt-sm flex items-center gap-xs">
                <span className="material-symbols-outlined text-[14px]">check_circle</span>
                Saldo mencukupi batas minimal
              </p>
            ) : (
              <p className="font-label-sm text-label-sm text-on-surface-variant mt-sm">
                {v.pct}% menuju batas minimal porsi
              </p>
            )}
          </div>
          <div className="pt-md border-t border-surface-container-high">
            <p className="font-body-sm text-body-sm text-on-surface-variant mb-sm">Saran Tindakan</p>
            <Link
              href="/transaksi/setor"
              className="w-full bg-primary-container text-on-primary py-sm px-md rounded-lg font-label-md text-label-md hover:bg-primary transition-colors flex justify-center items-center gap-sm"
            >
              <span className="material-symbols-outlined">add_circle</span>
              Tambah Saldo Tabungan
            </Link>
          </div>
        </div>

        {/* Info edukasi */}
        <div className="bg-inverse-on-surface p-md rounded-xl border border-surface-container-high">
          <div className="flex items-start gap-sm">
            <span className="material-symbols-outlined text-secondary-fixed-dim">info</span>
            <div>
              <h4 className="font-label-md text-label-md text-on-surface mb-xs">
                Informasi Status &quot;BELUM PORSI&quot;
              </h4>
              <p className="font-body-sm text-body-sm text-on-surface-variant">
                Jika status Anda <strong>BELUM PORSI</strong> (indikator kuning), artinya saldo
                tabungan haji Anda belum mencapai batas minimal untuk pendaftaran porsi ke Kementerian
                Agama. Silakan tambah saldo Anda untuk mendapatkan nomor porsi dan estimasi
                keberangkatan.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Persentase progress saldo menuju batas minimal porsi (0–100). */
function pctMenujuPorsi(saldo: string, batasPorsi: string): number {
  const s = Number(saldo);
  const b = Number(batasPorsi);
  return b > 0 ? Math.min(100, Math.round((s / b) * 100)) : 0;
}
