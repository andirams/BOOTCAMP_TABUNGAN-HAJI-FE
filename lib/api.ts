const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000/api/v1"

const HEALTH_URL = API_URL.replace('/api/v1', '/health');

export async function checkHealth(): Promise<boolean> {
    try{
        const res = await fetch(HEALTH_URL);
        if (!res.ok) return false;
        return (await res.json())?.status === "ok";
    }catch (error){
        return false
    }
}

/* ---------------------------------------------------------------- *
 * Tipe data (mengikuti bentuk respons backend tabungan-haji-api).
 * Catatan: kolom BigInt (saldo/nominal/...) diserialisasi sebagai string.
 * ---------------------------------------------------------------- */

export type Nasabah = {
    id: string;
    nama: string;
    email: string;
};

export type StatusTabungan = "AKTIF" | "TUTUP" | "BEKU";

export type Tabungan = {
    id: string;
    nasabahId: string;
    nomorRekening: string;
    saldo: string;
    status: StatusTabungan;
    dibukaAt: string;
};

export type Me = {
    id: string;
    nik: string;
    nama: string;
    email: string;
    nomorHp: string;
    createdAt: string;
    updatedAt: string;
    tabungan: Tabungan[];
};

export type JenisTransaksi = "SETOR" | "TARIK";

export type Transaksi = {
    id: string;
    tabunganId: string;
    jenis: JenisTransaksi;
    nominal: string;
    saldoSebelum: string;
    saldoSesudah: string;
    referensi: string;
    metode: string | null;
    waktu: string;
};

export type EstimasiHaji =
    | {
          status: "BELUM_PORSI";
          saldo: string;
          batasPorsi: string;
          kekurangan: string;
          message: string;
      }
    | {
          status: "DAPAT_PORSI";
          saldo: string;
          nomorPorsi: number;
          kuotaPerTahun: number;
          masaTungguTahun: number;
          estimasiTahunBerangkat: number;
      };

export type LoginResult = {
    token: string;
    nasabah: Nasabah;
};

const TOKEN_KEY = "th_token";
const NASABAH_KEY = "th_nasabah";

/** Dilempar saat token tidak valid / kedaluwarsa (HTTP 401). */
export class UnauthorizedError extends Error {
    constructor() {
        super("UNAUTHORIZED");
        this.name = "UnauthorizedError";
    }
}

/* ---------------------------------------------------------------- *
 * Sesi (token JWT disimpan di localStorage)
 * ---------------------------------------------------------------- */

export function saveSession(result: LoginResult): void {
    if (typeof window === "undefined") return;
    localStorage.setItem(TOKEN_KEY, result.token);
    localStorage.setItem(NASABAH_KEY, JSON.stringify(result.nasabah));
}

export function getToken(): string | null {
    if (typeof window === "undefined") return null;
    return localStorage.getItem(TOKEN_KEY);
}

/** id nasabah dari sesi (dipakai untuk membuka rekening, dsb). */
export function getNasabahId(): string | null {
    if (typeof window === "undefined") return null;
    try {
        const raw = localStorage.getItem(NASABAH_KEY);
        return raw ? (JSON.parse(raw)?.id ?? null) : null;
    } catch {
        return null;
    }
}

export function clearSession(): void {
    if (typeof window === "undefined") return;
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(NASABAH_KEY);
}

