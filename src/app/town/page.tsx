"use client";

import { useMemo, useState } from "react";
import { Sidebar } from "@/components/sidebar";
import { Guard } from "@/components/guard";
import { useLive } from "@/components/monitor";
import { Home, AlertTriangle, ArrowRight, Users, Route as RouteIcon } from "lucide-react";
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
      <div className="flex min-h-screen">
        <Sidebar />
        <main className="flex-1 space-y-4 p-4 lg:p-6">
          <header className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="font-heading text-xl font-semibold text-tx-1">Kota</h1>
              <p className="text-[13px] text-tx-3">
                Siapa lagi kerja apa, dan siapa mengoper ke siapa. Jalan putus-putus merah =
                pesan berangkat, hasilnya belum pulang.
              </p>
            </div>
            <div className="flex flex-wrap gap-2 text-[12px]">
              <Angka ikon={<Users size={13} />} label="penduduk" v={stats?.residents ?? 0} />
              <Angka ikon={<RouteIcon size={13} />} label="jalan" v={stats?.roads ?? 0} />
              <Angka ikon={<ArrowRight size={13} />} label="handoff" v={stats?.handoffs ?? 0} />
              <Angka
                ikon={<AlertTriangle size={13} />}
                label="menggantung"
                v={stats?.pending ?? 0}
                bahaya={(stats?.pending ?? 0) > 0}
              />
            </div>
          </header>

          {err && (
            <div className="panel rounded-xl p-3 text-[13px] text-bad">Gagal memuat: {err}</div>
          )}

          <div className="grid gap-4 lg:grid-cols-12">
            {/* ---------- peta ---------- */}
            <section className="panel lg:col-span-8 rounded-2xl p-3">
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
                          className="fill-tx-3 text-[10px]"
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
                            aktif ? "fill-accent-tint stroke-accent-solid" : "fill-surf-2 stroke-line"
                          )}
                          strokeWidth={aktif ? 2 : 1.2}
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
            <section className="lg:col-span-4 space-y-4">
              <div className="panel rounded-2xl p-4">
                <h2 className="mb-2 text-[13px] font-semibold text-tx-1">Penduduk</h2>
                <div className="well max-h-[240px] space-y-1.5 overflow-y-auto rounded-xl p-2">
                  {residents.map((r) => (
                    <button
                      key={r.id}
                      onClick={() => setPilih(pilih === r.id ? null : r.id)}
                      className={cn(
                        "flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left transition-colors",
                        pilih === r.id ? "bg-accent-tint" : "hover:bg-surf-2"
                      )}
                    >
                      <span
                        className={cn(
                          "size-2 shrink-0 rounded-full",
                          r.menggantung > 0 ? "bg-bad" : r.status === "kerja" ? "bg-ok" : "bg-idle"
                        )}
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[13px] text-tx-1">{r.id}</span>
                        <span className="block truncate text-[11px] text-tx-3">
                          {r.tugas ?? r.peran}
                        </span>
                      </span>
                      <span className="shrink-0 text-[11px] tabular-nums text-tx-3">
                        {r.kirim}↑ {r.terima}↓
                        {r.menggantung > 0 && <span className="text-bad"> ·{r.menggantung}</span>}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="panel rounded-2xl p-4">
                <h2 className="mb-2 text-[13px] font-semibold text-tx-1">Denyut</h2>
                <div className="well max-h-[300px] space-y-2 overflow-y-auto rounded-xl p-2">
                  {(data?.activity ?? [])
                    .filter((a) => !pilih || a.from === pilih || a.to === pilih)
                    .map((a, i) => (
                      <div key={i} className="rounded-lg px-2 py-1.5">
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
                    <p className="px-2 py-3 text-[12px] text-tx-3">
                      Sepi. Belum ada handoff tercatat.
                    </p>
                  )}
                </div>
              </div>
            </section>
          </div>

          {(stats?.pending ?? 0) > 0 && (
            <div className="panel flex items-start gap-2 rounded-xl border-l-2 border-bad p-3">
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

function Angka({
  ikon, label, v, bahaya,
}: { ikon: React.ReactNode; label: string; v: number; bahaya?: boolean }) {
  return (
    <span
      className={cn(
        "raised flex items-center gap-1.5 rounded-lg px-2.5 py-1.5",
        bahaya ? "text-bad" : "text-tx-2"
      )}
    >
      {ikon}
      <span className="font-semibold tabular-nums text-tx-1">{v}</span>
      <span className="text-tx-3">{label}</span>
    </span>
  );
}
