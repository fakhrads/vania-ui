"use client";

import { Sidebar } from "@/components/sidebar";
import { Guard } from "@/components/guard";
import {
  Glass, Stat, Pill, StatusDot, Bars, useLive, ago, type Tone,
} from "@/components/monitor";

type Health = {
  checkedAt: string;
  verdict: {
    ok: boolean; a: number; b: number; writes7d: number; reads7d: number;
    alarms: string[];
    rooms: { file: string; scope: string; file_rows: number; db_rows: number }[];
    at: string; windowStart: string;
  } | null;
  corpus: { scope: string; kind: string; audience: string; n: number }[];
  ops24: { errors: number; skips: number };
  timeline: { bucket: string; reads: number; writes: number }[];
  recent: {
    id: number; ts: string; action: string; target: string; status: string;
    error_msg: string | null; source: string; scope: string;
    rows_added: number; rows_evicted: number;
  }[];
  lag: { sinceLastOp: number | null; sinceLastCheck: number | null };
  coverage: { total: number; embedded: number; empty: number };
};

const KIND_TONE: Record<string, string> = {
  seed: "text-sky-300 border-sky-400/25 bg-sky-400/10",
  active: "text-emerald-300 border-emerald-400/25 bg-emerald-400/10",
  archive: "text-zinc-400 border-white/10 bg-white/5",
  evicted: "text-amber-300 border-amber-400/25 bg-amber-400/10",
};

