"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useSession } from "@/lib/session";
import type { Tabungan } from "@/lib/api";
import { formatRupiah, formatTanggal, maskRekening } from "@/lib/format";

function totalSaldo(list: Tabungan[]): bigint {
  return list.reduce((acc, t) => acc + BigInt(t.saldo || "0"), BigInt(0));
}

export default function RekeningPage() {
  const { me } = useSession();
  const rekening = useMemo<Tabungan[]>(
    () =>
      me
        ? [...me.tabungan].sort((a, b) => (BigInt(b.saldo) > BigInt(a.saldo) ? 1 : -1))
        : [],
    [me],
  );

  if (!me) return null;

  return (
    <div className="space-y-gutter pb-xxl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-md">
        <div>
          <h2 className="font-headline-lg text-headline-lg text-on-surface">Rekening Saya</h2>
          <p className="font-body-md text-body-md text-on-surface-variant mt-xs">
            {rekening.length} rekening · Total saldo{" "}
            <span className="text-primary font-semibold">{formatRupiah(totalSaldo(rekening))}</span>
          </p>
        </div>
        <Link
          href="/rekening/baru"
          className="h-[44px] px-lg bg-primary text-on-primary font-label-md text-label-md rounded-lg hover:bg-primary-container transition-colors flex items-center justify-center gap-sm"
        >
          <span className="material-symbols-outlined">add</span>
          Buka Rekening
        </Link>
      </div>

      {rekening.length === 0 ? (
        <div className="bg-surface-container-lowest rounded-xl p-xl border border-surface-container-highest flex flex-col items-center text-center gap-md max-w-[32rem] mx-auto mt-lg">
          <div className="w-16 h-16 rounded-full bg-primary-container/10 text-primary-container flex items-center justify-center">
            <span className="material-symbols-outlined text-3xl">savings</span>
          </div>
          <div>
            <h3 className="font-headline-md text-headline-md text-on-surface mb-xs">
              Belum ada rekening
            </h3>
            <p className="font-body-md text-body-md text-on-surface-variant">
              Buka rekening Tabungan Haji pertama Anda untuk mulai menabung menuju Baitullah.
            </p>
          </div>
          <Link
            href="/rekening/baru"
            className="h-[44px] px-lg bg-primary-container text-on-primary font-label-md text-label-md rounded-lg hover:bg-primary transition-colors flex items-center gap-sm"
          >
            <span className="material-symbols-outlined">add</span>
            Buka Rekening
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-gutter">
          {rekening.map((t) => (
            <KartuRekening key={t.id} t={t} />
          ))}
        </div>
      )}
    </div>
  );
}

function KartuRekening({ t }: { t: Tabungan }) {
  const aktif = t.status === "AKTIF";
  return (
    <div className="bg-surface-container-lowest rounded-xl shadow-sm border border-surface-variant p-lg relative overflow-hidden flex flex-col gap-md">
      <div className={`absolute left-0 top-0 bottom-0 w-[4px] ${aktif ? "bg-primary" : "bg-outline-variant"}`} />
      <div className="flex items-start justify-between gap-md pl-sm">
        <div className="flex items-center gap-md">
          <div className="w-10 h-10 rounded-full bg-primary-container/10 flex items-center justify-center text-primary-container shrink-0">
            <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>
              savings
            </span>
          </div>
          <div>
            <p className="font-label-md text-label-md text-on-surface">Tabungan Haji</p>
            <p className="font-body-sm text-body-sm text-on-surface-variant">
              {maskRekening(t.nomorRekening)}
            </p>
          </div>
        </div>
        <StatusBadge status={t.status} />
      </div>

      <div className="pl-sm">
        <p className="font-label-sm text-label-sm text-on-surface-variant">Saldo</p>
        <p className="font-headline-md text-headline-md text-primary">{formatRupiah(t.saldo)}</p>
        <p className="font-label-sm text-label-sm text-on-surface-variant mt-xs">
          Dibuka {formatTanggal(t.dibukaAt)}
        </p>
      </div>

      <div className="flex flex-wrap gap-sm pl-sm pt-sm border-t border-surface-variant">
        <Aksi
          href={`/transaksi/setor?rekening=${t.id}`}
          icon="add"
          label="Setor"
          disabled={!aktif}
          primary
        />
        <Aksi
          href={`/transaksi/tarik?rekening=${t.id}`}
          icon="arrow_outward"
          label="Tarik"
          disabled={!aktif}
        />
        <Aksi href={`/rekening/${t.id}/mutasi`} icon="receipt_long" label="Mutasi" />
        <Aksi href={`/estimasi`} icon="mosque" label="Estimasi" />
      </div>
    </div>
  );
}

function Aksi({
  href,
  icon,
  label,
  primary,
  disabled,
}: {
  href: string;
  icon: string;
  label: string;
  primary?: boolean;
  disabled?: boolean;
}) {
  const base =
    "flex items-center gap-xs px-sm py-xs rounded-lg font-label-sm text-label-sm transition-colors";
  if (disabled) {
    return (
      <span
        className={`${base} border border-outline-variant text-on-surface-variant/50 cursor-not-allowed`}
        title="Rekening tidak aktif"
      >
        <span className="material-symbols-outlined text-[16px]">{icon}</span>
        {label}
      </span>
    );
  }
  return (
    <Link
      href={href}
      className={`${base} ${
        primary
          ? "bg-primary text-on-primary hover:bg-primary-container"
          : "border border-outline-variant text-on-surface hover:bg-surface-container"
      }`}
    >
      <span className="material-symbols-outlined text-[16px]">{icon}</span>
      {label}
    </Link>
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
      className={`font-label-sm text-label-sm px-sm py-[2px] rounded-full h-fit ${map[status] ?? "bg-surface-container-high text-on-surface-variant"}`}
    >
      {status}
    </span>
  );
}
