# Caduceus ⚕️

**Open-source Obsidian-like Knowledge Graph, Memory Explorer & Mission Control for Hermes Agent.**

Caduceus adalah antarmuka web modern berbasis *Soft-Depth Design System* untuk memantau, mengeksplorasi, dan mengorkestrasi ekosistem [Hermes Agent](https://github.com/NousResearch/hermes-agent).

---

## ✨ Fitur Utama

- 🧠 **Memory Corpus & Vector Explorer (LTM):** Telusuri memori jangka panjang agent berbasis PostgreSQL (`pgvector`), filter berdasarkan scope, kind, dan audience.
- 🕸️ **Interactive 2D/3D Knowledge Graph:** Visualisasi hubungan antar entitas dan memori ala Obsidian graph view dengan force-directed physics.
- 📋 **Multi-Agent Kanban Pipeline:** Pantau siklus tugas, backlog, in-progress, dan stage autonomous workflow.
- 🤖 **Subagent Live Tracking & Console Logs:** Live telemetry untuk delegasi subagent (`delegate_task`), worker PID, and terminal transcript viewer.
- 🛡️ **Audit Logs & Health Watchdog:** Pantau rekonsiliasi state, embedding coverage, dan log operasional secara realtime.
- 🎨 **Soft-Depth Modern UI:** Desain elevasi nyata, dark/light theme, ramah mobile dan desktop.

---

## 🚀 Quick Start

### 1. Prasyarat
- Node.js 20+ atau [Bun](https://bun.sh)
- PostgreSQL dengan ekstensi `pgvector`
- [Hermes Agent](https://github.com/NousResearch/hermes-agent)

### 2. Setup Lingkungan
Salin file environment:
```bash
cp .env.example .env
```

Sesuaikan variabel di `.env`:
```env
VANIA_DATABASE_URL=postgresql://user:password@localhost:5432/db_vania
AUTH_USERNAME=admin
AUTH_PASSWORD=your_password
JWT_SECRET=your_jwt_secret_key
```

### 3. Install & Jalankan
Menggunakan Bun:
```bash
bun install
bun run dev
```

Buka `http://localhost:3000` di browser.

---

## 🐳 Docker Deployment

Tersedia Dockerfile multi-stage siap pakai untuk deployment di Docker / Dokploy:
```bash
docker build -t caduceus .
docker run -p 3000:3000 --env-file .env caduceus
```

---

## 📜 Lisensi
MIT License © 2026 Fakhri & Vania
