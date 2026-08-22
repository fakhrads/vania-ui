// Mock graph force-directed: posisi ditulis tetap biar artboard deterministik.
const W = 880, H = 560;
const ents = [
  { n: "Fakhri", x: 300, y: 250, r: 15 },
  { n: "Abiane", x: 585, y: 165, r: 12 },
  { n: "FakhriPOS", x: 175, y: 405, r: 11 },
  { n: "Dokploy", x: 640, y: 400, r: 9 },
  { n: "Vania UI", x: 425, y: 455, r: 10 },
  { n: "Joss Way-ar", x: 745, y: 110, r: 8 },
  { n: "NixOS", x: 130, y: 150, r: 8 },
];
const kinds = ["seed", "active", "evicted", "archive"];
let seed = 7;
const rnd = () => (seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648;
const entries = [];
ents.forEach((e, ei) => {
  const n = [7, 5, 4, 3, 4, 3, 3][ei];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + ei * 1.1;
    const d = 62 + rnd() * 46;
    entries.push({
      x: Math.max(28, Math.min(W - 28, e.x + Math.cos(a) * d)),
      y: Math.max(28, Math.min(H - 28, e.y + Math.sin(a) * d)),
      r: 3.4 + rnd() * 3.6,
      k: kinds[Math.floor(rnd() * (i === 0 ? 2 : 4))],
      to: ei,
    });
  }
});
const hi = 1; // node Abiane disorot
let s = "";
entries.forEach((p) => {
  const e = ents[p.to];
  const on = p.to === hi;
  s += `      <line x1="${p.x.toFixed(0)}" y1="${p.y.toFixed(0)}" x2="${e.x}" y2="${e.y}" stroke="${on ? "var(--tx1)" : "var(--line)"}" stroke-width="${on ? 1.3 : 0.9}" opacity="${on ? 0.55 : 0.5}"></line>\n`;
});
entries.forEach((p) => {
  s += `      <circle cx="${p.x.toFixed(0)}" cy="${p.y.toFixed(0)}" r="${p.r.toFixed(1)}" fill="var(--${p.k})" opacity="${p.to === hi ? 1 : 0.72}"></circle>\n`;
});
ents.forEach((e, i) => {
  const on = i === hi;
  s += `      <circle cx="${e.x}" cy="${e.y}" r="${e.r + 7}" fill="var(--entity)" opacity="0.13"></circle>\n`;
  s += `      <circle cx="${e.x}" cy="${e.y}" r="${e.r}" fill="var(--entity)"${on ? ' stroke="var(--tx1)" stroke-width="2"' : ""}></circle>\n`;
  s += `      <text x="${e.x}" y="${e.y + e.r + 16}" text-anchor="middle" font-family="'IBM Plex Sans', sans-serif" font-size="12" font-weight="${on ? 600 : 500}" fill="var(--tx1)">${e.n}</text>\n`;
});
process.stdout.write(s);
