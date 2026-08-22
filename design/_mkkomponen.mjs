import { writeFileSync } from "fs";
const D = { bg:"#1b1d24", sunken:"#14161c", s1:"#24272f", s2:"#2c2f39", line:"rgba(255,255,255,.14)", lineSoft:"rgba(255,255,255,.07)", tx1:"#f2f3f7", tx2:"#c2c6d0", tx3:"#9298a5",
  sh1:"0 1px 2px rgba(0,0,0,.45),0 6px 18px -10px rgba(0,0,0,.8)", sh2:"0 2px 4px rgba(0,0,0,.5),0 14px 32px -14px rgba(0,0,0,.85)",
  inset:"inset 0 1px 0 rgba(255,255,255,.055)", sunk:"inset 0 2px 4px rgba(0,0,0,.45)",
  ok:"oklch(.780 .140 158)", okbg:"oklch(.290 .055 158)", warn:"oklch(.830 .130 78)", warnbg:"oklch(.300 .050 78)",
  bad:"oklch(.720 .160 18)", badbg:"oklch(.300 .065 18)", idle:"oklch(.620 .010 264)", idlebg:"oklch(.270 .008 264)",
  accent:"oklch(.720 .130 274)", accentbg:"oklch(.300 .060 274)", seed:"oklch(.750 .130 240)", read:"oklch(.720 .130 250)", write:"oklch(.700 .140 300)" };
const L = { bg:"#f1f2f6", sunken:"#e6e8ee", s1:"#ffffff", s2:"#ffffff", line:"rgba(17,20,34,.11)", lineSoft:"rgba(17,20,34,.06)", tx1:"#22262f", tx2:"#5a6070", tx3:"#818794",
  sh1:"0 1px 2px rgba(17,20,34,.06),0 4px 12px -6px rgba(17,20,34,.10)", sh2:"0 2px 4px rgba(17,20,34,.07),0 12px 24px -10px rgba(17,20,34,.14)",
  inset:"inset 0 1px 0 rgba(255,255,255,.9)", sunk:"inset 0 2px 4px rgba(17,20,34,.09)",
  ok:"oklch(.550 .140 158)", okbg:"oklch(.945 .045 158)", warn:"oklch(.600 .130 70)", warnbg:"oklch(.950 .050 78)",
  bad:"oklch(.550 .190 22)", badbg:"oklch(.950 .045 20)", idle:"oklch(.600 .010 264)", idlebg:"oklch(.945 .004 264)",
  accent:"oklch(.550 .160 274)", accentbg:"oklch(.945 .040 274)", seed:"oklch(.550 .140 240)", read:"oklch(.550 .150 250)", write:"oklch(.520 .170 300)" };

const dot = (t, k) => ({
  ok: `<svg width="10" height="10" viewBox="0 0 10 10"><circle cx="5" cy="5" r="4" fill="${t.ok}"></circle></svg>`,
  warn: `<svg width="10" height="10" viewBox="0 0 10 10"><path d="M5 1 9.3 8.5H.7Z" fill="${t.warn}"></path></svg>`,
  bad: `<svg width="10" height="10" viewBox="0 0 10 10"><path d="M5 .6 9.4 5 5 9.4.6 5Z" fill="${t.bad}"></path></svg>`,
  idle: `<svg width="10" height="10" viewBox="0 0 10 10"><circle cx="5" cy="5" r="3.4" fill="none" stroke="${t.idle}" stroke-width="1.6"></circle></svg>`,
}[k]);

const lab = (t, s) => `<div style="margin-bottom: 11px; font-size: 10px; text-transform: uppercase; letter-spacing: .13em; color: ${t.tx3}">${s}</div>`;
const card = (t, inner) => `      <div style="padding: 20px; border: 1px solid ${t.line}; border-radius: 18px; background: ${t.s1}; box-shadow: ${t.sh1}, ${t.inset}">${inner}
      </div>`;

