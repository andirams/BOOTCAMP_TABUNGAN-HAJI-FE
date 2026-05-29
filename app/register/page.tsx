"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { checkHealth, register } from "@/lib/api";

type ApiStatus = "checking" | "online" | "offline";

export default function RegisterPage() {
  const router = useRouter();

  const [nik, setNik] = useState("");
  const [nama, setNama] = useState("");
  const [nomorHp, setNomorHp] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [apiStatus, setApiStatus] = useState<ApiStatus>("checking");

  useEffect(() => {
    let active = true;
    checkHealth().then((ok) => {
      if (active) setApiStatus(ok ? "online" : "offline");
    });
    return () => {
      active = false;
    };
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    setError(null);

    if (!/^\d{16}$/.test(nik)) {
      setError("NIK harus tepat 16 digit angka.");
      return;
    }
    if (nama.trim().length < 3) {
      setError("Nama minimal 3 karakter.");
      return;
    }
    if (!/^08\d{8,11}$/.test(nomorHp)) {
      setError("Nomor HP harus format 08xxxxxxxxxx (10–13 digit).");
      return;
    }
    if (password.length < 8 || password.length > 72) {
      setError("Kata sandi harus 8–72 karakter.");
      return;
    }
    if (password !== confirm) {
      setError("Konfirmasi kata sandi tidak cocok.");
      return;
    }

    setSubmitting(true);
    try {
      await register({ nik, nama: nama.trim(), nomorHp, email, password });
      setSuccess("Registrasi berhasil! Mengarahkan ke halaman masuk...");
      setTimeout(() => router.push("/login"), 1200);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registrasi gagal. Silakan coba lagi.");
    } finally {
      setSubmitting(false);
    }
  }

  const inputCls =
    "floating-input w-full px-md h-[56px] bg-surface-container-lowest border border-outline-variant rounded-lg text-on-surface font-body-md focus:outline-none focus:border-primary-container focus:ring-1 focus:ring-primary-container transition-all peer placeholder-transparent";
  const labelCls =
    "floating-label absolute left-md top-1/2 -translate-y-1/2 font-body-md text-body-md text-on-surface-variant transition-all duration-200 pointer-events-none peer-focus:text-primary-container";

  return (
    <div className="min-h-screen flex flex-col items-center justify-center relative overflow-x-hidden bg-surface-container-low p-md">
      {/* Decorative Background Pattern */}
      <div
        className="absolute inset-0 z-0 pointer-events-none opacity-[0.03]"
        style={{
          backgroundImage: "radial-gradient(var(--color-primary-container) 1px, transparent 1px)",
          backgroundSize: "20px 20px",
        }}
      />

      {/* Main Registration Container */}
      <main className="w-full max-w-md z-10 relative">
        <div
          className="rounded-xl p-xl flex flex-col gap-lg border border-white/20"
          style={{
            background: "rgba(255, 255, 255, 0.95)",
            backdropFilter: "blur(10px)",
            WebkitBackdropFilter: "blur(10px)",
            boxShadow: "0 4px 24px rgba(0, 103, 71, 0.05)",
          }}
        >
          {/* Header / Brand */}
          <div className="text-center flex flex-col items-center gap-sm">
            <div className="w-16 h-16 bg-primary-container rounded-lg flex items-center justify-center mb-sm shadow-sm">
              <span
                className="material-symbols-outlined text-on-primary text-3xl"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                mosque
              </span>
            </div>
            <h1 className="font-headline-lg-mobile md:font-headline-lg text-headline-lg-mobile md:text-headline-lg text-primary">
              Tabungan Haji BSI
            </h1>
            <p className="font-body-md text-body-md text-on-surface-variant">
              Daftar untuk memulai persiapan ibadah haji Anda dengan aman dan sesuai syariah.
            </p>
          </div>

          {/* Registration Form */}
          <form className="flex flex-col gap-md mt-md" onSubmit={handleSubmit} noValidate>
            {error && (
              <div
                role="alert"
                className="flex items-center gap-sm rounded-lg bg-error-container px-md py-sm text-on-error-container"
              >
                <span className="material-symbols-outlined text-[20px]">error</span>
                <span className="font-body-sm text-body-sm">{error}</span>
              </div>
            )}
            {success && (
              <div
                role="status"
                className="flex items-center gap-sm rounded-lg bg-primary-fixed px-md py-sm text-on-primary-fixed"
              >
                <span className="material-symbols-outlined text-[20px]">check_circle</span>
                <span className="font-body-sm text-body-sm">{success}</span>
              </div>
            )}

            {/* NIK */}
            <div className="relative">
              <input
                className={inputCls}
                id="nik"
                type="text"
                inputMode="numeric"
                maxLength={16}
                placeholder="NIK"
                required
                value={nik}
                onChange={(e) => setNik(e.target.value.replace(/\D/g, ""))}
              />
              <label className={labelCls} htmlFor="nik">
                NIK (16 digit)
              </label>
              <span className="material-symbols-outlined absolute right-md top-1/2 -translate-y-1/2 text-outline-variant peer-focus:text-primary-container transition-colors pointer-events-none">
                badge
              </span>
            </div>

            {/* Nama */}
            <div className="relative">
              <input
                className={inputCls}
                id="nama"
                type="text"
                placeholder="Nama Lengkap"
                required
                autoComplete="name"
                value={nama}
                onChange={(e) => setNama(e.target.value)}
              />
              <label className={labelCls} htmlFor="nama">
                Nama Lengkap
              </label>
              <span className="material-symbols-outlined absolute right-md top-1/2 -translate-y-1/2 text-outline-variant peer-focus:text-primary-container transition-colors pointer-events-none">
                person
              </span>
            </div>

            {/* Nomor HP */}
            <div className="relative">
              <input
                className={inputCls}
                id="nomorHp"
                type="tel"
                inputMode="numeric"
                maxLength={13}
                placeholder="Nomor HP"
                required
                autoComplete="tel"
                value={nomorHp}
                onChange={(e) => setNomorHp(e.target.value.replace(/\D/g, ""))}
              />
              <label className={labelCls} htmlFor="nomorHp">
                Nomor HP (08xxxx)
              </label>
              <span className="material-symbols-outlined absolute right-md top-1/2 -translate-y-1/2 text-outline-variant peer-focus:text-primary-container transition-colors pointer-events-none">
                call
              </span>
            </div>

            {/* Email */}
            <div className="relative">
              <input
                className={inputCls}
                id="email"
                type="email"
                placeholder="Alamat Email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <label className={labelCls} htmlFor="email">
                Alamat Email
              </label>
              <span className="material-symbols-outlined absolute right-md top-1/2 -translate-y-1/2 text-outline-variant peer-focus:text-primary-container transition-colors pointer-events-none">
                mail
              </span>
            </div>

            {/* Password */}
            <div className="relative">
              <input
                className={inputCls}
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="Kata Sandi"
                required
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <label className={labelCls} htmlFor="password">
                Kata Sandi
              </label>
              <button
                type="button"
                aria-label={showPassword ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"}
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-md top-1/2 -translate-y-1/2 text-outline-variant hover:text-primary-container transition-colors focus:outline-none"
              >
                <span className="material-symbols-outlined">
                  {showPassword ? "visibility" : "visibility_off"}
                </span>
              </button>
            </div>

            {/* Confirm Password */}
            <div className="relative">
              <input
                className={inputCls}
                id="confirm_password"
                type={showConfirm ? "text" : "password"}
                placeholder="Konfirmasi Kata Sandi"
                required
                autoComplete="new-password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
              />
              <label className={labelCls} htmlFor="confirm_password">
                Konfirmasi Kata Sandi
              </label>
              <button
                type="button"
                aria-label={showConfirm ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"}
                onClick={() => setShowConfirm((v) => !v)}
                className="absolute right-md top-1/2 -translate-y-1/2 text-outline-variant hover:text-primary-container transition-colors focus:outline-none"
              >
                <span className="material-symbols-outlined">
                  {showConfirm ? "visibility" : "visibility_off"}
                </span>
              </button>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={submitting || !!success}
              className="w-full bg-primary-container hover:bg-primary text-on-primary font-label-md text-label-md py-md rounded-lg transition-colors mt-sm shadow-sm flex justify-center items-center gap-sm disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {submitting ? (
                <>
                  <span className="material-symbols-outlined text-lg animate-spin">
                    progress_activity
                  </span>
                  <span>Memproses...</span>
                </>
              ) : (
                <>
                  <span>Daftar</span>
                  <span className="material-symbols-outlined text-lg">arrow_forward</span>
                </>
              )}
            </button>
          </form>

          {/* Login Link */}
          <div className="text-center mt-sm">
            <p className="font-body-sm text-body-sm text-on-surface-variant">
              Sudah memiliki akun?
              <Link
                className="font-label-md text-label-md text-primary-container hover:text-primary transition-colors ml-xs"
                href="/login"
              >
                Masuk di sini
              </Link>
            </p>
          </div>
        </div>
      </main>

      {/* System Health Indicator (Bottom Right) */}
      <div className="fixed bottom-lg right-lg z-20 flex items-center gap-sm bg-surface-container-lowest py-xs px-sm rounded-full shadow-sm border border-outline-variant">
        <span className="relative flex h-3 w-3">
          {apiStatus === "online" && (
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary-container opacity-75" />
          )}
          <span
            className={`relative inline-flex rounded-full h-3 w-3 ${
              apiStatus === "online"
                ? "bg-primary-container"
                : apiStatus === "offline"
                  ? "bg-error"
                  : "bg-outline"
            }`}
          />
        </span>
        <span className="font-label-sm text-label-sm text-on-surface-variant">
          {apiStatus === "online"
            ? "Sistem Online"
            : apiStatus === "offline"
              ? "Sistem Offline"
              : "Memeriksa Sistem..."}
        </span>
      </div>
    </div>
  );
}
