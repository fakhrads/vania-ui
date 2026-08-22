# Brief desain — vania-ui

Dokumen ini konteks buat **Claude Design**. Tujuannya satu: ngerombak bahasa visual vania-ui dari glassmorphism sekarang jadi **soft-depth**, sekaligus nambah **tema terang + gelap**.

Semua data, angka, dan teks di bawah diambil dari aplikasi beneran — pakai itu di mockup, jangan lorem ipsum.

---

## 1. Produknya apa

**Fakhri's Agentic Memory** — dasbor **baca-saja** buat mantau memori & aktivitas Vania, agent pribadinya Fakhri. Bukan admin panel: gak ada tombol simpan, hapus, atau edit di mana pun. Setiap layar itu bacaan.

- **Penggunanya satu orang**, Fakhri. Gak ada onboarding, gak ada empty state buat pengguna baru, gak ada tur fitur.
- **Dibiarkan kebuka berjam-jam** di tab belakang, di-glance sesekali. Ini nyetir banyak keputusan di bawah.
- **Dipakai di desktop dan HP.** Mobile bukan pikiran belakangan — Fakhri sering ngecek dari HP.
- Bahasa UI: **Indonesia**. Label navigasi sekarang: Kesehatan, Korpus, Graph, Audit, Cari, Inbox, Observasi.

## 2. Mandat

**Dari:** panel kaca tembus pandang (`backdrop-filter: blur(20px)`), di atas latar mesh gradient sky/violet/emerald, plus dot-grid, sudut `rounded-3xl`, palet zinc.

**Ke:** **soft-depth** — permukaan **solid** (nol transparansi, nol blur), elevasi beneran lewat bayangan berlapis, kartu yang kerasa empuk dan bisa dipegang. Hierarki dibentuk sama ketinggian permukaan, bukan sama opasitas.

Plus: **tema terang dan gelap, dua-duanya penuh, dengan toggle.** Sekarang gelap-doang dan di-hardcode.

Yang harus mati:
- `.glass` dan `.glass-hover` — gradien putih transparan + `backdrop-filter`.
- `.mesh-bg` — gradien radial sky/violet/emerald + dot overlay.
- `.graph-dots` — dot-grid di panel graph.
- Semua `bg-white/[0.04]`, `border-white/10`, dan sodaranya yang nempel di seluruh komponen. Di tema terang mereka gak ada artinya.

## 3. Yang wajib selamat

Ini bukan preferensi, ini hasil dari cara alat ini dipakai:

- **Hemat GPU.** Latar sekarang sengaja statis, komentarnya masih ada di CSS: dasbor ini kebuka berjam-jam. Bayangan boleh berlapis, tapi jangan ada yang beranimasi terus-terusan. Satu-satunya animasi loop yang dibolehin: `.live-dot` (pulse 2.4s) sebagai penanda data live.
- **`prefers-reduced-motion: reduce`** udah dihormati. Pertahankan.
- **Angka pakai `tabular-nums`** (`.num`). Angka di dasbor ini berdetak tiap 5 detik — tanpa itu layout-nya goyang tiap update.
- **Semantik status berwarna.** Ada sistem `Tone` empat nilai yang dipakai di semua layar: `ok` (emerald), `warn` (amber), `bad` (rose), `idle` (zinc). Warnanya boleh diganti, tapi **empat tingkat itu harus tetap kebedain sekilas, di dua tema, dan buat mata yang susah bedain merah-hijau.** Jangan andelin hue doang.
- **Kepadatan tabel.** Halaman Audit, Korpus, Inbox, Observasi itu tabel panjang berpaginasi. Soft-depth gampang bikin melar — jangan sampai baris per layar turun banyak dari sekarang.
- **Navigasi mobile.** Sekarang: top-bar nempel + drawer geser dari kiri. Bug "navigasi gak bisa dipakai di mobile" udah pernah kejadian dan diperbaiki; jangan diulang.

## 4. Layar yang perlu didesain

Tujuh layar aplikasi + satu login. Prioritas mockup sesuai urutan ini:

| # | Rute | Isinya |
|---|---|---|
| 1 | `/` **Kesehatan** | Layar utama. Verdict rekonsiliasi, sebaran korpus, ops 24 jam, timeline aktivitas per jam, lag, coverage embedding, 12 operasi terakhir |
| 2 | `/graph` **Graph** | Force-directed graph di **canvas** — entri memori ↔ entitas. Ada panel detail, pencarian, tombol fokus |
| 3 | `/ltm` **Korpus** | Tabel `vania_ltm` berpaginasi, filter kind/scope + pencarian teks |
| 4 | `/ops` **Audit** | Tabel audit log, 30 baris per halaman |
| 5 | `/search` **Cari** | Satu kotak pencarian → hasil terkelompok tiga sumber |
| 6 | `/inbox`, `/observations` | Dua tabel berpaginasi lagi, pola sama kayak Korpus |
| 7 | `/login` | Satu form, dua field |

Ditambah **gerbang auth** — layar tunggu bergaya yang muncul sebelum sesi kevalidasi ("Memeriksa sesi…" / "Mengarahkan ke masuk…"). Ini kelihatan di tiap page load, jadi bukan detail sepele.

## 5. Data beneran buat mockup

**Verdict kesehatan:** `ok` boolean, sisi A vs sisi B (`a_count` / `b_count` — dua penghitung yang harusnya cocok), `writes7d`, `reads7d`, array `alarms`, array `rooms` (tiap room: `file`, `scope`, `file_rows`, `db_rows`).

