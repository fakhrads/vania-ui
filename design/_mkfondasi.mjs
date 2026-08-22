import { readFileSync, writeFileSync } from "fs";
const P = JSON.parse(readFileSync("_fondasi.json", "utf8"));
const D = { bg:"#1b1d24", sunken:"#14161c", s1:"#24272f", s2:"#2c2f39", s3:"#353945", line:"rgba(255,255,255,.14)", tx1:"#f2f3f7", tx2:"#c2c6d0", tx3:"#9298a5",
  sh1:"0 1px 2px rgba(0,0,0,.45),0 6px 18px -10px rgba(0,0,0,.8)", sh2:"0 2px 4px rgba(0,0,0,.5),0 14px 32px -14px rgba(0,0,0,.85)", sh3:"0 8px 14px rgba(0,0,0,.5),0 28px 56px -20px rgba(0,0,0,.9)",
  inset:"inset 0 1px 0 rgba(255,255,255,.055)", sunk:"inset 0 2px 4px rgba(0,0,0,.45)" };
const L = { bg:"#f1f2f6", sunken:"#e6e8ee", s1:"#ffffff", s2:"#ffffff", s3:"#ffffff", line:"rgba(17,20,34,.11)", tx1:"#22262f", tx2:"#5a6070", tx3:"#818794",
  sh1:"0 1px 2px rgba(17,20,34,.06),0 4px 12px -6px rgba(17,20,34,.10)", sh2:"0 2px 4px rgba(17,20,34,.07),0 12px 24px -10px rgba(17,20,34,.14)", sh3:"0 6px 10px rgba(17,20,34,.08),0 24px 48px -16px rgba(17,20,34,.20)",
  inset:"inset 0 1px 0 rgba(255,255,255,.9)", sunk:"inset 0 2px 4px rgba(17,20,34,.09)" };

const elevBlock = (t, dark) => `
      <div style="padding: 22px; border-radius: 18px; background: ${t.bg}">
        <div style="margin-bottom: 16px; font-size: 10.5px; text-transform: uppercase; letter-spacing: .14em; color: ${t.tx3}">${dark ? "Gelap" : "Terang"}</div>
        <div style="display: flex; flex-direction: column; gap: 12px">
          <div style="padding: 13px 16px; border-radius: 14px; background: ${t.sunken}; box-shadow: ${t.sunk}">
            <div class="num" style="font-size: 11.5px; color: ${t.tx1}">e−1 · sunken</div>
            <div style="margin-top: 3px; font-size: 10.5px; color: ${t.tx3}">sumur input, track bar, area canvas</div>
          </div>
          <div style="padding: 13px 16px; border-radius: 14px; background: ${t.bg}">
            <div class="num" style="font-size: 11.5px; color: ${t.tx1}">e0 · rata</div>
            <div style="margin-top: 3px; font-size: 10.5px; color: ${t.tx3}">latar halaman, baris tabel diam</div>
          </div>
          <div style="padding: 13px 16px; border: 1px solid ${t.line}; border-radius: 14px; background: ${t.s1}; box-shadow: ${t.sh1}, ${t.inset}">
            <div class="num" style="font-size: 11.5px; color: ${t.tx1}">e1 · kartu</div>
            <div style="margin-top: 3px; font-size: 10.5px; color: ${t.tx3}">panel, kartu metrik, sidebar</div>
          </div>
          <div style="padding: 13px 16px; border: 1px solid ${t.line}; border-radius: 14px; background: ${t.s2}; box-shadow: ${t.sh2}, ${t.inset}">
            <div class="num" style="font-size: 11.5px; color: ${t.tx1}">e2 · terangkat</div>
            <div style="margin-top: 3px; font-size: 10.5px; color: ${t.tx3}">nav aktif, tombol, baris tersorot, vonis</div>
          </div>
          <div style="padding: 13px 16px; border: 1px solid ${t.line}; border-radius: 14px; background: ${t.s3}; box-shadow: ${t.sh3}, ${t.inset}">
            <div class="num" style="font-size: 11.5px; color: ${t.tx1}">e3 · overlay</div>
            <div style="margin-top: 3px; font-size: 10.5px; color: ${t.tx3}">drawer mobile, popup node, dialog</div>
          </div>
        </div>
      </div>`;

