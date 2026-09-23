"use client";

import { Sidebar } from "@/components/sidebar";
import { Guard } from "@/components/guard";
import {
  Panel, Stat, Pill, StatusDot, useLive, ago, KIND_CLASS, type Tone,
} from "@/components/monitor";
import { Lines } from "@/components/lines";
import { PageHeader, LiveStamp } from "@/components/page-header";
import { cn } from "@/lib/utils";

/* Kepala bagian di dalam panel: judul tinta + keterangan kecil di kanan. */
function Head({ title, meta }: { title: string; meta?: React.ReactNode }) {
  return (
    <div className="mb-4 flex items-baseline justify-between gap-3 border-b border-line-soft pb-3">
      <h2 className="text-[13.5px] font-semibold text-tx-1">{title}</h2>
      {meta ? <div className="kicker">{meta}</div> : null}
    </div>
  );
}

const TIERS = ["seed", "active", "resampled", "reasoning", "quarantine", "evicted", "archive"];

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
  fitness?: {
    total_tracked: number;
    active_used: number;
    avg_fitness: number;
    max_fitness: number;
    total_retrievals: number;
    total_successes: number;
    total_contradictions: number;
    total_rewards: number;
  };
};

export default function Dashboard() {
  const { data, err, at } = useLive<Health>("/api/health", 5000);
  const v = data?.verdict ?? null;
  const fit = data?.fitness;

  const healthy = v?.ok === true && (data?.ops24.errors ?? 0) === 0;
  const tone: Tone = !data ? "idle" : healthy ? "ok" : v?.ok === false ? "bad" : "warn";

  const byKind = new Map<string, number>();
  const byAudience = new Map<string, number>();
  for (const r of data?.corpus ?? []) {
    byKind.set(r.kind, (byKind.get(r.kind) ?? 0) + r.n);
    byAudience.set(r.audience, (byAudience.get(r.audience) ?? 0) + r.n);
  }
  const total = data?.coverage.total ?? 0;

  const timeline = (data?.timeline ?? []).map((t) => ({
    label: new Date(t.bucket).getHours().toString().padStart(2, "0") + ":00",
    a: t.reads,
    b: t.writes,
  }));

  const matched = v ? v.a === v.b : null;

  return (
    <Guard>
    <div className="flex min-h-screen flex-col lg:flex-row">
      <Sidebar />

      <main className="min-w-0 flex-1 px-5 pb-28 pt-7 sm:px-8 lg:px-12 lg:pb-12 lg:pt-10">
        <PageHeader
          title="Kesehatan memori"
          actions={
            <LiveStamp at={at} err={err}>
              <StatusDot tone={err ? "bad" : tone} live={!err} />
            </LiveStamp>
          }
        >
          Pemantauan <span className="num text-tx-2">db_vania</span> · pgvector + Lapis Fitness (MemRL)
        </PageHeader>

        {/* Vonis rekonsiliasi — sinyal paling penting, jadi paling besar. */}
        <section
          className={cn(
            "panel mb-6 overflow-hidden rounded-xl",
            v?.ok === false && "border-bad"
          )}
        >
          <div className="grid gap-y-6 p-6 sm:p-8 lg:grid-cols-[1.25fr_1fr_0.9fr] lg:gap-x-10">
            <div>
              <p className="kicker">Vonis rekonsiliasi</p>
              <div className="mt-3 flex items-start gap-3">
                <span className="mt-[14px]"><StatusDot tone={tone} live size={12} /></span>
                <h2 className={cn("display text-[44px] sm:text-[54px]", tone === "bad" ? "text-bad" : "text-tx-1")}>
                  {!data ? "Memeriksa…" : healthy ? <>Sehat &amp; <em>tersinkron.</em></> : <>Perlu <em>perhatian.</em></>}
                </h2>
              </div>
              <p className="mt-3 text-[13px] text-tx-3">
                Rekonsiliasi terakhir <span className="num text-tx-2">{ago(data?.lag.sinceLastCheck)}</span>
              </p>
            </div>

            {/* Persamaan A ? B — dicetak sebagai persamaan betulan. */}
            <div className="flex items-end gap-5 border-line-soft lg:border-l lg:pl-10">
              <div>
                <p className="kicker">A · state.db</p>
                <p className="num mt-2 text-[40px] font-medium leading-none text-tx-1">{v?.a ?? "—"}</p>
              </div>
              <p
                className={cn(
                  "display pb-0.5 text-[48px] leading-none",
                  matched === null ? "text-tx-3" : matched ? "text-ok" : "text-bad"
                )}
                aria-label={matched === null ? "belum diketahui" : matched ? "sama dengan" : "tidak sama dengan"}
              >
                {matched === null ? "·" : matched ? "=" : "≠"}
              </p>
              <div>
                <p className="kicker">B · ltm_ops</p>
                <p className={cn("num mt-2 text-[40px] font-medium leading-none", matched === false ? "text-bad" : "text-tx-1")}>
                  {v?.b ?? "—"}
                </p>
              </div>
            </div>

            <p className="display self-end text-[19px] italic leading-snug text-tx-3 lg:border-l lg:border-line-soft lg:pl-10">
              A ditulis Hermes, B ditulis plugin. Plugin tidak bisa memalsukan A — satu-satunya cek
              yang tidak bisa berbohong.
            </p>
          </div>

          {v && v.alarms.length > 0 && (
            <div className="border-t border-bad/30 bg-bad-tint px-6 py-4 sm:px-8">
              <p className="kicker !text-bad">{v.alarms.length} alarm</p>
              <ul className="mt-2.5 space-y-2">
                {v.alarms.map((a, i) => (
                  <li key={i} className="flex items-baseline gap-2.5 text-[13.5px] text-tx-1">
                    <StatusDot tone="bad" size={8} />
                    <span>{a}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>

        {/* Metrik inti */}
        <div className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Stat
            label="Baris korpus" tone={(data?.coverage.empty ?? 0) > 0 ? "warn" : "idle"}
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
            sub={v?.reads7d === 0 ? "vania_recall tidak terpakai" : `${v?.reads7d}x vania_recall`}
          />
          <Stat
            label="Fitness tracker"
            tone="accent"
            value={fit ? `${fit.total_tracked}` : "—"}
            sub={`maks ${(fit?.max_fitness ?? 0).toFixed(2)} · rerata ${(fit?.avg_fitness ?? 0).toFixed(3)}`}
          />
        </div>

        {/* Lapis Fitness & sinyal MemRL */}
        {fit && (
          <Panel className="mb-6 p-6">
            <Head title="Sinyal fitness & reinforcement (MemRL)" meta="auto-decay · half-life 30h" />
            <div className="grid grid-cols-2 gap-y-5 sm:grid-cols-4 sm:divide-x sm:divide-line-soft">
              {[
                { k: "Total retrieval", v: fit.total_retrievals, d: "Ditarik via vania_recall", c: "text-tx-1" },
                { k: "Strategi sukses", v: fit.total_successes, d: "Sesi berbuah [STRATEGY]", c: "text-ok" },
                { k: "Reward manusia", v: fit.total_rewards, d: "Fakta evicted ditulis ulang", c: "text-read" },
                {
                  k: "Kontradiksi", v: fit.total_contradictions, d: "Penalti replace/remove",
                  c: fit.total_contradictions > 0 ? "text-bad" : "text-tx-2",
                },
              ].map((x, i) => (
                <div key={x.k} className={cn(i > 0 && "sm:pl-5", i % 2 === 1 && "pl-4 sm:pl-5")}>
                  <p className="kicker">{x.k}</p>
                  <p className={cn("num mt-2 text-[26px] font-medium leading-none", x.c)}>{x.v}</p>
                  <p className="mt-1.5 text-[11.5px] text-tx-3">{x.d}</p>
                </div>
              ))}
            </div>
          </Panel>
        )}

        <div className="mb-6 grid gap-6 lg:grid-cols-3">
          {/* Aktivitas */}
          <Panel className="p-6 lg:col-span-2">
            <Head
              title="Aktivitas 24 jam"
              meta={
                <span className="flex items-center gap-4 normal-case tracking-normal">
                  <span className="flex items-center gap-1.5">
                    <span className="h-[2px] w-4 bg-read" /> baca
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="h-[2px] w-4 bg-write" /> tulis
                  </span>
                </span>
              }
            />
            {timeline.length ? (
              <Lines data={timeline} />
            ) : (
              <div className="flex h-28 items-center justify-center text-sm text-tx-3">
                Belum ada aktivitas 24 jam terakhir.
              </div>
            )}
          </Panel>

          {/* Ruangan & audiens */}
          <Panel className="p-6">
            <Head title="Invariant ruangan" meta={v ? `${v.rooms.length} selisih` : undefined} />
            {v ? (
              v.rooms.length === 0 ? (
                <div className="flex items-center gap-2.5 text-[13px] text-ok">
                  <StatusDot tone="ok" /> Semua berkas cocok dengan korpus
                </div>
              ) : (
                <ul className="space-y-3">
                  {v.rooms.map((r, i) => (
                    <li key={i} className="text-sm">
                      <div className="flex items-center justify-between gap-2">
                        <span className="num truncate text-xs text-tx-1">{r.file}</span>
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

            <p className="kicker mb-3 mt-7">Audiens</p>
            <div className="space-y-3">
              {[...byAudience.entries()].map(([a, n]) => (
                <div key={a}>
                  <div className="mb-1.5 flex items-baseline justify-between text-xs">
                    <span className="text-tx-2">{a}</span>
                    <span className="num text-tx-1">
                      {n} <span className="text-tx-3">· {total ? Math.round((n / total) * 100) : 0}%</span>
                    </span>
                  </div>
                  <div className="h-[5px] overflow-hidden rounded-full bg-sunken">
                    <div
                      className={cn("h-full rounded-full", a === "private" ? "bg-archive" : "bg-ok")}
                      style={{ width: `${total ? (n / total) * 100 : 0}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </Panel>
        </div>

        {/* Tier lengkap + operasi terakhir */}
        <div className="grid gap-6 lg:grid-cols-3">
          <Panel className="p-6">
            <Head title="Tier korpus" meta={`${total.toLocaleString("id-ID")} baris`} />
            <div className="space-y-2">
              {TIERS.map((k) => (
                <div key={k} className="flex items-baseline gap-2 text-[13px]">
                  <span className={cn("num rounded-[4px] px-1.5 py-px text-[11px] font-medium", KIND_CLASS[k] || "bg-idle-tint text-tx-2")}>
                    {k}
                  </span>
                  <span className="leader" />
                  <span className="num font-medium text-tx-1">{byKind.get(k) ?? 0}</span>
                </div>
              ))}
            </div>
            <p className="mt-5 border-t border-line-soft pt-4 text-[11.5px] leading-relaxed text-tx-3">
              <span className="text-tx-2">seed</span> &amp;{" "}
              <span className="text-tx-2">active</span> disuntikkan langsung tiap turn.{" "}
              <span className="text-tx-2">archive</span>,{" "}
              <span className="text-tx-2">evicted</span>, &amp;{" "}
              <span className="text-tx-2">reasoning</span> dicari melalui{" "}
              <code className="num text-accent-solid">vania_recall</code>.
            </p>
          </Panel>

          <Panel className="p-6 lg:col-span-2">
            <Head title="Operasi terakhir" meta={`${data?.recent.length ?? 0} baris`} />
            <div className="-mx-2">
              {(data?.recent ?? []).map((o) => (
                <div
                  key={o.id}
                  className="flex items-center gap-4 border-b border-line-soft px-2 py-2 text-sm last:border-0 hover:bg-sunken"
                >
                  <span className="num w-[68px] shrink-0 text-xs text-tx-3">
                    {new Date(o.ts).toLocaleTimeString("id-ID")}
                  </span>
                  <StatusDot
                    tone={o.status === "ok" ? "ok" : o.status === "skip" ? "warn" : "bad"}
                  />
                  <span className="num w-20 shrink-0 text-xs text-tx-1">{o.action}</span>
                  <span className="w-16 shrink-0 truncate text-xs text-tx-3">{o.source}</span>
                  <span className="num flex-1 text-right text-xs text-tx-3">
                    {o.rows_added > 0 && <span className="text-ok">+{o.rows_added} </span>}
                    {o.rows_evicted > 0 && <span className="text-evicted">−{o.rows_evicted}</span>}
                  </span>
                </div>
              ))}
              {!data?.recent.length && (
                <div className="py-6 text-center text-sm text-tx-3">Belum ada operasi.</div>
              )}
            </div>
          </Panel>
        </div>

        <p className="kicker mt-10 text-center !normal-case !tracking-normal">
          Panel baca-saja. Memori dipelihara otomatis oleh Vania LTM &amp; Curator.
        </p>
      </main>
    </div>
    </Guard>
  );
}
