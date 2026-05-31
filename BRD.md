# BRD (Turunan) — BSI Tabungan Haji

> Dokumen ini **diturunkan dari logika backend** (`BOOTCAMP_TABUNGAN-HAJI/src/modules/*`
> dan `prisma/schema.prisma`), bukan dari dokumen formal. Tujuannya menjadi acuan
> requirement untuk halaman frontend.

## 1. Entitas & Data

| Entitas | Field penting | Aturan |
|---|---|---|
| **Nasabah** | `nik` (16 digit, unik), `nama`, `email` (unik), `nomorHp`, `password` | Registrasi mandiri (publik). |
| **TabunganHaji** | `nomorRekening` (`THJ` + 13 digit, unik), `saldo` (BigInt), `status`, `dibukaAt` | Satu nasabah bisa punya banyak rekening. |
| **Transaksi** | `jenis` (SETOR/TARIK), `nominal`, `saldoSebelum`, `saldoSesudah`, `referensi` (unik), `metode`, `waktu` | Saldo serial sebagai **string** di API (BigInt). |

`status` rekening: **AKTIF | TUTUP | BEKU**. Hanya **AKTIF** yang boleh bertransaksi.
`metode`: **TUNAI | TRANSFER | VIRTUAL_ACCOUNT | QRIS**.

## 2. Aturan Bisnis per Fitur

### Buka Rekening — `POST /tabungan`
- `setoranAwal` opsional, bilangan bulat ≥ 0.
- Pembukaan + transaksi setoran awal (metode TUNAI) bersifat **atomik**.

### Setor — `POST /transaksi/setor`
- `nominal` bilangan bulat **> 0**.
- Rekening harus ada & berstatus **AKTIF** (kalau tidak → error).

### Setor QRIS — `POST /transaksi/setor-qris/:id`
- `nominal` minimal **Rp 100.000**.
- **Idempoten** lewat header `Idempotency-Key`; replay key+body sama → kembalikan transaksi asli; key sama body beda → konflik.

### Tarik — `POST /transaksi/tarik`
- `nominal` bilangan bulat **> 0**.
- Rekening **AKTIF**; saldo **tidak boleh menjadi negatif** (saldo harus mencukupi).

### Estimasi Haji — `GET /tabungan/:id/estimasi-haji`
- Batas minimal porsi: **Rp 25.000.000** (env `HAJI_BATAS_PORSI`).
- Kuota nasional/tahun: **221.000** (env `HAJI_KUOTA_PER_TAHUN`).
- `saldo < batas` → **BELUM_PORSI** (+ kekurangan).
- `saldo ≥ batas` → **DAPAT_PORSI**: `nomorPorsi` = urutan antre (jumlah rekening yang
  sudah ≥ batas & dibuka pada/sebelum rekening ini), `masaTunggu = ceil(nomorPorsi/kuota)`,
  `estimasiTahunBerangkat = tahunSekarang + masaTunggu`.

### Laporan Bulanan — `GET /laporan/transaksi-bulanan?bulan=&tahun=`
- `bulan` 1–12, `tahun` 2000–2100.
- Mengembalikan **CSV** seluruh transaksi pada bulan/tahun tsb, **lintas semua rekening**.
- Batas bulan memakai waktu lokal server (WIB).

## 3. Layar Frontend (scope saat ini)

| Layar | Route | Desain Stitch | Endpoint |
|---|---|---|---|
| Daftar Rekening | `/rekening` | — (design system) | `getMe()` |
| Buka Rekening | `/rekening/baru` | — | `openRekening()` |
| Mutasi Rekening | `/rekening/[id]/mutasi` | `referensi/mutasi.html` | `getMutasi()` |
| Setor Dana | `/transaksi/setor` | `referensi/setorTunai.html` | `setor()` / `setorQris()` |
| Tarik Dana | `/transaksi/tarik` | `referensi/tarikTunai.html` | `tarik()` |
| Laporan | `/laporan` | — | `downloadLaporan()` |

> Di luar scope: Pengaturan & Bantuan.
</content>
</invoke>
