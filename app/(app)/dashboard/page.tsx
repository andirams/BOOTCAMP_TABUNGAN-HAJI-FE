"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "@/lib/session";
import {
  getEstimasiHaji,
  getTransaksiByTabungan,
  type EstimasiHaji,
  type Transaksi,
  type Tabungan,
} from "@/lib/api";
import { formatRupiah, formatAngka, formatTanggal, maskRekening } from "@/lib/format";

/* ----------------------------- helpers ----------------------------- */

function totalSaldo(tabungan: Tabungan[]): bigint {
  return tabungan.reduce((acc, t) => acc + BigInt(t.saldo || "0"), BigInt(0));
}

/** Rekening dengan saldo terbesar → paling relevan untuk estimasi porsi. */
function rekeningUtama(tabungan: Tabungan[]): Tabungan | null {
  if (tabungan.length === 0) return null;
  return [...tabungan].sort((a, b) => (BigInt(b.saldo) > BigInt(a.saldo) ? 1 : -1))[0];
}

/* ----------------------------- page ----------------------------- */

export default function DashboardPage() {
  const { me } = useSession();
  const [estimasi, setEstimasi] = useState<EstimasiHaji | null>(null);
  const [riwayat, setRiwayat] = useState<Transaksi[]>([]);

  useEffect(() => {
    if (!me) return;
    let aktif = true;

    (async () => {
      const utama = rekeningUtama(me.tabungan);
      if (!utama) {
        if (aktif) {
          setEstimasi(null);
          setRiwayat([]);
        }
        return;
      }
      const [est, transaksiPerRekening] = await Promise.all([
        getEstimasiHaji(utama.id).catch(() => null),
        Promise.all(me.tabungan.map((t) => getTransaksiByTabungan(t.id).catch(() => []))),
      ]);
      if (!aktif) return;
      setEstimasi(est);
      setRiwayat(
        transaksiPerRekening
          .flat()
          .sort((a, b) => new Date(b.waktu).getTime() - new Date(a.waktu).getTime())
          .slice(0, 5),
      );
    })();

    return () => {
      aktif = false;
    };
  }, [me]);

  if (!me) return null;

  const namaDepan = me.nama.split(/\s+/)[0];
  const saldo = totalSaldo(me.tabungan);
  const jumlahAktif = me.tabungan.filter((t) => t.status === "AKTIF").length;

  return (
    <div className="grid grid-cols-1 md:grid-cols-12 gap-gutter">
      {/* Welcome & Total Saldo */}
      <div className="md:col-span-8 flex flex-col gap-gutter">
        <div>
          <h2 className="font-headline-lg text-headline-lg text-on-surface mb-xs">
            Assalamu&apos;alaikum, {namaDepan}
          </h2>
          <p className="font-body-lg text-body-lg text-on-surface-variant">
            Semoga harimu dipenuhi keberkahan.
          </p>
        </div>

        <div className="bg-primary text-on-primary rounded-xl p-lg shadow-md relative overflow-hidden flex flex-col justify-between min-h-[200px]">
          <div className="absolute -right-10 -top-10 opacity-10 pointer-events-none">
            <span
              className="material-symbols-outlined text-[200px]"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              account_balance
            </span>
          </div>
          <div className="z-10">
            <p className="font-label-md text-label-md text-primary-fixed mb-sm opacity-90">
              Total Saldo Efektif
            </p>
            <h3 className="font-headline-xl text-headline-xl mb-xs tracking-tight">
              {formatRupiah(saldo)}
            </h3>
            <p className="font-body-sm text-body-sm text-outline-variant">
              Tersedia dalam {jumlahAktif} rekening aktif.
            </p>
          </div>
          <div className="z-10 flex gap-sm mt-lg">
            <Link
              href="/transaksi/setor"
              className="bg-secondary-container text-on-secondary-container font-label-md text-label-md px-md py-sm rounded-lg hover:opacity-90 flex items-center gap-xs"
            >
              <span className="material-symbols-outlined text-[18px]">add</span>
              Setor
            </Link>
            <Link
              href="/transaksi/tarik"
              className="bg-surface/20 text-on-primary font-label-md text-label-md px-md py-sm rounded-lg hover:bg-surface/30 flex items-center gap-xs"
            >
              <span className="material-symbols-outlined text-[18px]">sync_alt</span>
              Tarik
            </Link>
          </div>
        </div>

        {/* Daftar Rekening */}
        <div className="bg-surface-container-lowest rounded-xl shadow-sm border border-outline-variant p-md relative overflow-hidden">
          <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary-container" />
          <div className="flex justify-between items-center mb-md ml-sm">
            <h3 className="font-headline-md text-headline-md text-on-surface">Daftar Rekening</h3>
            <Link href="/rekening" className="text-primary font-label-md text-label-md hover:underline">
              Lihat Semua
            </Link>
          </div>
          <div className="flex flex-col gap-sm ml-sm">
            {me.tabungan.length === 0 && (
              <p className="font-body-sm text-body-sm text-on-surface-variant py-md">
                Anda belum memiliki rekening Tabungan Haji.
              </p>
            )}
            {me.tabungan.map((t) => (
              <div
                key={t.id}
                className="flex flex-col sm:flex-row justify-between sm:items-center p-sm rounded-lg hover:bg-surface-container-low transition-colors border border-transparent hover:border-outline-variant"
              >
                <div className="flex items-center gap-md mb-sm sm:mb-0">
                  <div className="w-10 h-10 rounded-full bg-primary-container/10 flex items-center justify-center text-primary-container">
                    <span className="material-symbols-outlined">savings</span>
                  </div>
                  <div>
                    <p className="font-label-md text-label-md text-on-surface">
                      Tabungan Haji{" "}
                      {t.status !== "AKTIF" && (
                        <span className="ml-xs font-label-sm text-label-sm text-error">
                          ({t.status})
                        </span>
                      )}
                    </p>
                    <p className="font-body-sm text-body-sm text-on-surface-variant">
                      {maskRekening(t.nomorRekening)}
                    </p>
                  </div>
                </div>
                <div className="text-left sm:text-right flex-1 sm:flex-none flex items-center justify-between sm:block">
                  <p className="font-label-md text-label-md text-on-surface">
                    {formatRupiah(t.saldo)}
                  </p>
                  <div className="flex gap-xs sm:mt-xs sm:justify-end">
                    <Link
                      href={`/transaksi/setor?rekening=${t.id}`}
                      className="text-primary font-label-sm text-label-sm px-sm py-xs border border-outline-variant rounded hover:bg-surface-container"
                    >
                      Setor
                    </Link>
                    <Link
                      href={`/transaksi/tarik?rekening=${t.id}`}
                      className="text-on-surface-variant font-label-sm text-label-sm px-sm py-xs border border-outline-variant rounded hover:bg-surface-container"
                    >
                      Tarik
                    </Link>
                    <Link
                      href={`/rekening/${t.id}/mutasi`}
                      className="text-on-surface-variant font-label-sm text-label-sm px-sm py-xs border border-outline-variant rounded hover:bg-surface-container"
                    >
                      Mutasi
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Side Column */}
      <div className="md:col-span-4 flex flex-col gap-gutter">
        {/* Hajj Estimator Card */}
        <div className="bg-surface-container-lowest rounded-xl shadow-sm border border-outline-variant overflow-hidden">
          <div className="bg-secondary-fixed-dim px-md py-sm flex justify-between items-center">
            <div className="flex items-center gap-xs text-on-secondary-fixed-variant">
              <span
                className="material-symbols-outlined"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                mosque
              </span>
              <h3 className="font-label-md text-label-md">Estimasi Keberangkatan Haji</h3>
            </div>
            <Link
              href="/estimasi"
              className="font-label-sm text-label-sm text-on-secondary-fixed-variant hover:underline flex items-center gap-xs"
            >
              Lihat Detail
              <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
            </Link>
          </div>
          <div className="p-md">
            <EstimasiContent estimasi={estimasi} adaRekening={me.tabungan.length > 0} />
          </div>
        </div>

        {/* Riwayat Transaksi */}
        <div className="bg-surface-container-lowest rounded-xl shadow-sm border border-outline-variant p-md">
          <div className="flex justify-between items-center mb-md">
            <h3 className="font-label-md text-label-md text-on-surface font-bold">Riwayat Terakhir</h3>
          </div>
          <div className="flex flex-col gap-sm">
            {riwayat.length === 0 && (
              <p className="font-body-sm text-body-sm text-on-surface-variant">
                Belum ada transaksi.
              </p>
            )}
            {riwayat.map((trx) => {
              const setor = trx.jenis === "SETOR";
              return (
                <div
                  key={trx.id}
                  className="flex items-center justify-between pb-sm border-b border-surface-variant last:border-0 last:pb-0"
                >
                  <div className="flex items-center gap-sm">
                    <div className="w-8 h-8 rounded-full bg-surface-container-highest flex items-center justify-center text-on-surface">
                      <span className="material-symbols-outlined text-[16px]">
                        {setor ? "arrow_downward" : "arrow_upward"}
                      </span>
                    </div>
                    <div>
                      <p className="font-label-md text-label-md text-on-surface">
                        {setor ? "Setoran" : "Penarikan"}
                        {trx.metode ? ` · ${trx.metode}` : ""}
                      </p>
                      <p className="font-label-sm text-label-sm text-on-surface-variant">
                        {formatTanggal(trx.waktu)}
                      </p>
                    </div>
                  </div>
                  <p
                    className={`font-label-md text-label-md ${
                      setor ? "text-primary-container" : "text-on-surface"
                    }`}
                  >
                    {setor ? "+ " : "- "}
                    {formatRupiah(trx.nominal)}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ----------------------- estimasi sub-component ----------------------- */

function EstimasiContent({
  estimasi,
  adaRekening,
}: {
  estimasi: EstimasiHaji | null;
  adaRekening: boolean;
}) {
  if (!adaRekening || !estimasi) {
    return (
      <p className="font-body-sm text-body-sm text-on-surface-variant text-center py-md">
        {adaRekening
          ? "Estimasi belum tersedia."
          : "Buka rekening Tabungan Haji untuk melihat estimasi keberangkatan."}
      </p>
    );
  }

  if (estimasi.status === "DAPAT_PORSI") {
    return (
      <>
        <div className="flex justify-between items-start mb-sm">
          <div>
            <p className="font-body-sm text-body-sm text-on-surface-variant">Status</p>
            <span className="inline-block bg-primary-container/10 text-primary-container font-label-sm text-label-sm px-sm py-xs rounded mt-xs">
              DAPAT PORSI
            </span>
          </div>
          <div className="text-right">
            <p className="font-body-sm text-body-sm text-on-surface-variant">Nomor Porsi</p>
            <p className="font-label-md text-label-md text-on-surface">
              {formatAngka(estimasi.nomorPorsi)}
            </p>
          </div>
        </div>
        <div className="mt-lg pt-md border-t border-outline-variant text-center">
          <p className="font-body-sm text-body-sm text-on-surface-variant mb-xs">
            Estimasi Keberangkatan Tahun
          </p>
          <h4 className="font-headline-lg text-headline-lg text-primary">
            {estimasi.estimasiTahunBerangkat}
          </h4>
          <div className="w-full bg-surface-container h-2 rounded-full mt-sm overflow-hidden relative">
            <div className="bg-secondary-container h-full w-full rounded-full absolute left-0 top-0" />
          </div>
          <p className="font-label-sm text-label-sm text-on-surface-variant mt-xs">
            Masa tunggu ± {estimasi.masaTungguTahun} tahun
          </p>
        </div>
      </>
    );
  }

  // BELUM_PORSI
  const saldo = Number(estimasi.saldo);
  const batas = Number(estimasi.batasPorsi);
  const pct = batas > 0 ? Math.min(100, Math.round((saldo / batas) * 100)) : 0;

  return (
    <>
      <div className="flex justify-between items-start mb-sm">
        <div>
          <p className="font-body-sm text-body-sm text-on-surface-variant">Status</p>
          <span className="inline-block bg-secondary-container/30 text-on-secondary-fixed-variant font-label-sm text-label-sm px-sm py-xs rounded mt-xs">
            BELUM PORSI
          </span>
        </div>
        <div className="text-right">
          <p className="font-body-sm text-body-sm text-on-surface-variant">Kekurangan</p>
          <p className="font-label-md text-label-md text-on-surface">
            {formatRupiah(estimasi.kekurangan)}
          </p>
        </div>
      </div>
      <div className="mt-lg pt-md border-t border-outline-variant text-center">
        <p className="font-body-sm text-body-sm text-on-surface-variant mb-xs">Progress Menuju Porsi</p>
        <h4 className="font-headline-lg text-headline-lg text-primary">{pct}%</h4>
        <div className="w-full bg-surface-container h-2 rounded-full mt-sm overflow-hidden relative">
          <div
            className="bg-secondary-container h-full rounded-full absolute left-0 top-0"
            style={{ width: `${pct}%` }}
          />
        </div>
        <p className="font-label-sm text-label-sm text-on-surface-variant mt-xs">
          Capai {formatRupiah(estimasi.batasPorsi)} untuk mendapat nomor porsi
        </p>
      </div>
    </>
  );
}