const sheet = (t, dark) => `
  <div style="padding: 26px; border-radius: 20px; background: ${t.bg}">
    <div style="margin-bottom: 20px; font-size: 11px; text-transform: uppercase; letter-spacing: .14em; color: ${t.tx3}">${dark ? "Gelap" : "Terang"}</div>
    <div style="display: flex; flex-direction: column; gap: 14px">

${card(t, `
        ${lab(t, "Kartu metrik")}
        <div style="display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px">
          <div style="padding: 17px 18px; border: 1px solid ${t.line}; border-radius: 16px; background: ${t.s2}; box-shadow: ${t.sh1}, ${t.inset}">
            <div style="display: flex; align-items: center; gap: 8px; font-size: 10px; text-transform: uppercase; letter-spacing: .13em; color: ${t.tx3}">${dot(t, "ok")} Tulis · 7 hari</div>
            <div class="num" style="margin-top: 11px; font-size: 28px; font-weight: 600; color: ${t.ok}">46</div>
            <div style="margin-top: 5px; font-size: 11.5px; color: ${t.tx3}">operasi terakhir 4 mnt lalu</div>
          </div>
          <div style="padding: 17px 18px; border: 1px solid ${t.line}; border-radius: 16px; background: ${t.s2}; box-shadow: ${t.sh1}, ${t.inset}">
            <div style="display: flex; align-items: center; gap: 8px; font-size: 10px; text-transform: uppercase; letter-spacing: .13em; color: ${t.tx3}">${dot(t, "bad")} Error · 24 jam</div>
            <div class="num" style="margin-top: 11px; font-size: 28px; font-weight: 600; color: ${t.bad}">3</div>
            <div style="margin-top: 5px; font-size: 11.5px; color: ${t.tx3}">2 tulisan transien</div>
          </div>
        </div>`)}

${card(t, `
        ${lab(t, "Pil status &amp; tier")}
        <div style="display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 13px">
          <span style="display: flex; align-items: center; gap: 7px; padding: 6px 13px; border-radius: 999px; font-size: 11.5px; color: ${t.ok}; background: ${t.okbg}">${dot(t, "ok")} sehat</span>
          <span style="display: flex; align-items: center; gap: 7px; padding: 6px 13px; border-radius: 999px; font-size: 11.5px; color: ${t.warn}; background: ${t.warnbg}">${dot(t, "warn")} transien</span>
          <span style="display: flex; align-items: center; gap: 7px; padding: 6px 13px; border-radius: 999px; font-size: 11.5px; color: ${t.bad}; background: ${t.badbg}">${dot(t, "bad")} tidak cocok</span>
          <span style="display: flex; align-items: center; gap: 7px; padding: 6px 13px; border-radius: 999px; font-size: 11.5px; color: ${t.tx2}; background: ${t.idlebg}">${dot(t, "idle")} menunggu</span>
        </div>
        <div style="display: flex; flex-wrap: wrap; gap: 8px">
          <span class="num" style="padding: 3px 11px; border-radius: 999px; font-size: 11px; color: ${t.seed}; background: ${t.accentbg}">seed</span>
          <span class="num" style="padding: 3px 11px; border-radius: 999px; font-size: 11px; color: ${t.ok}; background: ${t.okbg}">active</span>
          <span class="num" style="padding: 3px 11px; border-radius: 999px; font-size: 11px; color: ${t.warn}; background: ${t.warnbg}">evicted</span>
          <span class="num" style="padding: 3px 11px; border-radius: 999px; font-size: 11px; color: ${t.tx2}; background: ${t.idlebg}">archive</span>
        </div>`)}

${card(t, `
        ${lab(t, "Baris tabel — diam, tersorot, error")}
        <div style="border: 1px solid ${t.line}; border-radius: 14px; background: ${t.s1}; box-shadow: ${t.sh1}, ${t.inset}; padding: 1px">
          <div style="display: flex; align-items: center; gap: 12px; padding: 10px 15px">
            ${dot(t, "ok")}
            <span class="num" style="width: 70px; padding: 3px 9px; border-radius: 999px; font-size: 10.5px; text-align: center; color: ${t.ok}; background: ${t.okbg}">add</span>
            <span style="width: 48px; font-size: 10.5px; color: ${t.tx3}">hermes</span>
            <span class="num" style="flex-grow: 1; font-size: 11px; color: ${t.ok}">+1</span>
            <span class="num" style="font-size: 11px; color: ${t.tx3}">13.58</span>
          </div>
          <div style="display: flex; align-items: center; gap: 12px; padding: 10px 14px; margin: 0 -1px; border-radius: 11px; background: ${t.s2}; border: 1px solid ${t.line}; box-shadow: ${t.sh1}, ${t.inset}">
            ${dot(t, "warn")}
            <span class="num" style="width: 70px; padding: 3px 9px; border-radius: 999px; font-size: 10.5px; text-align: center; color: ${t.warn}; background: ${t.warnbg}">add</span>
            <span style="width: 48px; font-size: 10.5px; color: ${t.tx3}">hermes</span>
            <span style="flex-grow: 1; font-size: 11px; color: ${t.warn}">transien</span>
            <span class="num" style="font-size: 11px; color: ${t.tx3}">13.30</span>
          </div>
          <div style="display: flex; align-items: center; gap: 12px; padding: 10px 15px; border-top: 1px solid ${t.lineSoft}">
            ${dot(t, "bad")}
            <span class="num" style="width: 70px; padding: 3px 9px; border-radius: 999px; font-size: 10.5px; text-align: center; color: ${t.tx2}; background: ${t.idlebg}">sync_file</span>
            <span style="width: 48px; font-size: 10.5px; color: ${t.tx3}">cron</span>
            <span style="flex-grow: 1; font-size: 11px; color: ${t.bad}; overflow: hidden; text-overflow: ellipsis; white-space: nowrap">MEMORY.md: 12 baris vs 9</span>
            <span class="num" style="font-size: 11px; color: ${t.tx3}">11.02</span>
          </div>
        </div>`)}

${card(t, `
        ${lab(t, "Kontrol — tombol, input, paginasi, toggle tema")}
        <div style="display: flex; flex-wrap: wrap; align-items: center; gap: 10px; margin-bottom: 12px">
          <div style="padding: 10px 18px; border-radius: 14px; font-size: 13px; font-weight: 500; color: ${t.tx1}; background: ${t.s2}; border: 1px solid ${t.line}; box-shadow: ${t.sh2}, ${t.inset}">Cari</div>
          <div style="padding: 10px 18px; border-radius: 14px; font-size: 13px; color: ${t.tx3}; background: ${t.sunken}; box-shadow: ${t.sunk}">Nonaktif</div>
          <div style="display: flex; gap: 4px; padding: 4px; border-radius: 14px; background: ${t.sunken}; box-shadow: ${t.sunk}">
            <div style="display: flex; align-items: center; gap: 6px; padding: 6px 12px; border-radius: 10px; font-size: 11.5px; color: ${dark ? t.tx3 : t.tx1}; ${dark ? "" : `background: ${t.s2}; border: 1px solid ${t.line}; box-shadow: ${t.sh1}, ${t.inset};`}">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="4"></circle><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"></path></svg> Terang
            </div>
            <div style="display: flex; align-items: center; gap: 6px; padding: 6px 12px; border-radius: 10px; font-size: 11.5px; color: ${dark ? t.tx1 : t.tx3}; ${dark ? `background: ${t.s2}; border: 1px solid ${t.line}; box-shadow: ${t.sh1}, ${t.inset};` : ""}">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5Z"></path></svg> Gelap
            </div>
          </div>
        </div>
        <div style="display: flex; align-items: center; gap: 11px; padding: 12px 15px; border-radius: 14px; background: ${t.sunken}; box-shadow: ${t.sunk}">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="${t.tx3}" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="7"></circle><path d="m20 20-3.9-3.9"></path></svg>
          <span style="font-size: 13px; color: ${t.tx1}">abiane</span>
          <span style="width: 1.5px; height: 15px; background: ${t.accent}"></span>
        </div>
        <div style="display: flex; align-items: center; justify-content: center; gap: 12px; margin-top: 12px">
          <div style="padding: 8px 15px; border-radius: 12px; font-size: 12px; color: ${t.tx3}; background: ${t.sunken}; box-shadow: ${t.sunk}">Sebelumnya</div>
          <span class="num" style="font-size: 12px; color: ${t.tx2}">1 / 47</span>
          <div style="padding: 8px 15px; border-radius: 12px; font-size: 12px; color: ${t.tx1}; background: ${t.s2}; border: 1px solid ${t.line}; box-shadow: ${t.sh1}, ${t.inset}">Berikutnya</div>
        </div>`)}

${card(t, `
        ${lab(t, "Item nav — aktif vs diam")}
        <div style="display: flex; flex-direction: column; gap: 4px">
          <div style="display: flex; align-items: center; gap: 11px; padding: 9px 12px; border-radius: 14px; font-size: 13px; font-weight: 500; color: ${t.tx1}; background: ${t.s2}; border: 1px solid ${t.line}; box-shadow: ${t.sh1}, ${t.inset}">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="${t.accent}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12h4l3 8 4-16 3 8h4"></path></svg> Kesehatan
          </div>
          <div style="display: flex; align-items: center; gap: 11px; padding: 9px 12px; border-radius: 14px; font-size: 13px; color: ${t.tx2}">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="8" y="2" width="8" height="4" rx="1"></rect><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path><path d="M9 12h6"></path><path d="M9 16h6"></path></svg> Audit
          </div>
        </div>`)}

${card(t, `
        ${lab(t, "Bar sebaran &amp; grafik")}
        <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 13px">
          <span style="width: 48px; font-size: 11.5px; color: ${t.tx2}">private</span>
          <div style="flex-grow: 1; height: 7px; border-radius: 999px; background: ${t.sunken}; box-shadow: ${t.sunk}; overflow: hidden"><div style="width: 86%; height: 100%; border-radius: 999px; background: ${t.idle}"></div></div>
          <span class="num" style="width: 28px; text-align: right; font-size: 11.5px; color: ${t.tx2}">198</span>
        </div>
        <div style="display: flex; align-items: flex-end; gap: 4px; height: 66px; padding: 7px 9px; border-radius: 13px; background: ${t.sunken}; box-shadow: ${t.sunk}">
          ${[14, 26, 41, 33, 22, 17, 9, 29, 48, 61, 44, 31, 19, 37, 52, 28].map((h) => `<div style="flex-grow: 1; display: flex; flex-direction: column; justify-content: flex-end; gap: 2px; height: 100%"><div style="height: ${h}%; border-radius: 3px; background: ${t.read}"></div><div style="height: ${Math.round(h * 0.6)}%; background: ${t.write}"></div></div>`).join("")}
        </div>
        <div style="display: flex; gap: 16px; margin-top: 10px; font-size: 10.5px; color: ${t.tx3}">
          <span style="display: flex; align-items: center; gap: 6px"><span style="width: 9px; height: 9px; border-radius: 3px; background: ${t.write}"></span> tulis</span>
          <span style="display: flex; align-items: center; gap: 6px"><span style="width: 9px; height: 9px; border-radius: 3px; background: ${t.read}"></span> baca</span>
        </div>`)}
    </div>
  </div>`;

