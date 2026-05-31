"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { logout } from "@/lib/api";
import { inisial } from "@/lib/format";
import { SessionProvider, useSession } from "@/lib/session";

const NAV = [
  { href: "/dashboard", match: "/dashboard", icon: "home", label: "Beranda" },
  { href: "/rekening", match: "/rekening", icon: "account_balance_wallet", label: "Rekening" },
  { href: "/transaksi/setor", match: "/transaksi", icon: "swap_horiz", label: "Transaksi" },
  { href: "/estimasi", match: "/estimasi", icon: "mosque", label: "Estimasi" },
  { href: "/laporan", match: "/laporan", icon: "description", label: "Laporan" },
];

function deriveTitle(pathname: string): string {
  if (pathname.startsWith("/dashboard")) return "Dashboard Nasabah";
  if (pathname.startsWith("/rekening/baru")) return "Buka Rekening";
  if (pathname.includes("/mutasi")) return "Mutasi Rekening";
  if (pathname.startsWith("/rekening")) return "Rekening";
  if (pathname.startsWith("/transaksi/setor")) return "Setor Dana";
  if (pathname.startsWith("/transaksi/tarik")) return "Tarik Dana";
  if (pathname.startsWith("/estimasi")) return "Estimasi Keberangkatan";
  if (pathname.startsWith("/laporan")) return "Laporan Transaksi";
  if (pathname.startsWith("/profil")) return "Pengaturan Profil";
  return "BSI Mobile";
}

function Shell({ children }: { children: React.ReactNode }) {
  const { me, loading, error, refresh } = useSession();
  const router = useRouter();
  const pathname = usePathname();

  async function handleLogout() {
    await logout();
    router.replace("/login");
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface">
        <div className="flex items-center gap-sm text-on-surface-variant">
          <span className="material-symbols-outlined animate-spin">progress_activity</span>
          <span className="font-body-md text-body-md">Memuat...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-md bg-surface p-gutter text-center">
        <span className="material-symbols-outlined text-error text-5xl">error</span>
        <p className="font-body-md text-body-md text-on-surface-variant max-w-[28rem]">{error}</p>
        <div className="flex gap-sm">
          <button
            onClick={refresh}
            className="h-[44px] px-lg bg-primary text-on-primary font-label-md text-label-md rounded-lg hover:opacity-90"
          >
            Coba Lagi
          </button>
          <button
            onClick={handleLogout}
            className="h-[44px] px-lg border border-outline-variant text-on-surface font-label-md text-label-md rounded-lg hover:bg-surface-container"
          >
            Keluar
          </button>
        </div>
      </div>
    );
  }

  if (!me) return null;

  const title = deriveTitle(pathname);

  return (
    <div className="bg-surface text-on-surface flex min-h-screen">
      {/* Sidebar (Desktop) */}
      <nav className="hidden md:flex flex-col h-screen w-64 fixed left-0 top-0 bg-surface-container-low p-md gap-base border-r border-outline-variant z-40">
        <div className="mb-xl px-sm pt-sm">
          <h1 className="font-headline-md text-headline-md font-bold text-primary">BSI Mobile</h1>
        </div>
        <div className="flex items-center gap-md mb-lg px-sm">
          <div className="w-12 h-12 rounded-full bg-primary-container text-on-primary flex items-center justify-center font-label-md text-label-md shadow-sm">
            {inisial(me.nama)}
          </div>
          <div className="min-w-0">
            <p className="font-label-md text-label-md text-on-surface truncate">{me.nama}</p>
            <p className="font-body-sm text-body-sm text-on-surface-variant">Tabungan Haji</p>
          </div>
        </div>
        <ul className="flex flex-col gap-sm flex-1">
          {NAV.map((item) => {
            const active = pathname.startsWith(item.match);
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={`flex w-full items-center gap-md rounded-lg px-md py-sm transition-all ${
                    active
                      ? "bg-primary text-on-primary hover:bg-primary-container"
                      : "text-on-surface-variant hover:bg-surface-container-highest"
                  }`}
                >
                  <span
                    className="material-symbols-outlined"
                    style={active ? { fontVariationSettings: "'FILL' 1" } : undefined}
                  >
                    {item.icon}
                  </span>
                  <span className="font-label-md text-label-md">{item.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
        <Link
          href="/transaksi/setor"
          className="bg-secondary-container text-on-secondary-container font-label-md text-label-md py-sm rounded-lg w-full mb-lg hover:opacity-90 transition-opacity text-center"
        >
          Setor Dana
        </Link>
        <ul className="flex flex-col gap-sm border-t border-outline-variant pt-md">
          <li>
            <Link
              href="/profil"
              className={`flex items-center gap-md rounded-lg px-md py-sm transition-all ${
                pathname.startsWith("/profil")
                  ? "bg-primary text-on-primary"
                  : "text-on-surface-variant hover:bg-surface-container-highest"
              }`}
            >
              <span className="material-symbols-outlined">settings</span>
              <span className="font-label-md text-label-md">Pengaturan</span>
            </Link>
          </li>
          <li>
            <button
              type="button"
              title="Segera hadir"
              className="flex w-full items-center gap-md rounded-lg px-md py-sm text-on-surface-variant hover:bg-surface-container-highest transition-all"
            >
              <span className="material-symbols-outlined">help</span>
              <span className="font-label-md text-label-md">Bantuan</span>
            </button>
          </li>
        </ul>
      </nav>

      {/* Main */}
      <div className="flex-1 flex flex-col md:ml-64 w-full min-h-screen">
        <header className="flex justify-between items-center px-lg py-base w-full sticky top-0 z-50 shadow-sm bg-surface">
          <div className="md:hidden">
            <h1 className="font-headline-md text-headline-md font-bold text-primary">BSI Mobile</h1>
          </div>
          <div className="hidden md:block">
            <h2 className="font-headline-md text-headline-md text-on-surface">{title}</h2>
          </div>
          <div className="flex items-center gap-md">
            <Link
              href="/profil"
              className="material-symbols-outlined text-on-surface-variant cursor-pointer hover:text-primary transition-colors"
              title="Profil"
            >
              account_circle
            </Link>
            <div className="h-8 w-8 rounded-full bg-primary-container text-on-primary flex items-center justify-center font-label-md text-label-md">
              {inisial(me.nama)}
            </div>
            <button
              onClick={handleLogout}
              className="font-label-md text-label-md text-error hover:text-on-error-container transition-colors ml-sm"
            >
              Keluar
            </button>
          </div>
        </header>

        {/* Mobile nav */}
        <div className="md:hidden flex gap-xs overflow-x-auto px-md py-sm border-b border-outline-variant bg-surface-container-low">
          {NAV.map((item) => {
            const active = pathname.startsWith(item.match);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`whitespace-nowrap rounded-full px-md py-xs font-label-sm text-label-sm ${
                  active ? "bg-primary text-on-primary" : "text-on-surface-variant bg-surface-container"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </div>

        <main className="flex-1 p-gutter bg-surface">
          <div className="max-w-[1200px] mx-auto">{children}</div>
        </main>
      </div>
    </div>
  );
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <Shell>{children}</Shell>
    </SessionProvider>
  );
}
