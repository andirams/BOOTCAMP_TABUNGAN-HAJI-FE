"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "@/lib/session";
import {
  tarik,
  UnauthorizedError,
  type Metode,
  type Tabungan,
  type Transaksi,
} from "@/lib/api";
import { formatRupiah, maskRekening, parseRupiah } from "@/lib/format";

/* Metode penarikan sesuai referensi/tarikTunai.html → dipetakan ke metode backend. */
const METODE: { value: Metode; label: string; icon: string }[] = [
  { value: "TUNAI", label: "Tarik Tunai ATM", icon: "atm" },
  { value: "TRANSFER", label: "Transfer Cabang", icon: "account_balance" },
];

export default function TarikPage() {
  return (
    <Suspense fallback={null}>
      <TarikForm />
    </Suspense>
  );
}

function TarikForm() {
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

  useEffect(() => {
    if (rekeningId || rekeningAktif.length === 0) return;
    const fromQuery = params.get("rekening");
    const match = fromQuery && rekeningAktif.find((t) => t.id === fromQuery);
    setRekeningId(match ? match.id : rekeningAktif[0].id);
  }, [params, rekeningAktif, rekeningId]);

  if (!me) return null;

  const rekening = rekeningAktif.find((t) => t.id === rekeningId) ?? null;
  const saldo = rekening ? BigInt(rekening.saldo) : BigInt(0);
  const nominal = parseRupiah(nominalRaw);
  const melebihiSaldo = nominal !== null && rekening !== null && BigInt(nominal) > saldo;
  const bisaKirim = !!rekening && nominal !== null && !melebihiSaldo && !submitting;

  function onNominalChange(value: string) {
    const digits = value.replace(/\D/g, "");
    setNominalRaw(digits ? Number(digits).toLocaleString("id-ID") : "");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!rekening || nominal === null || melebihiSaldo || submitting) return;
    setError(null);
    setSubmitting(true);
    try {
      const trx = await tarik(rekening.id, nominal, metode);
      setSukses(trx);
      await refresh();
    } catch (err) {
      if (err instanceof UnauthorizedError) {
        router.replace("/login");
        return;
      }
      setError(err instanceof Error ? err.message : "Penarikan gagal. Silakan coba lagi.");
    } finally {
      setSubmitting(false);
    }
  }

  if (rekeningAktif.length === 0) {
    return (
      <div className="bg-surface-container-lowest rounded-xl p-xl border border-surface-container-highest flex flex-col items-center text-center gap-md max-w-[32rem] mx-auto mt-lg">
        <div className="w-16 h-16 rounded-full bg-primary-container/10 text-primary-container flex items-center justify-center">
          <span className="material-symbols-outlined text-3xl">account_balance_wallet</span>
        </div>
        <h3 className="font-headline-md text-headline-md text-on-surface">Belum ada rekening aktif</h3>
        <p className="font-body-md text-body-md text-on-surface-variant">
          Tidak ada rekening aktif untuk melakukan penarikan.
        </p>
        <Link
          href="/rekening"
          className="h-[44px] px-lg bg-primary-container text-on-primary font-label-md text-label-md rounded-lg hover:bg-primary transition-colors flex items-center gap-sm"
        >
          Ke Daftar Rekening
        </Link>
      </div>
    );
  }

  if (sukses) {
    return (
      <div className="max-w-[480px] mx-auto bg-surface rounded-xl shadow-sm border border-surface-variant p-xl flex flex-col items-center text-center gap-md">
        <div className="w-16 h-16 rounded-full bg-primary-container/10 text-primary-container flex items-center justify-center">
          <span
            className="material-symbols-outlined text-4xl"
            style={{ fontVariationSettings: "'FILL' 1" }}
          >
            check_circle
          </span>
        </div>
        <h2 className="font-headline-md text-headline-md text-on-surface">Penarikan Berhasil</h2>
        <p className="font-headline-lg text-headline-lg text-primary">
          {formatRupiah(sukses.nominal)}
        </p>
        <div className="w-full bg-surface-container-low rounded-lg p-md flex flex-col gap-sm text-left">
          <div className="flex justify-between gap-md">
            <span className="font-body-sm text-body-sm text-on-surface-variant">Saldo Akhir</span>
            <span className="font-label-md text-label-md text-on-surface">
              {formatRupiah(sukses.saldoSesudah)}
            </span>
          </div>
          <div className="flex justify-between gap-md">
            <span className="font-body-sm text-body-sm text-on-surface-variant">Metode</span>
            <span className="font-label-md text-label-md text-on-surface">{sukses.metode ?? "-"}</span>
          </div>
          <div className="flex justify-between gap-md">
            <span className="font-body-sm text-body-sm text-on-surface-variant">Referensi</span>
            <span className="font-label-md text-label-md text-on-surface tabular-nums">
              {sukses.referensi}
            </span>
          </div>
        </div>
        <div className="flex gap-md w-full pt-sm">
          <button
            type="button"
            onClick={() => {
              setSukses(null);
              setNominalRaw("");
            }}
            className="flex-1 h-[44px] border border-outline-variant text-on-surface font-label-md text-label-md rounded-lg hover:bg-surface-container transition-colors"
          >
            Tarik Lagi
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

  return (
    <div className="max-w-[480px] mx-auto">
      <div className="bg-surface rounded-xl shadow-[0_8px_24px_rgba(27,28,28,0.10)] border border-surface-variant flex flex-col overflow-hidden">
        <div className="flex justify-between items-center p-md border-b border-surface-variant">
          <h2 className="font-headline-md text-headline-md text-on-surface">Penarikan</h2>
          <button
            type="button"
            onClick={() => router.push("/rekening")}
            aria-label="Tutup"
            className="text-on-surface-variant hover:text-error transition-colors rounded-full p-1 hover:bg-surface-container-high"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-lg flex flex-col gap-xl">
          {/* Sumber rekening */}
          <div className="flex flex-col gap-xs">
            <label className="font-label-md text-label-md text-on-surface-variant">
              Sumber Rekening
            </label>
            {rekeningAktif.length > 1 ? (
              <select
                value={rekeningId}
                onChange={(e) => setRekeningId(e.target.value)}
                className="w-full p-sm rounded-lg border border-outline-variant bg-surface-container-lowest font-label-md text-label-md text-on-surface focus:border-primary focus:ring-1 focus:ring-primary outline-none"
              >
                {rekeningAktif.map((t) => (
                  <option key={t.id} value={t.id}>
                    {maskRekening(t.nomorRekening)} · {formatRupiah(t.saldo)}
                  </option>
                ))}
              </select>
            ) : (
              <div className="flex items-center gap-sm w-full p-sm rounded-lg border border-outline-variant bg-surface-container-lowest">
                <div className="w-10 h-10 rounded-full bg-primary-container/10 flex items-center justify-center text-primary">
                  <span className="material-symbols-outlined">account_balance_wallet</span>
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="font-label-md text-label-md text-on-surface">Tabungan Haji</span>
                  <span className="font-body-sm text-body-sm text-on-surface-variant">
                    {maskRekening(rekening?.nomorRekening ?? "")}
                  </span>
                </div>
              </div>
            )}
            <div className="flex justify-between mt-1 px-1">
              <span className="font-body-sm text-body-sm text-on-surface-variant">
                Saldo Tersedia:
              </span>
              <span className="font-label-md text-label-md text-on-surface">
                {rekening ? formatRupiah(rekening.saldo) : "-"}
              </span>
            </div>
          </div>

          {/* Nominal */}
          <div className="flex flex-col gap-xs">
            <label htmlFor="nominal" className="font-label-md text-label-md text-on-surface-variant">
              Nominal Penarikan
            </label>
            <div className="relative flex items-center">
              <span className="absolute left-sm font-headline-md text-headline-md text-on-surface-variant pl-xs">
                Rp
              </span>
              <input
                id="nominal"
                inputMode="numeric"
                placeholder="0"
                value={nominalRaw}
                onChange={(e) => onNominalChange(e.target.value)}
                className={`w-full font-headline-md text-headline-md text-on-surface bg-surface border rounded-lg pl-12 pr-md py-sm outline-none transition-shadow focus:ring-1 ${
                  melebihiSaldo
                    ? "border-error focus:ring-error"
                    : "border-outline focus:border-primary focus:ring-primary"
                }`}
              />
            </div>
            {melebihiSaldo && (
              <div className="flex items-start gap-1 mt-1 text-error">
                <span className="material-symbols-outlined text-[18px]">error</span>
                <span className="font-body-sm text-body-sm">Saldo harus mencukupi</span>
              </div>
            )}
          </div>

          {/* Metode */}
          <div className="flex flex-col gap-sm">
            <label className="font-label-md text-label-md text-on-surface-variant">
              Metode Penarikan
            </label>
            <div className="grid grid-cols-2 gap-md">
              {METODE.map((m) => {
                const active = metode === m.value;
                return (
                  <button
                    key={m.value}
                    type="button"
                    onClick={() => setMetode(m.value)}
                    className={`relative p-md border rounded-lg flex flex-col items-center justify-center gap-sm h-full text-center transition-all ${
                      active
                        ? "border-primary bg-primary/5"
                        : "border-outline-variant hover:border-outline bg-surface-container-lowest"
                    }`}
                  >
                    {active && (
                      <span
                        className="material-symbols-outlined text-[18px] text-primary absolute top-2 right-2"
                        style={{ fontVariationSettings: "'FILL' 1" }}
                      >
                        check_circle
                      </span>
                    )}
                    <span
                      className={`material-symbols-outlined ${
                        active ? "text-primary" : "text-on-surface-variant"
                      }`}
                    >
                      {m.icon}
                    </span>
                    <span
                      className={`font-label-md text-label-md ${
                        active ? "text-on-surface" : "text-on-surface-variant"
                      }`}
                    >
                      {m.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {error && (
            <p className="flex items-center gap-xs text-error font-body-sm text-body-sm">
              <span className="material-symbols-outlined text-[18px]">error</span>
              {error}
            </p>
          )}

          {/* Footer */}
          <div className="flex justify-end gap-md items-center pt-md border-t border-surface-variant -mx-lg px-lg -mb-lg pb-lg bg-surface-container-low">
            <Link
              href="/rekening"
              className="font-label-md text-label-md text-primary hover:text-primary-container px-md py-sm rounded-lg transition-colors"
            >
              Batal
            </Link>
            <button
              type="submit"
              disabled={!bisaKirim}
              className="font-label-md text-label-md bg-primary text-on-primary px-lg py-sm rounded-lg transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-primary-container"
            >
              {submitting ? (
                <>
                  <span className="material-symbols-outlined text-[18px] animate-spin">
                    progress_activity
                  </span>
                  Memproses...
                </>
              ) : (
                "Tarik Dana"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
