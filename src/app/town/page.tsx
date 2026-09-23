"use client";

import { useMemo, useState } from "react";
import { Sidebar } from "@/components/sidebar";
import { Guard } from "@/components/guard";
import { useLive, StatusDot } from "@/components/monitor";
import { PageHeader } from "@/components/page-header";
import { Home, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface Resident {
  id: string; peran: string; status: "kerja" | "diam";
  tugas: string | null; tugasTerbuka: number;
  kirim: number; terima: number; menggantung: number; delegasiAktif: number;
}
interface Road {
  from: string; to: string; total: number; pending: number;
  failed: number; avgReplySec: number | null;
}
interface Act {
  at: number | null; from: string; to: string; text: string;
  balas: string | null; status: "gagal" | "menggantung" | "selesai";
  lamaDetik: number | null;
}
interface TownData {
  ok: boolean; now: number;
  residents: Resident[]; roads: Road[]; activity: Act[];
  stats: { residents: number; roads: number; handoffs: number; pending: number; oldestPendingSec: number | null };
}

const W = 760, H = 470, PUSAT = { x: W / 2, y: H / 2 };

/** Posisi rumah DETERMINISTIK — Vania di tengah, sisanya melingkar urut abjad.
 *  Sengaja tidak pakai force layout: rumah yang pindah tiap refresh bikin orang
 *  kehilangan peta mental, dan kota ini dibaca berulang kali. */
function tataLetak(ids: string[]) {
  const lain = ids.filter((i) => i !== "vania");
  const pos: Record<string, { x: number; y: number }> = { vania: PUSAT };
  const R = Math.min(W, H) * 0.36;
  lain.forEach((id, i) => {
    const a = (i / Math.max(lain.length, 1)) * Math.PI * 2 - Math.PI / 2;
    pos[id] = { x: PUSAT.x + Math.cos(a) * R, y: PUSAT.y + Math.sin(a) * R };
  });
  return pos;
}

function lama(d: number | null) {
  if (d === null) return "—";
  if (d < 60) return `${Math.round(d)} dtk`;
  if (d < 3600) return `${Math.round(d / 60)} mnt`;
  if (d < 86400) return `${(d / 3600).toFixed(1)} jam`;
  return `${Math.round(d / 86400)} hari`;
}

export default function TownPage() {
  const { data, err } = useLive<TownData>("/api/town", 5000);
  const [pilih, setPilih] = useState<string | null>(null);

  const residents = data?.residents ?? [];
  const roads = data?.roads ?? [];
  const stats = data?.stats;
  const pos = useMemo(() => tataLetak(residents.map((r) => r.id)), [residents]);

  const tampak = pilih
    ? roads.filter((j) => j.from === pilih || j.to === pilih)
    : roads;
  const maxLalu = Math.max(1, ...roads.map((j) => j.total));

  return (
    <Guard>
      <div className="flex min-h-screen flex-col lg:flex-row">
        <Sidebar />
        {/* pb-28 di HP: bar navigasi bawah menempel dan menutupi konten. */}
        <main className="min-w-0 flex-1 space-y-6 px-5 pb-28 pt-7 sm:px-8 lg:px-12 lg:pb-12 lg:pt-10">
          <PageHeader title="Kota">
            Siapa lagi kerja apa, dan siapa mengoper ke siapa. Jalan putus-putus merah = pesan
            berangkat, hasilnya belum pulang.
          </PageHeader>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Angka label="Penduduk" v={stats?.residents ?? 0} />
            <Angka label="Jalan" v={stats?.roads ?? 0} />
            <Angka label="Handoff" v={stats?.handoffs ?? 0} />
            <Angka label="Menggantung" v={stats?.pending ?? 0} bahaya={(stats?.pending ?? 0) > 0} />
          </div>

          {err && (
            <div className="flex items-center gap-2 rounded-md border border-bad/40 bg-bad-tint px-3 py-2 text-[13px] text-bad">
              <StatusDot tone="bad" size={8} /> Gagal memuat: {err}
            </div>
          )}

          <div className="grid gap-6 lg:grid-cols-12">
            {/* ---------- peta ---------- */}
            <section className="panel rounded-xl p-3 lg:col-span-8">
              <div className="w-full overflow-x-auto">
                <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full min-w-[560px]">
                  {/* jalan digambar dulu supaya rumah menimpanya */}
                  {tampak.map((j) => {
                    const a = pos[j.from], b = pos[j.to];
                    if (!a || !b) return null;
                    const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
                    const lengkung = `M ${a.x} ${a.y} Q ${mx + (b.y - a.y) * 0.12} ${
                      my - (b.x - a.x) * 0.12
                    } ${b.x} ${b.y}`;
                    const tebal = 1 + (j.total / maxLalu) * 5;
                    const macet = j.pending > 0;
                    return (
                      <g key={`${j.from}-${j.to}`}>
                        <path
                          d={lengkung}
                          fill="none"
                          strokeWidth={tebal}
                          strokeLinecap="round"
                          className={macet ? "stroke-bad" : "stroke-line"}
                          strokeDasharray={macet ? "7 5" : undefined}
                          opacity={macet ? 0.95 : 0.55}
                        />
                        <text
                          x={mx} y={my - 6}
                          textAnchor="middle"
                          className="fill-tx-3 font-mono text-[10px]"
                        >
                          {j.total}
                          {j.pending > 0 ? ` · ${j.pending} nunggu` : ""}
                        </text>
                      </g>
                    );
                  })}

                  {/* rumah */}
                  {residents.map((r) => {
                    const p = pos[r.id];
                    if (!p) return null;
                    const aktif = pilih === r.id;
                    const kerja = r.status === "kerja";
                    return (
                      <g
                        key={r.id}
                        transform={`translate(${p.x},${p.y})`}
                        onClick={() => setPilih(aktif ? null : r.id)}
                        className="cursor-pointer"
                      >
                        <circle
                          r={r.id === "vania" ? 30 : 24}
                          className={cn(
                            "transition-all",
                            aktif ? "fill-surf-3 stroke-tx-1" : "fill-surf-2 stroke-line"
                          )}
                          strokeWidth={aktif ? 1.75 : 1}
                        />
                        <circle
                          cx={r.id === "vania" ? 21 : 17}
                          cy={r.id === "vania" ? -21 : -17}
                          r={5}
                          className={
                            r.menggantung > 0 ? "fill-bad" : kerja ? "fill-ok" : "fill-idle"
                          }
                        />
                        <text textAnchor="middle" y={4} className="fill-tx-1 text-[12px] font-medium">
                          {r.id}
                        </text>
                        <text
                          textAnchor="middle"
                          y={r.id === "vania" ? 46 : 40}
                          className="fill-tx-3 text-[10px]"
                        >
                          {r.peran}
                        </text>
                      </g>
                    );
                  })}
                </svg>
              </div>

              {roads.length === 0 && (
                <p className="px-2 pb-1 text-[12px] text-tx-3">
                  Belum ada jalan yang terbentuk — ledger handoff masih kosong. Kota terisi
                  sendiri begitu ada <code className="text-tx-2">message_agent</code> yang jalan.
                </p>
              )}
            </section>

            {/* ---------- penduduk + denyut ---------- */}
            <section className="space-y-6 lg:col-span-4">
              <div className="panel overflow-hidden rounded-xl">
                <h2 className="border-b border-line px-4 py-3 text-[13.5px] font-semibold text-tx-1">Penduduk</h2>
                <div className="max-h-[260px] space-px overflow-y-auto p-1.5">
                  {residents.map((r) => (
                    <button
                      key={r.id}
                      onClick={() => setPilih(pilih === r.id ? null : r.id)}
                      className={cn(
                        "flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left transition-colors",
                        pilih === r.id ? "bg-sunken ring-1 ring-line" : "hover:bg-sunken/60"
                      )}
                    >
                      <StatusDot tone={r.menggantung > 0 ? "bad" : r.status === "kerja" ? "ok" : "idle"} size={8} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[13px] text-tx-1">{r.id}</span>
                        <span className="block truncate text-[11px] text-tx-3">
                          {r.tugas ?? r.peran}
                        </span>
                      </span>
                      <span className="num shrink-0 text-[11px] text-tx-3">
                        {r.kirim}↑ {r.terima}↓
                        {r.menggantung > 0 && <span className="text-bad"> ·{r.menggantung}</span>}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="panel overflow-hidden rounded-xl">
                <h2 className="border-b border-line px-4 py-3 text-[13.5px] font-semibold text-tx-1">Denyut</h2>
                <div className="max-h-[320px] divide-y divide-line-soft overflow-y-auto">
                  {(data?.activity ?? [])
                    .filter((a) => !pilih || a.from === pilih || a.to === pilih)
                    .map((a, i) => (
                      <div key={i} className="px-4 py-2.5">
                        <div className="flex items-center gap-1.5 text-[12px] text-tx-2">
                          <span className="font-medium text-tx-1">{a.from}</span>
                          <ArrowRight size={11} className="text-tx-3" />
                          <span className="font-medium text-tx-1">{a.to}</span>
                          <span
                            className={cn(
                              "ml-auto text-[10px]",
                              a.status === "menggantung"
                                ? "text-bad"
                                : a.status === "gagal"
                                ? "text-warn"
                                : "text-tx-3"
                            )}
                          >
                            {a.status === "selesai" ? lama(a.lamaDetik) : a.status}
                          </span>
                        </div>
                        {a.text && (
                          <p className="mt-0.5 line-clamp-2 text-[11px] text-tx-3">{a.text}</p>
                        )}
                      </div>
                    ))}
                  {(data?.activity ?? []).length === 0 && (
                    <p className="px-4 py-3 text-[12px] text-tx-3">
                      Sepi. Belum ada handoff tercatat.
                    </p>
                  )}
                </div>
              </div>
            </section>
          </div>

          {(stats?.pending ?? 0) > 0 && (
            <div className="flex items-start gap-2.5 rounded-md border border-bad/40 bg-bad-tint p-3.5">
              <Home size={15} className="mt-0.5 shrink-0 text-bad" />
              <p className="text-[13px] text-tx-2">
                <span className="font-medium text-tx-1">{stats?.pending} handoff belum pulang.</span>{" "}
                Yang tertua sudah {lama(stats?.oldestPendingSec ?? null)}. Pesannya terkirim, tapi
                balasannya tidak pernah sampai — ini titik bocor yang paling mahal karena tidak
                memunculkan error apa pun.
              </p>
            </div>
          )}
        </main>
      </div>
    </Guard>
  );
}

function Angka({ label, v, bahaya }: { label: string; v: number; bahaya?: boolean }) {
  return (
    <div className="panel relative overflow-hidden rounded-xl px-4 py-3.5">
      <span aria-hidden className={cn("absolute inset-x-0 top-0 h-[2px]", bahaya ? "bg-bad" : "bg-line")} />
      <p className="kicker flex items-center gap-2">
        {bahaya && <StatusDot tone="bad" size={7} />}
        {label}
      </p>
      <p className={cn("num mt-2 text-[26px] font-medium leading-none", bahaya ? "text-bad" : "text-tx-1")}>{v}</p>
    </div>
  );
}
