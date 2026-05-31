"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "@/lib/session";
import {
  setor,
  setorQris,
  UnauthorizedError,
  type Metode,
  type Tabungan,
  type Transaksi,
} from "@/lib/api";
import { formatRupiah, maskRekening, parseRupiah } from "@/lib/format";

/* Metode pembayaran sesuai referensi/setorTunai.html. */
const METODE: { value: Metode; label: string; icon: string }[] = [
  { value: "TUNAI", label: "Tunai", icon: "payments" },
  { value: "TRANSFER", label: "Transfer", icon: "sync_alt" },
  { value: "VIRTUAL_ACCOUNT", label: "Virtual Account", icon: "account_balance" },
  { value: "QRIS", label: "QRIS", icon: "qr_code_scanner" },
];

const QUICK = [
  { label: "+100 Rb", amount: 100_000 },
  { label: "+500 Rb", amount: 500_000 },
  { label: "+1 Jt", amount: 1_000_000 },
];

const QRIS_MIN = 100_000;

export default function SetorPage() {
  return (
    <Suspense fallback={null}>
      <SetorForm />
    </Suspense>
  );
}

function SetorForm() {
  const router = useRouter();
  const params = useSearchParams();
  const { me, refresh } = useSession();

  const rekeningAktif = useMemo<Tabungan[]>(
    () => (me ? me.tabungan.filter((t) => t.status === "AKTIF") : []),
    [me],
  );

  const [rekeningId, setRekeningId] = useState("");
  const [nominalRaw, setNominalRaw] = useState("");
  const [metode, setMetode] = useState<Metode>("TUNAI");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sukses, setSukses] = useState<Transaksi | null>(null);

  // Pilih rekening awal: dari query ?rekening= bila valid, jika tidak rekening pertama.
  useEffect(() => {
    if (rekeningId || rekeningAktif.length === 0) return;
    const fromQuery = params.get("rekening");
    const match = fromQuery && rekeningAktif.find((t) => t.id === fromQuery);
    setRekeningId(match ? match.id : rekeningAktif[0].id);
  }, [params, rekeningAktif, rekeningId]);

  if (!me) return null;

  const rekening = rekeningAktif.find((t) => t.id === rekeningId) ?? null;
  const nominal = parseRupiah(nominalRaw);
  const qrisKurang = metode === "QRIS" && nominal !== null && nominal < QRIS_MIN;
  const bisaKirim = !!rekening && nominal !== null && !qrisKurang && !submitting;

  function tambah(amount: number) {
    const current = parseRupiah(nominalRaw) ?? 0;
    setNominalRaw((current + amount).toLocaleString("id-ID"));
  }

  function onNominalChange(value: string) {
    const digits = value.replace(/\D/g, "");
    setNominalRaw(digits ? Number(digits).toLocaleString("id-ID") : "");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!rekening || nominal === null || submitting) return;
    setError(null);
    setSubmitting(true);
    try {
      let trx: Transaksi;
      if (metode === "QRIS") {
        const res = await setorQris(rekening.id, nominal, "SUCCESS");
        trx = res.data;
      } else {
        trx = await setor(rekening.id, nominal, metode);
      }
      setSukses(trx);
      await refresh();
    } catch (err) {
      if (err instanceof UnauthorizedError) {
        router.replace("/login");
        return;
      }
      setError(err instanceof Error ? err.message : "Setoran gagal. Silakan coba lagi.");
    } finally {
      setSubmitting(false);
    }
  }

  if (rekeningAktif.length === 0) {
    return (
      <EmptyRekening
        judul="Belum ada rekening aktif"
        pesan="Buka rekening Tabungan Haji aktif terlebih dahulu untuk melakukan setoran."
      />
    );
  }

  if (sukses) {
    return (
      <SuksesView
        judul="Setoran Berhasil"
        trx={sukses}
        rekening={rekening}
        onUlang={() => {
          setSukses(null);
          setNominalRaw("");
        }}
      />
    );
  }

  return (
    <div className="max-w-[520px] mx-auto">
      <Card title="Setoran" onClose={() => router.push("/rekening")}>
        <form onSubmit={handleSubmit} className="flex flex-col gap-xl">
          {/* Rekening tujuan */}
          <Field label="Rekening Tujuan">
            {rekeningAktif.length > 1 ? (
              <select
                value={rekeningId}
                onChange={(e) => setRekeningId(e.target.value)}
                className="w-full p-md bg-surface-container-low border border-outline-variant rounded-lg font-label-md text-label-md text-on-surface focus:border-primary-container focus:ring-1 focus:ring-primary-container outline-none"
              >
                {rekeningAktif.map((t) => (
                  <option key={t.id} value={t.id}>
                    {maskRekening(t.nomorRekening)} · {formatRupiah(t.saldo)}
                  </option>
                ))}
              </select>
            ) : (
              <RekeningChip nama={me.nama} nomor={rekening?.nomorRekening ?? ""} />
            )}
          </Field>

          {/* Nominal */}
          <Field label="Nominal Setoran" htmlFor="nominal">
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
          </Field>

          {/* Metode pembayaran */}
          <Field label="Metode Pembayaran">
            <div className="grid grid-cols-2 gap-md">
              {METODE.map((m) => {
                const active = metode === m.value;
                return (
                  <button
                    key={m.value}
                    type="button"
                    onClick={() => setMetode(m.value)}
                    className={`flex flex-col items-center justify-center p-md border rounded-lg gap-sm h-full transition-colors ${
                      active
                        ? "border-primary-container bg-primary/5"
                        : "border-outline-variant hover:border-outline"
                    }`}
                  >
                    <span
                      className={`material-symbols-outlined text-[32px] transition-colors ${
                        active ? "text-primary-container" : "text-on-surface-variant"
                      }`}
                      style={active ? { fontVariationSettings: "'FILL' 1" } : undefined}
                    >
                      {m.icon}
                    </span>
                    <span className="font-label-md text-label-md text-on-surface text-center">
                      {m.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </Field>

          {/* Catatan QRIS */}
          {metode === "QRIS" && (
            <div className="flex items-start gap-sm p-md bg-secondary-container/10 border border-secondary-container/20 rounded-lg">
              <span
                className="material-symbols-outlined text-secondary"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                info
              </span>
              <p className="font-body-sm text-body-sm text-on-surface-variant pt-[2px]">
                Setoran QRIS minimal Rp 100.000. Pastikan aplikasi pembayaran Anda mendukung fitur
                QRIS antar bank.
              </p>
            </div>
          )}

          {qrisKurang && (
            <p className="flex items-center gap-xs text-error font-body-sm text-body-sm -mt-md">
              <span className="material-symbols-outlined text-[18px]">error</span>
              Nominal QRIS minimal Rp 100.000.
            </p>
          )}

          {error && (
            <p className="flex items-center gap-xs text-error font-body-sm text-body-sm">
              <span className="material-symbols-outlined text-[18px]">error</span>
              {error}
            </p>
          )}

          {/* Aksi */}
          <div className="flex items-center justify-end gap-md pt-sm border-t border-surface-variant">
            <Link
              href="/rekening"
              className="font-label-md text-label-md text-primary-container px-lg py-sm rounded-full hover:bg-primary/5 transition-colors"
            >
              Batal
            </Link>
            <button
              type="submit"
              disabled={!bisaKirim}
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
                  Konfirmasi Setoran
                  <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                </>
              )}
            </button>
          </div>
        </form>
      </Card>
    </div>
  );
}

/* ------------------------------ shared bits ------------------------------ */

function Card({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-surface rounded-xl shadow-[0_8px_24px_rgba(27,28,28,0.10)] border border-surface-variant flex flex-col">
      <div className="flex items-center justify-between px-lg py-md border-b border-surface-variant">
        <h2 className="font-headline-md text-headline-md text-on-surface">{title}</h2>
        <button
          type="button"
          onClick={onClose}
          aria-label="Tutup"
          className="p-xs rounded-full hover:bg-surface-container-high transition-colors text-on-surface-variant"
        >
          <span className="material-symbols-outlined">close</span>
        </button>
      </div>
      <div className="p-lg">{children}</div>
    </div>
  );
}

function Field({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-sm">
      <label htmlFor={htmlFor} className="font-label-md text-label-md text-on-surface-variant">
        {label}
      </label>
      {children}
    </div>
  );
}

function RekeningChip({ nama, nomor }: { nama: string; nomor: string }) {
  return (
    <div className="flex items-center gap-md p-md bg-surface-container-low border border-outline-variant rounded-lg relative overflow-hidden">
      <div className="absolute left-0 top-0 bottom-0 w-[4px] bg-primary-container" />
      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary-container shrink-0">
        <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>
          account_balance_wallet
        </span>
      </div>
      <div className="flex flex-col flex-1 min-w-0">
        <span className="font-label-md text-label-md text-on-surface truncate">
          Tabungan Haji — {nama}
        </span>
        <span className="font-body-sm text-body-sm text-on-surface-variant mt-xs">
          {maskRekening(nomor)}
        </span>
      </div>
      <span className="material-symbols-outlined text-primary-container">check_circle</span>
    </div>
  );
}

function EmptyRekening({ judul, pesan }: { judul: string; pesan: string }) {
  return (
    <div className="bg-surface-container-lowest rounded-xl p-xl border border-surface-container-highest flex flex-col items-center text-center gap-md max-w-[32rem] mx-auto mt-lg">
      <div className="w-16 h-16 rounded-full bg-primary-container/10 text-primary-container flex items-center justify-center">
        <span className="material-symbols-outlined text-3xl">account_balance_wallet</span>
      </div>
      <div>
        <h3 className="font-headline-md text-headline-md text-on-surface mb-xs">{judul}</h3>
        <p className="font-body-md text-body-md text-on-surface-variant">{pesan}</p>
      </div>
      <Link
        href="/rekening/baru"
        className="h-[44px] px-lg bg-primary-container text-on-primary font-label-md text-label-md rounded-lg hover:bg-primary transition-colors flex items-center gap-sm"
      >
        <span className="material-symbols-outlined">add</span>
        Buka Rekening
      </Link>
    </div>
  );
}

function SuksesView({
  judul,
  trx,
  rekening,
  onUlang,
}: {
  judul: string;
  trx: Transaksi;
  rekening: Tabungan | null;
  onUlang: () => void;
}) {
  return (
    <div className="max-w-[480px] mx-auto bg-surface rounded-xl shadow-sm border border-surface-variant p-xl flex flex-col items-center text-center gap-md">
      <div className="w-16 h-16 rounded-full bg-primary-container/10 text-primary-container flex items-center justify-center">
        <span className="material-symbols-outlined text-4xl" style={{ fontVariationSettings: "'FILL' 1" }}>
          check_circle
        </span>
      </div>
      <h2 className="font-headline-md text-headline-md text-on-surface">{judul}</h2>
      <p className="font-headline-lg text-headline-lg text-primary">{formatRupiah(trx.nominal)}</p>
      <div className="w-full bg-surface-container-low rounded-lg p-md flex flex-col gap-sm text-left">
        <Baris label="Saldo Akhir" value={formatRupiah(trx.saldoSesudah)} />
        <Baris label="Metode" value={trx.metode ?? "-"} />
        <Baris label="Referensi" value={trx.referensi} mono />
      </div>
      <div className="flex gap-md w-full pt-sm">
        <button
          type="button"
          onClick={onUlang}
          className="flex-1 h-[44px] border border-outline-variant text-on-surface font-label-md text-label-md rounded-lg hover:bg-surface-container transition-colors"
        >
          Setor Lagi
        </button>
        <Link
          href={rekening ? `/rekening/${rekening.id}/mutasi` : "/rekening"}
          className="flex-1 h-[44px] bg-primary-container text-on-primary font-label-md text-label-md rounded-lg hover:bg-primary transition-colors flex items-center justify-center"
        >
          Lihat Mutasi
        </Link>
      </div>
    </div>
  );
}

function Baris({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-md">
      <span className="font-body-sm text-body-sm text-on-surface-variant">{label}</span>
      <span
        className={`font-label-md text-label-md text-on-surface text-right ${mono ? "tabular-nums" : ""}`}
      >
        {value}
      </span>
    </div>
  );
}
