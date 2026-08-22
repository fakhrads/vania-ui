<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## graphify

This project has a knowledge graph at graphify-out/ with god nodes, community structure, and cross-file relationships.

When the user types `/graphify`, use the installed graphify skill or instructions before doing anything else.

Rules:
- For codebase questions, first run `graphify query "<question>"` when graphify-out/graph.json exists. Use `graphify path "<A>" "<B>"` for relationships and `graphify explain "<concept>"` for focused concepts. These return a scoped subgraph, usually much smaller than GRAPH_REPORT.md or raw grep output.
- Dirty graphify-out/ files are expected after hooks or incremental updates; dirty graph files are not a reason to skip graphify. Only skip graphify if the task is about stale or incorrect graph output, or the user explicitly says not to use it.
- If graphify-out/wiki/index.md exists, use it for broad navigation instead of raw source browsing.
- Read graphify-out/GRAPH_REPORT.md only for broad architecture review or when query/path/explain do not surface enough context.
- After modifying code, run `graphify update .` to keep the graph current (AST-only, no API cost).

## Konteks proyek — vania-ui

**Apa ini:** dasbor web **baca-saja** buat memantau memori & aktivitas Vania (agent Hermes-nya Fakhri). Nama tampilan: *Fakhri's Agentic Memory*. Bukan admin panel — **tidak ada** endpoint tulis/hapus ke DB; semua route API cuma `SELECT`. Kalau diminta nambah fitur yang nulis ke `vania_*`, konfirmasi dulu ke Fakhri: itu ngelanggar posisi baca-saja yang dipilih di commit `1451970`.

**Stack:** Next.js 16.3.1 (App Router, RSC) · React 19.2 · TypeScript · Tailwind v4 (`@import "tailwindcss"`, tanpa `tailwind.config`) · shadcn style `base-nova` + `@base-ui/react` · lucide-react · recharts · react-force-graph-2d · `pg` (PostgreSQL + pgvector). Package manager **bun** (`bun.lock`); Dockerfile juga pakai bun buat build.

Perintah: `bun run dev` · `bun run build` · `bun run lint` · `bun run typecheck` (`tsc --noEmit`).

### Arsitektur

- **Data source:** satu Postgres remote (`VANIA_DATABASE_URL`), diakses lewat pool di `src/lib/db.ts` (`query` / `queryOne`, max 5 koneksi). Tabel yang dipakai: `vania_ltm` (korpus memori + kolom `embedding`), `vania_ltm_ops` (audit log operasi), `vania_health` (verdict watchdog), `vania_inbox_legacy`, `vania_obs_active`. Cek skema cepat: `node _schema.mjs` (baca `.env` langsung, bukan lewat Next).
- **Auth:** single-user JWT HS256 via `jose`, berlaku 7 hari. Kredensial dari `AUTH_USERNAME`/`AUTH_PASSWORD`, token ditandatangani `JWT_SECRET` — semuanya di `.env` (gitignored; `.env*` diabaikan). Token disimpan di `localStorage` key `vn_token`.
  - Sisi klien: `AuthProvider` (`src/lib/auth-context.tsx`) + `authFetch` (`src/lib/auth-fetch.ts`, auto-attach Bearer, auto-logout + redirect `/login` kalau 401).
  - Sisi server: setiap route wajib mulai dengan `const auth = await requireAuth(req); if (auth.error) return auth.error;` (`src/lib/api-guard.ts`). Jangan bikin route API tanpa ini.
  - Sisi halaman: bungkus isi halaman dengan `<Guard>` (`src/components/guard.tsx`) — gerbang seragam, jangan balik ke pola tiap-halaman-urus-sendiri (bikin kedip putih; itu yang diperbaiki di `ccb976f`).
- **Semua route API** `export const dynamic = "force-dynamic"` dan cuma GET, kecuali `/api/auth` dan `/api/search` yang POST.
- **Polling:** hook `useLive<T>(url, ms)` di `src/components/monitor.tsx` — sadar-visibilitas, berhenti nembak DB saat tab tersembunyi. Dasbor sering dibiarkan kebuka berjam-jam, jadi jangan ganti ke `setInterval` polos.

### Halaman ↔ endpoint