const toneRow = (t, dark) => {
  const tones = [
    ["ok", dark ? "oklch(.780 .140 158)" : "oklch(.550 .140 158)", dark ? "oklch(.290 .055 158)" : "oklch(.945 .045 158)", '<circle cx="6" cy="6" r="5" fill="CLR"></circle>', "lingkaran padat"],
    ["warn", dark ? "oklch(.830 .130 78)" : "oklch(.600 .130 70)", dark ? "oklch(.300 .050 78)" : "oklch(.950 .050 78)", '<path d="M6 1 11.2 10.2H.8Z" fill="CLR"></path>', "segitiga"],
    ["bad", dark ? "oklch(.720 .160 18)" : "oklch(.550 .190 22)", dark ? "oklch(.300 .065 18)" : "oklch(.950 .045 20)", '<path d="M6 .7 11.3 6 6 11.3.7 6Z" fill="CLR"></path>', "belah ketupat"],
    ["idle", dark ? "oklch(.620 .010 264)" : "oklch(.600 .010 264)", dark ? "oklch(.270 .008 264)" : "oklch(.945 .004 264)", '<circle cx="6" cy="6" r="4.2" fill="none" stroke="CLR" stroke-width="1.8"></circle>', "lingkaran kosong"],
  ];
  return tones.map(([n, c, bgc, svg, shape]) => `          <div style="display: flex; align-items: center; gap: 11px; padding: 10px 13px; border-radius: 12px; background: ${bgc}">
            <svg width="12" height="12" viewBox="0 0 12 12">${svg.replace("CLR", c)}</svg>
            <span class="num" style="width: 42px; font-size: 11.5px; color: ${c}">${n}</span>
            <span style="flex-grow: 1; font-size: 11px; color: ${t.tx3}">${shape}</span>
          </div>`).join("\n");
};

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

<div style="min-height: 1620px; padding: 40px; background: ${D.bg}; color: ${D.tx1}; font-size: 14px">

  <header style="margin-bottom: 34px">
    <h1 style="margin: 0; font-size: 28px; font-weight: 600; letter-spacing: -.03em; color: ${D.tx1}">Fondasi</h1>
    <p style="margin: 7px 0 0; font-size: 14px; color: ${D.tx3}">Soft-depth · dua tema · token oklch buat <span class="num">@theme inline</span> di globals.css</p>
  </header>

  <!-- Tipografi -->
  <section style="margin-bottom: 28px; padding: 26px 28px; border: 1px solid ${D.line}; border-radius: 20px; background: ${D.s1}; box-shadow: ${D.sh1}, ${D.inset}">
    <h2 style="margin: 0 0 6px; font-size: 15px; font-weight: 600; color: ${D.tx1}">Tipografi</h2>
    <p style="margin: 0 0 22px; font-size: 12px; color: ${D.tx3}">IBM Plex Sans buat antarmuka, IBM Plex Mono buat angka, ID, dan nama tabel. Menggantikan Noto Sans — dua-duanya di Google Fonts.</p>
    <div style="display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 30px">
      <div style="display: flex; flex-direction: column; gap: 15px">
        <div><div class="num" style="font-size: 10px; color: ${D.tx3}">25 / 600 / -.025em</div><div style="font-size: 25px; font-weight: 600; letter-spacing: -.025em; color: ${D.tx1}">Kesehatan Memori</div></div>
        <div><div class="num" style="font-size: 10px; color: ${D.tx3}">18 / 600</div><div style="font-size: 18px; font-weight: 600; color: ${D.tx1}">Perlu perhatian</div></div>
        <div><div class="num" style="font-size: 10px; color: ${D.tx3}">13.5 / 600 — judul panel</div><div style="font-size: 13.5px; font-weight: 600; color: ${D.tx1}">Invariant ruangan</div></div>
        <div><div class="num" style="font-size: 10px; color: ${D.tx3}">13.5 / 400 — isi</div><div style="font-size: 13.5px; color: ${D.tx2}">Semua berkas cocok dengan korpus</div></div>
        <div><div class="num" style="font-size: 10px; color: ${D.tx3}">10.5 / .14em — label</div><div style="font-size: 10.5px; text-transform: uppercase; letter-spacing: .14em; color: ${D.tx3}">Baris korpus</div></div>
      </div>
      <div style="display: flex; flex-direction: column; gap: 15px">
        <div><div class="num" style="font-size: 10px; color: ${D.tx3}">31 / 600 / tabular — angka metrik</div><div class="num" style="font-size: 31px; font-weight: 600; color: ${D.tx1}">231</div></div>
        <div><div class="num" style="font-size: 10px; color: ${D.tx3}">tabular-nums wajib</div><div class="num" style="font-size: 20px; color: ${D.tx2}">1.847 · 0.91 · 12 dtk</div></div>
        <div><div class="num" style="font-size: 10px; color: ${D.tx3}">11.5 mono — identitas mesin</div><div class="num" style="font-size: 11.5px; color: ${D.tx2}">vania_ltm_ops · db_vania · #2201</div></div>
        <div style="padding: 13px 15px; border-radius: 12px; background: ${D.sunken}; box-shadow: ${D.sunk}">
          <p style="margin: 0; font-size: 11.5px; line-height: 1.65; color: ${D.tx3}">Angka di dasbor ini berdetak tiap 5 detik. Tanpa <span class="num" style="color: ${D.tx2}">tabular-nums</span> lebar digit berubah dan layout goyang tiap update.</p>
        </div>
      </div>
    </div>
  </section>

  <!-- Palet -->
  <section style="margin-bottom: 28px; padding: 26px 28px; border: 1px solid ${D.line}; border-radius: 20px; background: ${D.s1}; box-shadow: ${D.sh1}, ${D.inset}">
    <h2 style="margin: 0 0 6px; font-size: 15px; font-weight: 600; color: ${D.tx1}">Palet</h2>
    <p style="margin: 0 0 22px; font-size: 12px; color: ${D.tx3}">Netral condong dingin (hue 264). Aksen dan status berbagi chroma, cuma hue-nya beda.</p>
    <div style="display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 26px">
      <div style="padding: 20px; border-radius: 16px; background: ${D.bg}">
        <div style="margin-bottom: 15px; font-size: 10.5px; text-transform: uppercase; letter-spacing: .14em; color: ${D.tx3}">Gelap</div>
        <div style="display: flex; flex-direction: column; gap: 7px">
