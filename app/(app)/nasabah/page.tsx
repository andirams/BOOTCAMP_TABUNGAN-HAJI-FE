"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { UnauthorizedError } from "@/lib/api";
import {
  nasabahApi,
  type NasabahRecord,
  type NasabahCreateInput,
} from "@/lib/nasabah";
import { formatTanggal } from "@/lib/format";

/* ----------------------------- form state ----------------------------- */

const FORM_KOSONG: NasabahCreateInput = { nik: "", nama: "", email: "", nomorHp: "" };

/** Validasi ringan di sisi klien (mencerminkan aturan backend). null = valid. */
function validasi(form: NasabahCreateInput, mode: "tambah" | "ubah"): string | null {
  if (mode === "tambah" && !/^\d{16}$/.test(form.nik)) return "NIK harus tepat 16 digit angka.";
  if (form.nama.trim().length < 3) return "Nama minimal 3 karakter.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) return "Format email tidak valid.";
  if (!/^08\d{8,11}$/.test(form.nomorHp)) return "Nomor HP harus format 08xxxxxxxxxx (10-13 digit).";
  return null;
}

/* ----------------------------- page ----------------------------- */

export default function NasabahPage() {
  const router = useRouter();

  const [list, setList] = useState<NasabahRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [form, setForm] = useState<NasabahCreateInput>(FORM_KOSONG);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [hapusId, setHapusId] = useState<string | null>(null);

  const mode = editingId ? "ubah" : "tambah";

  /* --- muat daftar saat mount --- */
  const muat = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      setList(await nasabahApi.list());
    } catch (err) {
      if (err instanceof UnauthorizedError) {
        router.replace("/login");
        return;
      }
      setLoadError(err instanceof Error ? err.message : "Gagal memuat daftar nasabah.");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    muat();
  }, [muat]);

  /* --- helpers form --- */
  function ubahField(field: keyof NasabahCreateInput, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  function resetForm() {
    setForm(FORM_KOSONG);
    setEditingId(null);
    setFormError(null);
  }

  function mulaiEdit(n: NasabahRecord) {
    setEditingId(n.id);
    setForm({ nik: n.nik, nama: n.nama, email: n.email, nomorHp: n.nomorHp });
    setFormError(null);
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;

    const pesan = validasi(form, mode);
    if (pesan) {
      setFormError(pesan);
      return;
    }

    setFormError(null);
    setSubmitting(true);
    try {
      if (editingId) {
        await nasabahApi.update(editingId, {
          nama: form.nama.trim(),
          email: form.email.trim(),
          nomorHp: form.nomorHp.trim(),
        });
      } else {
        await nasabahApi.create({
          nik: form.nik.trim(),
          nama: form.nama.trim(),
          email: form.email.trim(),
          nomorHp: form.nomorHp.trim(),
        });
      }
      resetForm();
      await muat();
    } catch (err) {
      if (err instanceof UnauthorizedError) {
        router.replace("/login");
        return;
      }
      setFormError(err instanceof Error ? err.message : "Gagal menyimpan nasabah.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleHapus(n: NasabahRecord) {
    if (hapusId) return;
    if (typeof window !== "undefined" && !window.confirm(`Hapus nasabah "${n.nama}"?`)) return;

    setHapusId(n.id);
    setLoadError(null);
    try {
      await nasabahApi.remove(n.id);
      if (editingId === n.id) resetForm();
      await muat();
    } catch (err) {
      if (err instanceof UnauthorizedError) {
        router.replace("/login");
        return;
      }
      setLoadError(err instanceof Error ? err.message : "Gagal menghapus nasabah.");
    } finally {
      setHapusId(null);
    }
  }

  return (
    <div className="space-y-gutter pb-xxl">
      {/* Header */}
      <div>
        <h2 className="font-headline-lg text-headline-lg text-on-surface">Data Nasabah</h2>
        <p className="font-body-md text-body-md text-on-surface-variant mt-xs">
          Kelola data nasabah — tambah, ubah, dan hapus.
        </p>
      </div>

      {/* Form tambah / edit */}
      <form
        onSubmit={handleSubmit}
        className="bg-surface-container-lowest rounded-xl shadow-sm border border-outline-variant p-lg flex flex-col gap-md"
      >
        <div className="flex items-center justify-between">
          <h3 className="font-headline-md text-headline-md text-on-surface">
            {editingId ? "Ubah Nasabah" : "Tambah Nasabah"}
          </h3>
          {editingId && (
            <span className="font-label-sm text-label-sm text-on-surface-variant bg-surface-container px-sm py-xs rounded-full">
              Mode ubah
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-md">
          <Field
            label="NIK"
            value={form.nik}
            onChange={(v) => ubahField("nik", v.replace(/\D/g, "").slice(0, 16))}
            placeholder="16 digit angka"
            inputMode="numeric"
            disabled={!!editingId}
            hint={editingId ? "NIK tidak dapat diubah." : undefined}
          />
          <Field
            label="Nama"
            value={form.nama}
            onChange={(v) => ubahField("nama", v)}
            placeholder="Nama lengkap"
          />
          <Field
            label="Email"
            type="email"
            value={form.email}
            onChange={(v) => ubahField("email", v)}
            placeholder="nama@email.com"
          />
          <Field
            label="Nomor HP"
            value={form.nomorHp}
            onChange={(v) => ubahField("nomorHp", v.replace(/\D/g, "").slice(0, 13))}
            placeholder="08xxxxxxxxxx"
            inputMode="numeric"
          />
        </div>

        {formError && (
          <p className="flex items-center gap-xs text-error font-body-sm text-body-sm">
            <span className="material-symbols-outlined text-[18px]">error</span>
            {formError}
          </p>
        )}

        <div className="flex items-center justify-end gap-md pt-sm border-t border-outline-variant">
          {editingId && (
            <button
              type="button"
              onClick={resetForm}
              className="font-label-md text-label-md text-on-surface-variant px-lg py-sm rounded-lg hover:bg-surface-container transition-colors"
            >
              Batal
            </button>
          )}
          <button
            type="submit"
            disabled={submitting}
            className="font-label-md text-label-md text-on-primary bg-primary px-xl py-sm rounded-lg hover:bg-primary-container transition-colors flex items-center gap-xs disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? (
              <>
                <span className="material-symbols-outlined text-[18px] animate-spin">
                  progress_activity
                </span>
                Menyimpan...
              </>
            ) : (
              <>
                <span className="material-symbols-outlined text-[18px]">
                  {editingId ? "save" : "add"}
                </span>
                {editingId ? "Simpan Perubahan" : "Tambah Nasabah"}
              </>
            )}
          </button>
        </div>
      </form>

      {/* Tabel daftar */}
      <div className="bg-surface-container-lowest rounded-xl shadow-sm border border-outline-variant overflow-hidden">
        <div className="flex items-center justify-between px-lg py-md border-b border-outline-variant">
          <h3 className="font-headline-md text-headline-md text-on-surface">
            Daftar Nasabah{" "}
            {!loading && (
              <span className="font-body-sm text-body-sm text-on-surface-variant">
                ({list.length})
              </span>
            )}
          </h3>
          <button
            type="button"
            onClick={muat}
            disabled={loading}
            title="Muat ulang"
            className="material-symbols-outlined text-on-surface-variant hover:text-primary transition-colors disabled:opacity-50"
          >
            refresh
          </button>
        </div>

        {loadError && (
          <p className="flex items-center gap-xs text-error font-body-sm text-body-sm px-lg py-md">
            <span className="material-symbols-outlined text-[18px]">error</span>
            {loadError}
          </p>
        )}

        {loading ? (
          <div className="flex items-center justify-center gap-sm text-on-surface-variant py-xl">
            <span className="material-symbols-outlined animate-spin">progress_activity</span>
            <span className="font-body-md text-body-md">Memuat...</span>
          </div>
        ) : list.length === 0 && !loadError ? (
          <p className="font-body-md text-body-md text-on-surface-variant text-center py-xl">
            Belum ada nasabah. Tambahkan lewat form di atas.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-outline-variant bg-surface-container-low">
                  <Th>Nama</Th>
                  <Th>NIK</Th>
                  <Th>Email</Th>
                  <Th>Nomor HP</Th>
                  <Th>Terdaftar</Th>
                  <Th className="text-right">Aksi</Th>
                </tr>
              </thead>
              <tbody>
                {list.map((n) => (
                  <NasabahRow
                    key={n.id}
                    nasabah={n}
                    sedangDiedit={editingId === n.id}
                    sedangDihapus={hapusId === n.id}
                    onEdit={mulaiEdit}
                    onDelete={handleHapus}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

/* ----------------------------- NasabahRow ----------------------------- */

function NasabahRow({
  nasabah,
  sedangDiedit,
  sedangDihapus,
  onEdit,
  onDelete,
}: {
  nasabah: NasabahRecord;
  sedangDiedit: boolean;
  sedangDihapus: boolean;
  onEdit: (n: NasabahRecord) => void;
  onDelete: (n: NasabahRecord) => void;
}) {
  return (
    <tr
      className={`border-b border-outline-variant last:border-0 transition-colors ${
        sedangDiedit ? "bg-primary/5" : "hover:bg-surface-container-low"
      }`}
    >
      <Td className="font-label-md text-label-md text-on-surface">{nasabah.nama}</Td>
      <Td className="font-body-sm text-body-sm text-on-surface-variant tabular-nums">{nasabah.nik}</Td>
      <Td className="font-body-sm text-body-sm text-on-surface-variant">{nasabah.email}</Td>
      <Td className="font-body-sm text-body-sm text-on-surface-variant tabular-nums">
        {nasabah.nomorHp}
      </Td>
      <Td className="font-body-sm text-body-sm text-on-surface-variant whitespace-nowrap">
        {formatTanggal(nasabah.createdAt)}
      </Td>
      <Td className="text-right whitespace-nowrap">
        <div className="inline-flex gap-xs">
          <button
            type="button"
            onClick={() => onEdit(nasabah)}
            disabled={sedangDihapus}
            className="inline-flex items-center gap-xs px-sm py-xs rounded-lg border border-outline-variant font-label-sm text-label-sm text-on-surface hover:bg-surface-container transition-colors disabled:opacity-50"
          >
            <span className="material-symbols-outlined text-[16px]">edit</span>
            Edit
          </button>
          <button
            type="button"
            onClick={() => onDelete(nasabah)}
            disabled={sedangDihapus}
            className="inline-flex items-center gap-xs px-sm py-xs rounded-lg border border-error/40 font-label-sm text-label-sm text-error hover:bg-error/10 transition-colors disabled:opacity-50"
          >
            <span className="material-symbols-outlined text-[16px]">
              {sedangDihapus ? "progress_activity" : "delete"}
            </span>
            {sedangDihapus ? "..." : "Hapus"}
          </button>
        </div>
      </Td>
    </tr>
  );
}

/* ----------------------------- bits ----------------------------- */

function Field({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  inputMode,
  disabled,
  hint,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  inputMode?: "numeric" | "text";
  disabled?: boolean;
  hint?: string;
}) {
  return (
    <div className="flex flex-col gap-xs">
      <label className="font-label-md text-label-md text-on-surface-variant">{label}</label>
      <input
        type={type}
        inputMode={inputMode}
        value={value}
        placeholder={placeholder}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-md py-sm bg-surface border border-outline rounded-lg font-body-md text-body-md text-on-surface focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all disabled:bg-surface-container disabled:text-on-surface-variant disabled:cursor-not-allowed"
      />
      {hint && <span className="font-body-sm text-body-sm text-on-surface-variant">{hint}</span>}
    </div>
  );
}

function Th({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <th className={`px-lg py-sm font-label-sm text-label-sm text-on-surface-variant ${className}`}>
      {children}
    </th>
  );
}

function Td({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <td className={`px-lg py-md align-middle ${className}`}>{children}</td>;
}
