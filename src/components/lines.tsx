"use client";

import {
  CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";

export type LinePoint = { label: string; a: number; b: number };

/**
 * Tooltip sendiri, bukan bawaan recharts — bawaannya merender inline style
 * putih yang tidak ikut tema. Ini memakai kelas `.overlay` yang sama dengan
 * popup di halaman graph, jadi bentuknya konsisten di terang & gelap.
 */
type TipProps = {
  active?: boolean;
  label?: string | number;
  payload?: { dataKey?: string | number; value?: number }[];
};

function ChartTip({ active, payload, label }: TipProps) {
  if (!active || !payload?.length) return null;
  const val = (k: string) => payload.find((p) => p.dataKey === k)?.value ?? 0;
  return (
    <div className="overlay rounded-xl px-3 py-2 text-[11px]">
      <div className="num mb-1.5 text-tx-1">{label}</div>
      <div className="flex items-center gap-1.5 text-tx-2">
        <span className="size-2 rounded-full bg-read" /> baca
        <span className="num ml-auto pl-3 text-tx-1">{val("a")}</span>
      </div>
      <div className="mt-0.5 flex items-center gap-1.5 text-tx-2">
        <span className="size-2 rounded-full bg-write" /> tulis
        <span className="num ml-auto pl-3 text-tx-1">{val("b")}</span>
      </div>
    </div>
  );
}

/**
 * Aktivitas per jam sebagai dua garis (baca & tulis).
 *
 * Warna diambil dari CSS variable tema (`var(--read)` / `var(--write)`)
 * langsung di atribut SVG — bukan nilai harfiah — supaya ganti tema tidak
 * perlu merender ulang chart-nya. Beda dengan canvas di halaman graph, yang
 * memang tidak bisa membaca custom property.
 */
export function Lines({ data }: { data: LinePoint[] }) {
  // 24 label jam berdempetan di layar sempit; sisakan kira-kira 6 tick.
  const tickGap = Math.max(0, Math.ceil(data.length / 6) - 1);

  return (
    <div className="well rounded-xl px-1 py-3">
      <ResponsiveContainer width="100%" height={196}>
        <LineChart data={data} margin={{ top: 6, right: 12, bottom: 0, left: 0 }}>
          <CartesianGrid stroke="var(--line-soft)" vertical={false} />
          <XAxis
            dataKey="label"
            interval={tickGap}
            tickLine={false}
            axisLine={{ stroke: "var(--line)" }}
            tick={{ fill: "var(--tx3)", fontSize: 10 }}
            dy={4}
          />
          <YAxis
            allowDecimals={false}
            width={30}
            tickLine={false}
            axisLine={false}
            tick={{ fill: "var(--tx3)", fontSize: 10 }}
          />
          <Tooltip content={<ChartTip />} cursor={{ stroke: "var(--line)" }} />
          <Line
            type="monotone" dataKey="a" name="baca"
            stroke="var(--read)" strokeWidth={2} dot={false}
            activeDot={{ r: 3.5, strokeWidth: 0 }}
            isAnimationActive={false}
          />
          <Line
            type="monotone" dataKey="b" name="tulis"
            stroke="var(--write)" strokeWidth={2} dot={false}
            activeDot={{ r: 3.5, strokeWidth: 0 }}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
