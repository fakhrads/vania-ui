import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/api-guard";
import { query } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * Data "AI town" — penduduk, jalan antar rumah, dan denyut aktivitas.
 *
 * Tiga sumber, masing-masing menjawab pertanyaan berbeda:
 *   vania_handoffs      -> siapa mengoper ke siapa (JALAN), dan mana yang belum balik
 *   vania_kanban_tasks  -> siapa lagi pegang apa (KEGIATAN)
 *   vania_subagents     -> denyut delegasi terakhir (RIWAYAT)
 *
 * Handoff dengan replied_at NULL adalah inti diagnosanya: pesan berangkat tapi
 * hasilnya tidak pernah kembali. Di kota, itu penduduk yang berjalan ke rumah
 * orang lain dan tidak pernah pulang.
 */

// Peran diambil dari SOUL.md "Tim gue". Agen di luar daftar tetap muncul —
// roster ini cuma memberi label, bukan menyaring.
const PERAN: Record<string, string> = {
  vania: "Pintu masuk",
  yuma: "Tech Lead",
  flynn: "Backend",
  luna: "Frontend & UI/UX",
  stellar: "DevOps / SRE",
  arlo: "Analyst",
  vera: "QA",
  "kanban-worker": "Worker",
};

const AKTIF = new Set(["running", "in_progress", "claimed", "doing"]);

function detik(v: unknown): number | null {
  const n = typeof v === "string" ? parseFloat(v) : (v as number);
  return Number.isFinite(n) ? (n as number) : null;
}

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if (auth.error) return auth.error;

  try {
    const [handoffs, tasks, delegasi] = await Promise.all([
      query(
        `SELECT from_agent, to_agent, sent_at, replied_at, send_ok, send_error,
                left(coalesce(message,''), 160) AS message,
                left(coalesce(reply_excerpt,''), 160) AS reply_excerpt
           FROM vania_handoffs
          ORDER BY sent_at DESC
          LIMIT 500`
      ),
      query(
        `SELECT id, title, assignee, status, created_by, created_at, started_at, completed_at
           FROM vania_kanban_tasks
          ORDER BY created_at DESC
          LIMIT 200`
      ),
      query(
        `SELECT coalesce(nullif(profile,''),'vania') AS profile, state,
                dispatched_at, completed_at
           FROM vania_subagents
          ORDER BY dispatched_at DESC NULLS LAST
          LIMIT 200`
      ),
    ]);

    const now = Date.now() / 1000;

    // --- penduduk ---
    type Warga = {
      id: string; peran: string; status: "kerja" | "diam";
      tugas: string | null; tugasTerbuka: number;
      kirim: number; terima: number; menggantung: number;
      delegasiAktif: number;
    };
    const warga = new Map<string, Warga>();
    const pastikan = (idMentah: string | null): Warga | null => {
      const id = (idMentah || "").trim().toLowerCase();
      if (!id) return null;
      if (!warga.has(id)) {
        warga.set(id, {
          id, peran: PERAN[id] ?? "—", status: "diam", tugas: null,
          tugasTerbuka: 0, kirim: 0, terima: 0, menggantung: 0, delegasiAktif: 0,
        });
      }
      return warga.get(id)!;
    };
    // roster selalu hadir walau belum ada aktivitas — kota kosong tetap kota.
    Object.keys(PERAN).forEach((k) => pastikan(k));

    // --- jalan antar rumah ---
    const jalanKey = (a: string, b: string) => `${a}->${b}`;
    const jalan = new Map<string, {
      from: string; to: string; total: number; menggantung: number;
      gagal: number; balasDetik: number[];
    }>();

    for (const h of handoffs.rows as any[]) {
      const dari = pastikan(h.from_agent);
      const ke = pastikan(h.to_agent);
      if (!dari || !ke) continue;
      dari.kirim++;
      ke.terima++;
      const k = jalanKey(dari.id, ke.id);
      if (!jalan.has(k))
        jalan.set(k, { from: dari.id, to: ke.id, total: 0, menggantung: 0, gagal: 0, balasDetik: [] });
      const j = jalan.get(k)!;
      j.total++;
      if (h.send_ok === 0) j.gagal++;
      const kirimAt = detik(h.sent_at);
      const balasAt = detik(h.replied_at);
      if (h.send_ok !== 0 && balasAt === null) {
        j.menggantung++;
        dari.menggantung++;
      } else if (kirimAt !== null && balasAt !== null) {
        j.balasDetik.push(balasAt - kirimAt);
      }
    }

    // --- kegiatan dari kanban ---
    for (const t of tasks.rows as any[]) {
      const w = pastikan(t.assignee);
      if (!w) continue;
      const selesai = t.completed_at !== null && t.completed_at !== undefined;
      if (selesai) continue;
      w.tugasTerbuka++;
      if (AKTIF.has(String(t.status || "").toLowerCase()) || t.started_at) {
        w.status = "kerja";
        if (!w.tugas) w.tugas = t.title;
      } else if (!w.tugas) {
        w.tugas = t.title;
      }
    }

    // --- delegasi yang masih jalan ---
    for (const d of delegasi.rows as any[]) {
      const w = pastikan(d.profile);
      if (!w) continue;
      if (AKTIF.has(String(d.state || "").toLowerCase())) {
        w.delegasiAktif++;
        w.status = "kerja";
      }
    }

    // --- denyut aktivitas ---
    const aktivitas = (handoffs.rows as any[])
      .slice(0, 40)
      .map((h) => {
        const kirimAt = detik(h.sent_at);
        const balasAt = detik(h.replied_at);
        return {
          at: kirimAt,
          from: String(h.from_agent || "").toLowerCase(),
          to: String(h.to_agent || "").toLowerCase(),
          text: h.message || "",
          balas: h.reply_excerpt || null,
          status: h.send_ok === 0 ? "gagal" : balasAt === null ? "menggantung" : "selesai",
          lamaDetik: kirimAt !== null && balasAt !== null ? balasAt - kirimAt : null,
        };
      });

    const menggantung = (handoffs.rows as any[]).filter(
      (h) => h.send_ok !== 0 && detik(h.replied_at) === null
    );
    const tertua = menggantung.reduce((acc: number, h: any) => {
      const t = detik(h.sent_at);
      return t === null ? acc : Math.max(acc, now - t);
    }, 0);

    return NextResponse.json({
      ok: true,
      now,
      residents: [...warga.values()].sort((a, b) =>
        a.id === "vania" ? -1 : b.id === "vania" ? 1 : a.id.localeCompare(b.id)
      ),
      roads: [...jalan.values()].map((j) => ({
        from: j.from,
        to: j.to,
        total: j.total,
        pending: j.menggantung,
        failed: j.gagal,
        avgReplySec: j.balasDetik.length
          ? j.balasDetik.reduce((a, b) => a + b, 0) / j.balasDetik.length
          : null,
      })),
      activity: aktivitas,
      stats: {
        residents: warga.size,
        roads: jalan.size,
        handoffs: handoffs.rows.length,
        pending: menggantung.length,
        oldestPendingSec: tertua || null,
      },
    });
  } catch (err: any) {
    console.error("Error fetching town:", err);
    return NextResponse.json(
      { ok: false, error: err.message || "Failed to fetch town data" },
      { status: 500 }
    );
  }
}