**Korpus** — dikelompokin scope × kind × audience:
- scope: `fakhri`, `abiane`
- kind: `seed`, `active`, `evicted`, `archive`
- Warna kind yang dipakai sekarang (di graph): seed `#38bdf8` biru, active `#34d399` hijau, evicted `#fbbf24` amber, archive `#71717a` abu, entitas `#a78bfa` ungu.

**Contoh baris audit** (`vania_ltm_ops`): `id`, `ts`, `action` (`recall` / `write` / `evict`), `target`, `status` (`ok` / `skip` / `error`), `error_msg`, `source`, `scope`, `rows_added`, `rows_evicted`.

**Coverage:** `total` / `embedded` / `empty`. Baris tanpa embedding gak bisa dicari sama sekali — itu kenapa angkanya ditampilin. Kalau `empty > 0`, itu kondisi yang perlu keliatan.

**Lag** ditampilkan pakai formatter Indonesia: `"12 dtk lalu"`, `"5 mnt lalu"`, `"3 jam lalu"`, `"2 hari lalu"`, atau `"—"` kalau null.

**Entitas di graph** (daftar tetap, ini isi aslinya): Abiane, Fakhri, Embermourn, Zerodays, FitHub Kota Wisata, Dokploy, Cloudflare, FakhriPOS, Astra Honda Motor, Istidata, Joss Way-ar, Gawin, Vania UI, WhatsApp, Helix, NixOS, Debian, IHSG, Vania, ABIANE.md, MEMORY.md.

Isi entri memori itu kalimat Indonesia sehari-hari, biasanya satu-dua kalimat, dipotong ~70 karakter buat label node. Contoh nada: *"Fakhri lagi ngerjain FakhriPOS, target rilis akhir bulan."*

## 6. Batasan teknis

Desainnya harus bisa dibangun di stack yang ada — **tanpa dependensi baru**:

- **Tailwind v4**, `@import "tailwindcss"`, **gak ada `tailwind.config.js`**. Token didefinisikan sebagai CSS custom property di `src/app/globals.css` lewat `@theme inline`, dan warnanya ditulis dalam **oklch**. Palet baru harus keluar dalam bentuk itu.
- **shadcn style `base-nova`** + `@base-ui/react`. Primitif yang udah kepakai: avatar, badge, button, card, dialog, dropdown-menu, input, separator, sheet, table, tabs, tooltip. Desain baru sebaiknya bisa diwujudkan dengan re-token + restyle primitif ini, bukan ganti library.
- **Ikon: lucide-react.** Yang kepakai di navigasi: Activity, Brain, Share2, ClipboardList, Search, Mail, Eye, LogOut, ShieldCheck, Menu, X.
- **Font sekarang Noto Sans** via `next/font/google`. Boleh diganti — tapi harus ada di Google Fonts, dan tetap satu keluarga plus (opsional) satu mono buat angka/ID.
- **Grafik pakai recharts**, dan token `--chart-1` … `--chart-5` sekarang **grayscale semua** — praktis belum dipakai serius. Ini kesempatan bikin skala chart beneran, buat dua tema.

### Jebakan tema terang

Dua hal yang bakal gigit dan perlu jawaban eksplisit di desain:

1. **`layout.tsx` nge-hardcode `<html className="dark">`.** Toggle berarti itu harus jadi state, plus keputusan soal preferensi sistem dan flash saat load pertama. Tentuin: default ikut OS, atau default gelap?
2. **Graph digambar di canvas, warnanya hardcoded di JS** — ada belasan nilai di `src/app/graph/page.tsx` yang mengasumsikan latar gelap: label `#e4e4e7`, latar pil label `rgba(8,8,11,0.72)`, garis `rgba(255,255,255,0.12)`, sorotan `rgba(255,255,255,0.9)`, ring node `#fff`. Canvas gak bisa baca CSS variable — **brief-nya harus nyebut dua set nilai eksplisit, terang dan gelap**, buat: warna node per kind, warna entitas, garis biasa, garis tersorot, garis teredam, teks label, latar pil label, ring node terpilih, dan latar canvas.

## 7. Deliverable

Satu kanvas, artboard-nya:

1. **Fondasi** — palet terang & gelap berdampingan (nilai oklch), skala elevasi (berapa tingkat, bayangan tiap tingkat, permukaan mana di tingkat mana), skala radius, skala tipografi, empat `Tone` di dua tema.
2. **Kesehatan** — desktop, terang dan gelap.
3. **Kesehatan** — mobile.
4. **Graph** — panel canvas + panel detail, plus swatch warna canvas eksplisit buat dua tema.
5. **Satu layar tabel** (Audit atau Korpus) — nunjukin gimana soft-depth ketemu baris padat, desktop + mobile.
6. **Cari** + **Login** + **gerbang auth**.
7. **Komponen** — kartu stat, pill status, dot status, bar sebaran, baris tabel, kontrol paginasi, sidebar (desktop + drawer mobile), toggle tema.

## 8. Bukan tujuan

- **Jangan** nambah fitur, halaman, atau apa pun yang nulis ke data. Baca-saja itu keputusan sadar, bukan keterbatasan yang nunggu diperbaiki.
- **Jangan** desain buat multi-user: gak ada avatar tim, gak ada permission, gak ada berbagi.
- **Jangan** desain empty state buat "belum ada data". Sistemnya udah jalan dan penuh; yang relevan justru **state salah** — verdict gak cocok, ops error, baris tanpa embedding.
- **Jangan** ganti struktur informasi. Yang dirombak bahasa visualnya. Kalau ada usulan menata ulang isi layar, tulis sebagai catatan terpisah, jangan diam-diam dieksekusi di mockup.