const html = `<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <script src="./support.js"></script>
</head>
<body>
<x-dc>
<helmet>
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500;600&display=swap">
  <style>
    * { box-sizing: border-box; }
    body { margin: 0; font-family: 'IBM Plex Sans', ui-sans-serif, system-ui, sans-serif; -webkit-font-smoothing: antialiased; }
    a { color: oklch(.720 .130 274); text-decoration: none; }
    a:hover { color: oklch(.962 .004 264); }
    .num { font-family: 'IBM Plex Mono', ui-monospace, SFMono-Regular, monospace; font-variant-numeric: tabular-nums; letter-spacing: -.01em; }
  </style>
</helmet>

<div style="min-height: 1340px; padding: 40px; background: ${D.bg}; color: ${D.tx1}; font-size: 14px">
  <header style="margin-bottom: 30px">
    <h1 style="margin: 0; font-size: 28px; font-weight: 600; letter-spacing: -.03em; color: ${D.tx1}">Komponen</h1>
    <p style="margin: 7px 0 0; font-size: 14px; color: ${D.tx3}">Setiap komponen di dua tema. Yang terangkat bisa ditekan, yang cekung menerima isian.</p>
  </header>
  <div style="display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 24px">
${sheet(D, true)}
${sheet(L, false)}
  </div>
</div>
</x-dc>

<script data-dc-script data-props='{"$preview":{"width":1400,"height":1420}}'>
class Component extends DCLogic {}
</script>
</body>
</html>
`;
writeFileSync("Komponen.dc.html", html);
console.log("Komponen.dc.html", html.length, "byte");