${P.dark}
        </div>
      </div>
      <div style="padding: 20px; border-radius: 16px; background: ${L.bg}">
        <div style="margin-bottom: 15px; font-size: 10.5px; text-transform: uppercase; letter-spacing: .14em; color: ${L.tx3}">Terang</div>
        <div style="display: flex; flex-direction: column; gap: 7px">
${P.light}
        </div>
      </div>
    </div>
  </section>

  <!-- Elevasi -->
  <section style="margin-bottom: 28px; padding: 26px 28px; border: 1px solid ${D.line}; border-radius: 20px; background: ${D.s1}; box-shadow: ${D.sh1}, ${D.inset}">
    <h2 style="margin: 0 0 6px; font-size: 15px; font-weight: 600; color: ${D.tx1}">Elevasi</h2>
    <p style="margin: 0 0 8px; font-size: 12px; color: ${D.tx3}">Lima tingkat. Hierarki dibentuk ketinggian permukaan, bukan opasitas — nol transparansi, nol blur.</p>
    <div style="display: flex; gap: 10px; margin-bottom: 22px; padding: 13px 16px; border-radius: 12px; background: ${D.sunken}; box-shadow: ${D.sunk}">
      <p style="margin: 0; font-size: 11.5px; line-height: 1.65; color: ${D.tx2}"><strong style="color: ${D.tx1}">Aturan yang beda antar tema:</strong> di terang, elevasi dibawa <em>bayangan</em> — permukaan tetap putih. Di gelap bayangan nyaris tak terlihat, jadi elevasi dibawa <em>terang permukaan</em> plus garis sorot 1px di tepi atas. Jangan cuma tukar warna: mekanismenya memang beda.</p>
    </div>
    <div style="display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 26px">${elevBlock(D, true)}${elevBlock(L, false)}
    </div>
  </section>

  <!-- Status + radius -->
  <section style="display: grid; grid-template-columns: 1.35fr 1fr; gap: 20px">
    <div style="padding: 26px 28px; border: 1px solid ${D.line}; border-radius: 20px; background: ${D.s1}; box-shadow: ${D.sh1}, ${D.inset}">
      <h2 style="margin: 0 0 6px; font-size: 15px; font-weight: 600; color: ${D.tx1}">Status</h2>
      <p style="margin: 0 0 20px; font-size: 12px; color: ${D.tx3}">Empat tingkat, dipakai di semua layar. <strong style="color: ${D.tx2}">Bentuknya beda, bukan cuma warnanya</strong> — emerald lawan rose gak kebedain buat mata yang susah bedain merah-hijau.</p>
      <div style="display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 22px">
        <div style="padding: 16px; border-radius: 14px; background: ${D.bg}">
          <div style="margin-bottom: 12px; font-size: 10.5px; text-transform: uppercase; letter-spacing: .14em; color: ${D.tx3}">Gelap</div>
          <div style="display: flex; flex-direction: column; gap: 7px">
