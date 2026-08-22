"use client";

import { Sidebar } from "@/components/sidebar";
import { Guard } from "@/components/guard";
import {
  Panel, Stat, Pill, StatusDot, Bars, useLive, ago, KIND_CLASS, type Tone,
} from "@/components/monitor";
import { cn } from "@/lib/utils";

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
    <div className="flex min-h-screen flex-col lg:flex-row">
      <Sidebar />

      <main className="flex-1 overflow-y-auto px-6 py-8 lg:px-10">
        <header className="mb-7 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-[25px] font-semibold tracking-[-0.025em] text-tx-1">
              Kesehatan Memori
            </h1>
            <p className="mt-1 text-sm text-tx-3">
              Pemantauan <span className="num text-tx-2">db_vania</span> · pgvector
            </p>
          </div>
          {err ? (
            <Pill tone="bad">gagal memuat — {err}</Pill>
          ) : (
            <div className="panel flex items-center gap-2 rounded-full px-3.5 py-2 text-xs">
              <StatusDot tone={tone} live />
              <span className={cn("num", tone === "ok" ? "text-ok" : "text-tx-2")}>
                {at ? `diperbarui ${at.toLocaleTimeString("id-ID")}` : "menghubungkan…"}
              </span>
            </div>
          )}
        </header>

        {/* Vonis rekonsiliasi — sinyal paling penting */}
        <Panel
          level={2}
          className={cn("mb-6 overflow-hidden p-0", v?.ok === false && "border-bad")}
        >
          <div className="flex flex-wrap items-center gap-x-8 gap-y-4 p-6">
            <div className="flex items-center gap-3.5">
              <div
                className={cn(
                  "flex size-11 items-center justify-center rounded-xl",
                  tone === "ok" ? "bg-ok-tint" : tone === "bad" ? "bg-bad-tint" : "bg-warn-tint"
                )}
              >
                <StatusDot tone={tone} live size={14} />
              </div>
              <div>
                <div className="text-lg font-semibold tracking-[-0.02em] text-tx-1">
                  {!data ? "Memeriksa…" : healthy ? "Sehat" : "Perlu perhatian"}
                </div>
                <div className="mt-0.5 text-xs text-tx-3">
                  Rekonsiliasi terakhir {ago(data?.lag.sinceLastCheck)}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-6 sm:border-l sm:border-line-soft sm:pl-8">
              <div>
                <div className="text-[10.5px] uppercase tracking-[0.14em] text-tx-3">A · state.db</div>
                <div className="num mt-1 text-2xl font-semibold text-tx-1">{v?.a ?? "—"}</div>
              </div>
              <div
                className={cn("num pt-3.5 text-xl", v && v.a === v.b ? "text-ok" : v ? "text-bad" : "text-tx-3")}
              >
                {v ? (v.a === v.b ? "=" : "≠") : "·"}
              </div>
              <div>
                <div className="text-[10.5px] uppercase tracking-[0.14em] text-tx-3">B · ltm_ops</div>
                <div
                  className={cn(
                    "num mt-1 text-2xl font-semibold",
                    v && v.a !== v.b ? "text-bad" : "text-tx-1"
                  )}
                >
                  {v?.b ?? "—"}
                </div>
              </div>
            </div>

            <p className="max-w-md text-xs leading-relaxed text-tx-3">
              A ditulis Hermes, B ditulis plugin. Plugin tidak bisa memalsukan A —
              satu-satunya cek yang tidak bisa berbohong.
            </p>
          </div>

          {v && v.alarms.length > 0 && (
            <div className="border-t border-line-soft bg-bad-tint px-6 py-4">
              <div className="mb-2.5 text-[10.5px] font-semibold uppercase tracking-[0.14em] text-bad">
                {v.alarms.length} alarm
              </div>
              <ul className="space-y-2">
                {v.alarms.map((a, i) => (
                  <li key={i} className="flex gap-2.5 text-sm text-tx-1">
                    <StatusDot tone="bad" size={10} />
                    <span>{a}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </Panel>

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
          <Panel className="p-6 lg:col-span-2">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-[13.5px] font-semibold text-tx-1">Aktivitas 24 jam</h2>
              <div className="flex items-center gap-4 text-[11px] text-tx-3">
                <span className="flex items-center gap-1.5">
                  <span className="size-2.5 rounded-[3px] bg-write" /> tulis
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="size-2.5 rounded-[3px] bg-read" /> baca
                </span>
              </div>
            </div>
            {bars.length ? (
              <Bars data={bars} />
            ) : (
              <div className="well flex h-28 items-center justify-center rounded-xl text-sm text-tx-3">
                Belum ada aktivitas 24 jam terakhir.
              </div>
            )}
          </Panel>

          {/* Ruangan */}
          <Panel className="p-6">
            <h2 className="mb-4 text-[13.5px] font-semibold text-tx-1">Invariant ruangan</h2>
            {v ? (
              v.rooms.length === 0 ? (
                <div className="flex items-center gap-2.5 rounded-xl bg-ok-tint px-3.5 py-3 text-[12.5px] text-ok">
                  <StatusDot tone="ok" /> Semua berkas cocok dengan korpus
                </div>
              ) : (
                <ul className="space-y-3">
                  {v.rooms.map((r, i) => (
                    <li key={i} className="text-sm">
                      <div className="flex items-center justify-between gap-2">
                        <span className="num text-xs text-tx-1">{r.file}</span>
                        <Pill tone="bad">tidak cocok</Pill>
                      </div>
                      <div className="num mt-1 text-xs text-tx-3">
                        berkas {r.file_rows} · korpus {r.db_rows}
                      </div>
                    </li>
                  ))}
                </ul>
              )
            ) : (
              <div className="text-sm text-tx-3">—</div>
            )}

            <div className="mt-6 border-t border-line-soft pt-5">
              <h3 className="mb-3.5 text-[10.5px] uppercase tracking-[0.14em] text-tx-3">
                Audiens
              </h3>
              <div className="space-y-2.5">
                {[...byAudience.entries()].map(([a, n]) => (
                  <div key={a} className="flex items-center gap-3">
                    <span className="w-14 text-xs text-tx-2">{a}</span>
                    <div className="well h-[7px] flex-1 overflow-hidden rounded-full">
                      <div
                        className={cn("h-full rounded-full", a === "private" ? "bg-archive" : "bg-ok")}
                        style={{ width: `${total ? (n / total) * 100 : 0}%` }}
                      />
                    </div>
                    <span className="num w-10 text-right text-xs text-tx-2">{n}</span>
                  </div>
                ))}
              </div>
            </div>
          </Panel>
        </div>

        {/* Tier + operasi terakhir */}
        <div className="grid gap-4 lg:grid-cols-3">
          <Panel className="p-6">
            <h2 className="mb-4 text-[13.5px] font-semibold text-tx-1">Tier korpus</h2>
            <div className="space-y-3">
              {["seed", "active", "evicted", "archive"].map((k) => (
                <div key={k} className="flex items-center justify-between">
                  <span className={cn("num rounded-full px-2.5 py-0.5 text-[11px]", KIND_CLASS[k])}>
                    {k}
                  </span>
                  <span className="num text-sm text-tx-1">{byKind.get(k) ?? 0}</span>
                </div>
              ))}
            </div>
            <p className="mt-5 text-[11px] leading-relaxed text-tx-3">
              <span className="text-tx-2">seed</span> &amp;{" "}
              <span className="text-tx-2">active</span> masuk system prompt tiap turn.{" "}
              <span className="text-tx-2">archive</span> &amp;{" "}
              <span className="text-tx-2">evicted</span> hanya lewat vania_recall.
            </p>
          </Panel>

          <Panel className="p-6 lg:col-span-2">
            <h2 className="mb-4 text-[13.5px] font-semibold text-tx-1">Operasi terakhir</h2>
            <div className="space-y-0.5">
              {(data?.recent ?? []).map((o) => (
                <div
                  key={o.id}
                  className="flex items-center gap-3.5 rounded-xl px-3 py-2 text-sm transition-colors hover:bg-sunken"
                >
                  <StatusDot
                    tone={o.status === "ok" ? "ok" : o.status === "skip" ? "warn" : "bad"}
                  />
                  <span className="num w-20 text-xs text-tx-1">{o.action}</span>
                  <span className="w-14 text-xs text-tx-3">{o.source}</span>
                  <span className="num flex-1 text-xs text-tx-3">
                    {o.rows_added > 0 && <span className="text-ok">+{o.rows_added} </span>}
                    {o.rows_evicted > 0 && <span className="text-evicted">−{o.rows_evicted}</span>}
                  </span>
                  <span className="num text-xs text-tx-3">
                    {new Date(o.ts).toLocaleTimeString("id-ID")}
                  </span>
                </div>
              ))}
              {!data?.recent.length && (
                <div className="py-6 text-center text-sm text-tx-3">Belum ada operasi.</div>
              )}
            </div>
          </Panel>
        </div>

        <p className="mt-8 text-center text-[11px] text-tx-3">
          Panel baca-saja. Memori hanya berubah lewat Vania.
        </p>
      </main>
    </div>
    </Guard>
  );
}
