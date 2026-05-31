"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { checkHealth, login, saveSession } from "@/lib/api";

type ApiStatus = "checking" | "online" | "offline";

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    setSubmitting(true);
    try {
      const result = await login(email, password);
      saveSession(result);
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Terjadi kesalahan. Silakan coba lagi.");
    } finally {
      setSubmitting(false);
    }
  }

  const statusCfg: Record<ApiStatus, { label: string; dot: string }> = {
    checking: { label: "Memeriksa Sistem...", dot: "bg-outline" },
    online: { label: "Sistem Online", dot: "bg-[#0b6c4b]" },
    offline: { label: "Sistem Offline", dot: "bg-error" },
  };
  const status = statusCfg[apiStatus];

  return (
    <div className="flex w-full min-h-screen">
      {/* Left Pane: Branding & Hero (Hidden on Mobile) */}
      <div className="hidden md:flex flex-col relative w-1/2 bg-primary overflow-hidden">
        <div className="absolute inset-0 bg-primary z-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            alt=""
            className="w-full h-full object-cover opacity-30 mix-blend-multiply"
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuBYSvrOy7xXvl8SzYr-r7sSYRmLiPxH17jqmwThgSe6qc1m3CnTdvEQcI4QufJSdkUOLNgX7I-DS1vOcCW1ZZ4fJR20Xzyn7_9qX7HVtyX5jTSIwJzRPZj-Y6InksxwxklJjKP51CiFPGioUduK3NdhTUtScOKuZUARTDaDDyRmcFOZGWkreKYs6xEbWoE1G5UY7E6GRfNqZByWGvxx8CL-dqbpKxQIf0ONUVFTvZ85oSwFFOHeD8_uabqph43DbdyGRK8VrDv9yhc7"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-primary via-primary/80 to-transparent" />
        </div>
        <div className="relative z-10 flex flex-col justify-end h-full w-full p-xxl pb-[10%]">
          <div className="w-16 h-16 bg-surface-container-lowest rounded-xl flex items-center justify-center mb-xl shadow-lg">
            <span
              className="material-symbols-outlined text-primary text-4xl"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              mosque
            </span>
          </div>
          <h1 className="font-headline-xl text-headline-xl text-on-primary mb-md max-w-[32rem]">
            Wujudkan Niat Suci Anda
          </h1>
          <p className="font-body-lg text-body-lg text-on-primary/90 max-w-[28rem]">
            Langkah awal perjalanan ibadah Haji Anda dimulai di sini. Nikmati kemudahan dan
            keberkahan mengelola dana bersama Bank Syariah Indonesia.
          </p>
        </div>
      </div>

      {/* Right Pane: Login Form */}
      <div className="flex flex-col justify-center items-center w-full md:w-1/2 bg-surface-container-lowest p-lg sm:p-xxl relative">
        <div className="w-full max-w-[400px]">
          {/* Mobile Logo */}
          <div className="md:hidden flex items-center gap-sm mb-xl">
            <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
              <span
                className="material-symbols-outlined text-on-primary"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                mosque
              </span>
            </div>
            <span className="font-headline-md text-headline-md font-bold text-primary">
              BSI Mobile
            </span>
          </div>

          {/* Header */}
          <div className="mb-xl">
            <h2 className="font-headline-lg-mobile md:font-headline-lg text-headline-lg-mobile md:text-headline-lg text-on-surface mb-xs">
              Selamat Datang
            </h2>
            <p className="font-body-md text-body-md text-on-surface-variant">
              Silakan masuk untuk mengelola Tabungan Haji Anda.
            </p>
          </div>

          {/* Form */}
          <form className="space-y-lg" onSubmit={handleSubmit} noValidate>
            {/* Error banner */}
            {error && (
              <div
                role="alert"
                className="flex items-center gap-sm rounded-lg bg-error-container px-md py-sm text-on-error-container"
              >
                <span className="material-symbols-outlined text-[20px]">error</span>
                <span className="font-body-sm text-body-sm">{error}</span>
              </div>
            )}

            {/* Email Input */}
            <div className="relative">
              <input
                className="floating-input w-full px-md py-sm h-[56px] bg-transparent border border-outline-variant rounded-lg text-on-surface font-body-md focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none transition-colors peer placeholder-transparent"
                id="email"
                name="email"
                placeholder="Email Anda"
                required
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <label
                className="floating-label absolute left-md top-1/2 -translate-y-1/2 font-body-md text-body-md text-on-surface-variant transition-all duration-200 pointer-events-none peer-focus:text-primary"
                htmlFor="email"
              >
                Alamat Email
              </label>
              <span className="material-symbols-outlined absolute right-md top-1/2 -translate-y-1/2 text-outline-variant pointer-events-none">
                mail
              </span>
            </div>

            {/* Password Input */}
            <div className="relative">
              <input
                className="floating-input w-full px-md py-sm h-[56px] bg-transparent border border-outline-variant rounded-lg text-on-surface font-body-md focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none transition-colors peer placeholder-transparent"
                id="password"
                name="password"
                placeholder="Kata Sandi"
                required
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <label
                className="floating-label absolute left-md top-1/2 -translate-y-1/2 font-body-md text-body-md text-on-surface-variant transition-all duration-200 pointer-events-none peer-focus:text-primary"
                htmlFor="password"
              >
                Kata Sandi
              </label>
              <button
                className="absolute right-md top-1/2 -translate-y-1/2 text-outline-variant hover:text-primary transition-colors focus:outline-none"
                type="button"
                aria-label={showPassword ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"}
                onClick={() => setShowPassword((v) => !v)}
              >
                <span className="material-symbols-outlined">
                  {showPassword ? "visibility" : "visibility_off"}
                </span>
              </button>
            </div>

            {/* Forgot Password Link */}
            <div className="flex justify-end mt-sm mb-lg">
              <a
                className="font-label-sm text-label-sm text-primary hover:text-primary-container transition-colors"
                href="#"
              >
                Lupa Kata Sandi?
              </a>
            </div>

            {/* Submit Button */}
            <button
              className="w-full h-[48px] bg-primary text-on-primary font-label-md text-label-md rounded-lg shadow-sm hover:translate-y-[-2px] hover:shadow-md transition-all duration-200 flex items-center justify-center gap-sm disabled:opacity-60 disabled:hover:translate-y-0 disabled:cursor-not-allowed"
              type="submit"
              disabled={submitting}
            >
              {submitting ? (
                <>
                  <span className="material-symbols-outlined text-[20px] animate-spin">
                    progress_activity
                  </span>
                  <span>Memproses...</span>
                </>
              ) : (
                <>
                  <span>Masuk</span>
                  <span className="material-symbols-outlined text-[20px]">arrow_forward</span>
                </>
              )}
            </button>
          </form>

          {/* Registration Link */}
          <div className="mt-xl text-center">
            <p className="font-body-sm text-body-sm text-on-surface-variant">
              Belum punya rekening Tabungan Haji?
              <Link
                className="font-label-md text-label-md text-primary hover:text-primary-container ml-xs transition-colors"
                href="/register"
              >
                Daftar Sekarang
              </Link>
            </p>
          </div>
        </div>

        {/* API Status Indicator (Footer) */}
        <div className="absolute bottom-lg left-1/2 -translate-x-1/2 md:left-auto md:translate-x-0 md:right-lg flex items-center gap-xs bg-surface py-xs px-sm rounded-full border border-surface-container-high shadow-sm">
          <span className="relative flex h-2.5 w-2.5">
            {apiStatus === "online" && (
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary-fixed-dim opacity-75" />
            )}
            <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${status.dot}`} />
          </span>
          <span className="font-label-sm text-label-sm text-on-surface-variant ml-xs">
            {status.label}
          </span>
        </div>
      </div>
    </div>
  );
}