${toneRow(D, true)}
          </div>
        </div>
        <div style="padding: 16px; border-radius: 14px; background: ${L.bg}">
          <div style="margin-bottom: 12px; font-size: 10.5px; text-transform: uppercase; letter-spacing: .14em; color: ${L.tx3}">Terang</div>
          <div style="display: flex; flex-direction: column; gap: 7px">
${toneRow(L, false)}
          </div>
        </div>
      </div>
    </div>

    <div style="padding: 26px 28px; border: 1px solid ${D.line}; border-radius: 20px; background: ${D.s1}; box-shadow: ${D.sh1}, ${D.inset}">
      <h2 style="margin: 0 0 6px; font-size: 15px; font-weight: 600; color: ${D.tx1}">Radius</h2>
      <p style="margin: 0 0 20px; font-size: 12px; color: ${D.tx3}">Ramp yang ada dipertahankan — turunan <span class="num">--radius: .625rem</span>.</p>
      <div style="display: flex; flex-direction: column; gap: 10px">
        <div style="display: flex; align-items: center; gap: 13px"><span style="width: 42px; height: 42px; border-radius: 10px; background: ${D.s2}; border: 1px solid ${D.line}; box-shadow: ${D.sh1}, ${D.inset}"></span><span class="num" style="width: 46px; font-size: 11.5px; color: ${D.tx1}">10px</span><span style="font-size: 11px; color: ${D.tx3}">pil, chip kecil</span></div>
        <div style="display: flex; align-items: center; gap: 13px"><span style="width: 42px; height: 42px; border-radius: 12px; background: ${D.s2}; border: 1px solid ${D.line}; box-shadow: ${D.sh1}, ${D.inset}"></span><span class="num" style="width: 46px; font-size: 11.5px; color: ${D.tx1}">12px</span><span style="font-size: 11px; color: ${D.tx3}">baris, kotak ikon</span></div>
        <div style="display: flex; align-items: center; gap: 13px"><span style="width: 42px; height: 42px; border-radius: 14px; background: ${D.s2}; border: 1px solid ${D.line}; box-shadow: ${D.sh1}, ${D.inset}"></span><span class="num" style="width: 46px; font-size: 11.5px; color: ${D.tx1}">14px</span><span style="font-size: 11px; color: ${D.tx3}">tombol, item nav</span></div>
        <div style="display: flex; align-items: center; gap: 13px"><span style="width: 42px; height: 42px; border-radius: 18px; background: ${D.s2}; border: 1px solid ${D.line}; box-shadow: ${D.sh1}, ${D.inset}"></span><span class="num" style="width: 46px; font-size: 11.5px; color: ${D.tx1}">18px</span><span style="font-size: 11px; color: ${D.tx3}">kartu, panel</span></div>
        <div style="display: flex; align-items: center; gap: 13px"><span style="width: 42px; height: 42px; border-radius: 20px; background: ${D.s2}; border: 1px solid ${D.line}; box-shadow: ${D.sh1}, ${D.inset}"></span><span class="num" style="width: 46px; font-size: 11.5px; color: ${D.tx1}">20px</span><span style="font-size: 11px; color: ${D.tx3}">sidebar, vonis</span></div>
      </div>
      <div style="margin-top: 20px; padding: 13px 15px; border-radius: 12px; background: ${D.sunken}; box-shadow: ${D.sunk}">
        <p style="margin: 0; font-size: 11.5px; line-height: 1.65; color: ${D.tx3}">Turun dari <span class="num" style="color: ${D.tx2}">22px</span> ke <span class="num" style="color: ${D.tx2}">18px</span> buat kartu: permukaan padat butuh sudut lebih tegas dari panel kaca, dan kepadatan tabel jadi kejaga.</p>
      </div>
    </div>
  </section>
</div>
</x-dc>

<script data-dc-script data-props='{"$preview":{"width":1280,"height":1620}}'>
class Component extends DCLogic {}
</script>
</body>
</html>
`;
writeFileSync("Fondasi.dc.html", html);
console.log("Fondasi.dc.html", html.length, "byte");