/** fetch ber-Authorization. Otomatis melempar UnauthorizedError pada 401. */
async function authFetch(path: string, init: RequestInit = {}): Promise<Response> {
    const token = getToken();
    const res = await fetch(`${API_URL}${path}`, {
        ...init,
        headers: {
            ...(init.headers ?? {}),
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
    });
    if (res.status === 401) {
        clearSession();
        throw new UnauthorizedError();
    }
    return res;
}

/* ---------------------------------------------------------------- *
 * Endpoint
 * ---------------------------------------------------------------- */

/** POST /auth/login */
export async function login(email: string, password: string): Promise<LoginResult> {
    let res: Response;
    try {
        res = await fetch(`${API_URL}/auth/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password }),
        });
    } catch {
        throw new Error("Tidak dapat terhubung ke server. Periksa koneksi Anda.");
    }

    const data = await res.json().catch(() => null);

    if (!res.ok) {
        const message =
            data?.message ??
            data?.error?.message ??
            data?.error ??
            (res.status === 401
                ? "Email atau kata sandi salah."
                : "Terjadi kesalahan. Silakan coba lagi.");
        throw new Error(message);
    }

    return data as LoginResult;
}

export type RegisterInput = {
    nik: string;
    nama: string;
    nomorHp: string;
    email: string;
    password: string;
};

/** POST /auth/register — self-registration publik: buat nasabah + set password sekaligus. */
export async function register(
    input: RegisterInput,
): Promise<{ message: string; nasabah: Nasabah }> {
    let res: Response;
    try {
        res = await fetch(`${API_URL}/auth/register`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(input),
        });
    } catch {
        throw new Error("Tidak dapat terhubung ke server. Periksa koneksi Anda.");
    }

    const data = await res.json().catch(() => null);

    if (!res.ok) {
        const detail =
            data?.details && typeof data.details === "object"
                ? Object.values(data.details).flat().filter(Boolean).join(" ")
                : null;
        const message =
            detail ||
            data?.message ||
            data?.error?.message ||
            data?.error ||
            "Registrasi gagal. Silakan coba lagi.";
        throw new Error(message);
    }

    return data as { message: string; nasabah: Nasabah };
}

/** GET /auth/me — profil nasabah + daftar rekeningnya. */
export async function getMe(): Promise<Me> {
    const res = await authFetch("/auth/me");
    if (!res.ok) throw new Error("Gagal memuat data pengguna.");
    return (await res.json()) as Me;
}

/** GET /tabungan/:id/estimasi-haji */
export async function getEstimasiHaji(tabunganId: string): Promise<EstimasiHaji> {
    const res = await authFetch(`/tabungan/${tabunganId}/estimasi-haji`);
    if (!res.ok) throw new Error("Gagal memuat estimasi haji.");
    return (await res.json()) as EstimasiHaji;
}

/** GET /transaksi/tabungan/:tabunganId — daftar transaksi sebuah rekening. */
export async function getTransaksiByTabungan(tabunganId: string): Promise<Transaksi[]> {
    const res = await authFetch(`/transaksi/tabungan/${tabunganId}`);
    if (!res.ok) throw new Error("Gagal memuat transaksi.");
    const json = await res.json();
    return (json?.data ?? []) as Transaksi[];
}

export type Metode = "TUNAI" | "TRANSFER" | "VIRTUAL_ACCOUNT" | "QRIS";

export type TabunganDetail = Tabungan & {
    nasabah?: { id: string; nama: string; nik: string };
};

export type MutasiResponse = {
    tabungan: { id: string; nomorRekening: string; saldo: string; status: StatusTabungan };
    total: number;
    mutasi: Transaksi[];
};

export type QrisResult = { success: boolean; replay: boolean; message: string; data: Transaksi };

/** GET /tabungan/:id */
export async function getTabunganById(id: string): Promise<TabunganDetail> {
    const res = await authFetch(`/tabungan/${id}`);
    if (res.status === 404) throw new Error("Rekening tidak ditemukan.");
    if (!res.ok) throw new Error("Gagal memuat rekening.");
    return (await res.json()) as TabunganDetail;
}

/** GET /tabungan/:id/mutasi */
export async function getMutasi(id: string): Promise<MutasiResponse> {
    const res = await authFetch(`/tabungan/${id}/mutasi`);
    if (!res.ok) throw new Error("Gagal memuat mutasi.");
    return (await res.json()) as MutasiResponse;
}

/** POST /tabungan — buka rekening baru untuk nasabah yang sedang login. */
export async function openRekening(setoranAwal?: number): Promise<TabunganDetail> {
    const nasabahId = getNasabahId();
    if (!nasabahId) throw new UnauthorizedError();
    const res = await authFetch("/tabungan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nasabahId, ...(setoranAwal ? { setoranAwal } : {}) }),
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) throw new Error(data?.message ?? "Gagal membuka rekening.");
    return data as TabunganDetail;
}

/** PATCH /tabungan/:id/status */
export async function updateStatusRekening(
    id: string,
    status: StatusTabungan,
): Promise<TabunganDetail> {
    const res = await authFetch(`/tabungan/${id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) throw new Error(data?.message ?? "Gagal mengubah status rekening.");
    return data as TabunganDetail;
}

/** POST /transaksi/setor (nominal harus bilangan bulat > 0). */
export async function setor(
    tabunganId: string,
    nominal: number,
    metode?: Metode,
): Promise<Transaksi> {
    const res = await authFetch("/transaksi/setor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tabunganId, nominal, ...(metode ? { metode } : {}) }),
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) throw new Error(data?.message ?? "Setoran gagal.");
    return data as Transaksi;
}

/** POST /transaksi/tarik */
export async function tarik(
    tabunganId: string,
    nominal: number,
    metode?: Metode,
): Promise<Transaksi> {
    const res = await authFetch("/transaksi/tarik", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tabunganId, nominal, ...(metode ? { metode } : {}) }),
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) throw new Error(data?.message ?? "Penarikan gagal.");
    return data as Transaksi;
}

/** POST /transaksi/setor-qris/:id — idempoten (min Rp 100.000). */
export async function setorQris(
    tabunganId: string,
    nominal: number,
    qrisStatus?: "SUCCESS" | "INSUFFICIENT_FUNDS",
): Promise<QrisResult> {
    const key =
        typeof crypto !== "undefined" && "randomUUID" in crypto
            ? crypto.randomUUID()
            : `qris-${getNasabahId() ?? "anon"}-${tabunganId}-${nominal}`;
    const res = await authFetch(`/transaksi/setor-qris/${tabunganId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Idempotency-Key": key },
        body: JSON.stringify({ nominal, ...(qrisStatus ? { qrisStatus } : {}) }),
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) throw new Error(data?.message ?? "Setoran QRIS gagal.");
    return data as QrisResult;
}

/** PATCH /nasabah/:id — perbarui data profil (nama/email/nomorHp). */
export async function updateProfil(
    nasabahId: string,
    input: { nama?: string; email?: string; nomorHp?: string },
): Promise<Me> {
    const res = await authFetch(`/nasabah/${nasabahId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) {
        const detail =
            data?.details && typeof data.details === "object"
                ? Object.values(data.details).flat().join(" ")
                : null;
        throw new Error(detail ?? data?.message ?? "Gagal memperbarui profil.");
    }
    return data as Me;
}

/** GET /laporan/transaksi-bulanan — unduh CSV bulanan (memicu download di browser). */
export async function downloadLaporan(bulan: number, tahun: number): Promise<void> {
    const res = await authFetch(`/laporan/transaksi-bulanan?bulan=${bulan}&tahun=${tahun}`);
    if (!res.ok) throw new Error("Gagal mengunduh laporan.");
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `laporan-transaksi-${tahun}-${String(bulan).padStart(2, "0")}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
}

/** POST /auth/logout — best-effort; sesi lokal tetap dibersihkan apa pun hasilnya. */
export async function logout(): Promise<void> {
    try {
        await authFetch("/auth/logout", { method: "POST" });
    } catch {
        /* abaikan — yang penting sesi lokal dibersihkan oleh pemanggil */
    } finally {
        clearSession();
    }
}