| Rute | Endpoint | Isi |
|---|---|---|
| `/` Kesehatan | `/api/health` | verdict rekonsiliasi, korpus per scope/kind, ops 24 jam, timeline per jam, lag, coverage embedding |
| `/ltm` Korpus | `/api/ltm` | daftar `vania_ltm`, filter `kind`/`scope`/`q`, paginasi |
| `/graph` Graph | `/api/graph` | force-directed entri ↔ entitas, ala Obsidian |
| `/ops` Audit | `/api/ops` | audit log `vania_ltm_ops` |
| `/search` Cari | `/api/search` (POST) | ILIKE lintas inbox + observasi + ltm |
| `/inbox` | `/api/inbox` | `vania_inbox_legacy` |
| `/observations` | `/api/observations` | `vania_obs_active`, filter status pending/confirmed/contradicted |
| `/login` | `/api/auth` | form masuk |

Navigasi di `src/components/sidebar.tsx` — desktop sidebar tetap, mobile top-bar + drawer. Nambah halaman = tambah entri di array `links` situ juga.

### Hal yang gampang kejeblos

- **Daftar `ENTITIES` di `src/app/api/graph/route.ts` adalah kembaran persis** dari `ENTITIES` di `~/.hermes/scripts/vania-obsidian-export.py`. Nambah konsep baru harus di **dua tempat**, biar linking graph konsisten sama vault Obsidian.
- **Posisi node graph dipersist ke `localStorage`** per browser, dan update graph itu **incremental** — objek node lama di-`Object.assign` supaya `x/y/fx/fy` gak keinjek data baru (`fd4abb2`, `63183ea`). Jangan ganti ke rebuild total tiap poll.
- Graph pernah crash saat `x/y` node belum finite di frame pertama (`01a1414`) — jaga guard-nya kalau nyentuh render canvas.
- `ForceGraph2D` di-import `next/dynamic` dengan `ssr: false`. Wajib, dia butuh `window`.
- **Sisi A rekonsiliasi gak bisa dihitung dari sini.** `state.db` cuma ada di mesin Hermes (`~/.hermes/state.db`), app ini jalan di container. Yang ngitung: `~/.hermes/plugins/vania-memory/reconcile.py` (dipanggil `~/.hermes/scripts/vania-reconcile.sh` sebagai watchdog harian), hasilnya ditulis ke tabel `vania_health` — `/api/health` cuma **membaca** verdict itu.
- Baris `vania_ltm` tanpa `embedding` gak bisa dicari sama sekali; `/api/health` sengaja ngelaporin `coverage.embedded` buat itu.

### Konvensi

- **Bahasa Indonesia** buat UI, komentar kode, dan pesan commit (`feat:`/`fix:` + deskripsi Indonesia). Ikutin gaya yang udah ada.
- Komentar kode di repo ini menjelaskan **kenapa**, sering nyebut gejala yang diperbaiki. Pertahankan pola itu, jangan komentar yang cuma ngulang kode.
- Tema **gelap saja** — `<html className="dark">` di-hardcode di `layout.tsx`, gak ada toggle. Font Noto Sans via `next/font/google`.
- Bahasa visual: kelas kustom `.glass`, `.mesh-bg`, `.graph-dots`, `.live-dot` di `src/app/globals.css`; sudut `rounded-2xl`/`rounded-3xl`; palet zinc + aksen sky/violet; status pakai `Tone` (`ok` emerald / `warn` amber / `bad` rose / `idle` zinc) dari `monitor.tsx` — pakai `StatusDot`/`Pill`/`Stat`/`Bars` dari situ, jangan bikin warna status sendiri.
- Primitif shadcn ada di `src/components/ui/`; alias path `@/*` → `src/*`.

### Deploy

`output: "standalone"` + `Dockerfile` multi-stage (node:20-alpine, build pakai bun, runtime `node server.js`, port 3000). Dideploy lewat **Dokploy** — Dockerfile dipilih karena nixpacks-nya kepaksa Node 18 EOL (`5020189`). Env yang wajib ada di runtime: `VANIA_DATABASE_URL`, `JWT_SECRET`, `AUTH_USERNAME`, `AUTH_PASSWORD`.