export default function Dashboard() {
  const { data, err, at } = useLive<Health>("/api/health", 5000);
  const v = data?.verdict ?? null;

  const healthy = v?.ok === true && (data?.ops24.errors ?? 0) === 0;
  const tone: Tone = !data ? "idle" : healthy ? "ok" : v?.ok === false ? "bad" : "warn";

  const byKind = new Map<string, number>();
  const byAudience = new Map<string, number>();
  for (const r of data?.corpus ?? []) {
    byKind.set(r.kind, (byKind.get(r.kind) ?? 0) + r.n);
    byAudience.set(r.audience, (byAudience.get(r.audience) ?? 0) + r.n);
  }
  const total = data?.coverage.total ?? 0;

  const bars = (data?.timeline ?? []).map((t) => ({
    label: new Date(t.bucket).getHours().toString().padStart(2, "0") + ":00",
    a: t.reads,
    b: t.writes,
  }));

  return (
    <Guard>
    <div className="flex flex-col min-h-screen lg:flex-row">
      <div className="mesh-bg" />
      <Sidebar />

      <main className="flex-1 overflow-y-auto px-6 py-8 lg:px-10">
        <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-zinc-100">
              Kesehatan Memori
            </h1>
            <p className="mt-1 text-sm text-zinc-500">
              Pemantauan <span className="font-mono text-zinc-400">db_vania</span> · pgvector
            </p>
          </div>
          <div className="flex items-center gap-3">
            {err ? (
              <Pill tone="bad">gagal memuat — {err}</Pill>
            ) : (
              <Pill tone={tone}>
                <StatusDot tone={tone} live />
                {at ? `diperbarui ${at.toLocaleTimeString("id-ID")}` : "menghubungkan…"}
              </Pill>
            )}
          </div>
        </header>

        {/* Vonis rekonsiliasi — sinyal paling penting */}
        <Glass className="mb-6 overflow-hidden p-0">
          <div className="flex flex-wrap items-center gap-x-8 gap-y-4 p-6">
            <div className="flex items-center gap-3">
              <StatusDot tone={tone} live />
              <div>
                <div className="text-lg font-semibold text-zinc-100">
                  {!data ? "Memeriksa…" : healthy ? "Sehat" : "Perlu perhatian"}
                </div>
                <div className="text-xs text-zinc-500">
                  Rekonsiliasi terakhir {ago(data?.lag.sinceLastCheck)}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-6 border-white/10 sm:border-l sm:pl-8">
              <div>
                <div className="text-[11px] uppercase tracking-widest text-zinc-500">A · state.db</div>
                <div className="num text-2xl font-semibold text-zinc-200">{v?.a ?? "—"}</div>
              </div>
              <div className="text-xl text-zinc-600">
                {v ? (v.a === v.b ? "=" : "≠") : "·"}
              </div>
              <div>
                <div className="text-[11px] uppercase tracking-widest text-zinc-500">B · ltm_ops</div>
                <div className="num text-2xl font-semibold text-zinc-200">{v?.b ?? "—"}</div>
              </div>
            </div>

            <p className="max-w-md text-xs leading-relaxed text-zinc-500">
              A ditulis Hermes, B ditulis plugin. Plugin tidak bisa memalsukan A —
              satu-satunya cek yang tidak bisa berbohong.
            </p>
          </div>

          {v && v.alarms.length > 0 && (
            <div className="border-t border-rose-400/20 bg-rose-500/[0.07] px-6 py-4">
              <div className="mb-2 text-xs font-medium uppercase tracking-widest text-rose-300">
                {v.alarms.length} alarm
              </div>
              <ul className="space-y-1.5">
                {v.alarms.map((a, i) => (
                  <li key={i} className="flex gap-2 text-sm text-rose-200/90">
                    <span className="text-rose-400">•</span>
                    <span>{a}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </Glass>

        {/* Metrik */}
        <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Stat
            label="Baris korpus" tone="idle"
            value={total.toLocaleString("id-ID")}
            sub={`${data?.coverage.embedded ?? 0} ter-embed · ${data?.coverage.empty ?? 0} kosong`}
          />
          <Stat
            label="Tulis · 7 hari" tone={v?.writes7d ? "ok" : "warn"}
            value={v?.writes7d ?? "—"}
            sub={`operasi terakhir ${ago(data?.lag.sinceLastOp)}`}
          />
          <Stat
            label="Baca · 7 hari" tone={v?.reads7d ? "ok" : "idle"}
            value={v?.reads7d ?? "—"}
            sub={v?.reads7d === 0 ? "vania_recall tidak terpakai" : "vania_recall"}
          />
          <Stat
            label="Error · 24 jam"
            tone={(data?.ops24.errors ?? 0) > 0 ? "bad" : "ok"}
            value={data?.ops24.errors ?? "—"}
            sub={`${data?.ops24.skips ?? 0} tulisan transien`}
          />
        </div>

        <div className="mb-6 grid gap-4 lg:grid-cols-3">
          {/* Aktivitas */}
          <Glass className="p-6 lg:col-span-2">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-sm font-medium text-zinc-300">Aktivitas 24 jam</h2>
              <div className="flex items-center gap-4 text-[11px] text-zinc-500">
                <span className="flex items-center gap-1.5">
                  <span className="size-2 rounded-[2px] bg-violet-400/60" /> tulis
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="size-2 rounded-[2px] bg-sky-400/70" /> baca
                </span>
              </div>
            </div>
            {bars.length ? (
              <Bars data={bars} />
            ) : (
              <div className="flex h-24 items-center text-sm text-zinc-600">
                Belum ada aktivitas 24 jam terakhir.
              </div>
            )}
          </Glass>

          {/* Ruangan */}
          <Glass className="p-6">
            <h2 className="mb-4 text-sm font-medium text-zinc-300">Invariant ruangan</h2>
            {v ? (
              v.rooms.length === 0 ? (
                <div className="flex items-center gap-2 text-sm text-emerald-300">
                  <StatusDot tone="ok" /> Semua berkas cocok dengan korpus
                </div>
              ) : (
                <ul className="space-y-3">
                  {v.rooms.map((r, i) => (
                    <li key={i} className="text-sm">
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-xs text-zinc-300">{r.file}</span>
                        <Pill tone="bad">tidak cocok</Pill>
                      </div>
                      <div className="num mt-1 text-xs text-zinc-500">
                        berkas {r.file_rows} · korpus {r.db_rows}
                      </div>
                    </li>
                  ))}
                </ul>
              )
            ) : (
              <div className="text-sm text-zinc-600">—</div>
            )}

            <div className="mt-6 border-t border-white/[0.07] pt-5">
              <h3 className="mb-3 text-[11px] uppercase tracking-widest text-zinc-500">
                Audiens
              </h3>
              <div className="space-y-2">
                {[...byAudience.entries()].map(([a, n]) => (
                  <div key={a} className="flex items-center gap-3">
                    <span className="w-16 text-xs text-zinc-400">{a}</span>
                    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/5">
                      <div
                        className={a === "private" ? "h-full bg-zinc-400/50" : "h-full bg-emerald-400/60"}
                        style={{ width: `${total ? (n / total) * 100 : 0}%` }}
                      />
                    </div>
                    <span className="num w-10 text-right text-xs text-zinc-400">{n}</span>
                  </div>
                ))}
              </div>
            </div>
          </Glass>
        </div>

        {/* Tier + operasi terakhir */}
        <div className="grid gap-4 lg:grid-cols-3">
          <Glass className="p-6">
            <h2 className="mb-4 text-sm font-medium text-zinc-300">Tier korpus</h2>
            <div className="space-y-3">
              {["seed", "active", "evicted", "archive"].map((k) => {
                const n = byKind.get(k) ?? 0;
                return (
                  <div key={k} className="flex items-center justify-between">
                    <span
                      className={`rounded-full border px-2.5 py-0.5 text-[11px] ${KIND_TONE[k]}`}
                    >
                      {k}
                    </span>
                    <span className="num text-sm text-zinc-300">{n}</span>
                  </div>
                );
              })}
            </div>
            <p className="mt-5 text-[11px] leading-relaxed text-zinc-600">
              <span className="text-zinc-500">seed</span> &amp;{" "}
              <span className="text-zinc-500">active</span> masuk system prompt tiap turn.{" "}
              <span className="text-zinc-500">archive</span> &amp;{" "}
              <span className="text-zinc-500">evicted</span> hanya lewat vania_recall.
            </p>
          </Glass>

          <Glass className="p-6 lg:col-span-2">
            <h2 className="mb-4 text-sm font-medium text-zinc-300">Operasi terakhir</h2>
            <div className="space-y-1">
              {(data?.recent ?? []).map((o) => (
                <div
                  key={o.id}
                  className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition-colors hover:bg-white/[0.03]"
                >
                  <StatusDot
                    tone={o.status === "ok" ? "ok" : o.status === "skip" ? "warn" : "bad"}
                  />
                  <span className="w-20 font-mono text-xs text-zinc-300">{o.action}</span>
                  <span className="w-14 text-xs text-zinc-500">{o.source}</span>
                  <span className="num flex-1 text-xs text-zinc-500">
                    {o.rows_added > 0 && <span className="text-emerald-400/80">+{o.rows_added} </span>}
                    {o.rows_evicted > 0 && <span className="text-amber-400/80">−{o.rows_evicted}</span>}
                  </span>
                  <span className="num text-xs text-zinc-600">
                    {new Date(o.ts).toLocaleTimeString("id-ID")}
                  </span>
                </div>
              ))}
              {!data?.recent.length && (
                <div className="py-6 text-center text-sm text-zinc-600">Belum ada operasi.</div>
              )}
            </div>
          </Glass>
        </div>

        <p className="mt-8 text-center text-[11px] text-zinc-600">
          Panel baca-saja. Memori hanya berubah lewat Vania.
        </p>
      </main>
    </div>
    </Guard>
  );
}
