const T = [
  ["bg","latar halaman","oklch(.168 .008 264)","oklch(.951 .004 264)"],
  ["sunken","sumur / track","oklch(.142 .008 264)","oklch(.922 .005 264)"],
  ["surf1","kartu","oklch(.222 .009 264)","oklch(1 0 0)"],
  ["surf2","terangkat","oklch(.262 .010 264)","oklch(1 0 0)"],
  ["surf3","overlay","oklch(.305 .011 264)","oklch(1 0 0)"],
  ["line","garis","oklch(.318 .012 264)","oklch(.905 .006 264)"],
  ["line-soft","garis samar","oklch(.262 .010 264)","oklch(.935 .005 264)"],
  ["tx1","teks utama","oklch(.962 .004 264)","oklch(.260 .014 264)"],
  ["tx2","teks kedua","oklch(.780 .008 264)","oklch(.460 .012 264)"],
  ["tx3","teks redup","oklch(.620 .010 264)","oklch(.600 .010 264)"],
  ["accent","aksen","oklch(.720 .130 274)","oklch(.550 .160 274)"],
  ["ok","status ok","oklch(.780 .140 158)","oklch(.550 .140 158)"],
  ["warn","status warn","oklch(.830 .130 78)","oklch(.600 .130 70)"],
  ["bad","status bad","oklch(.720 .160 18)","oklch(.550 .190 22)"],
  ["idle","status idle","oklch(.620 .010 264)","oklch(.600 .010 264)"],
  ["seed","kind seed","oklch(.750 .130 240)","oklch(.550 .140 240)"],
  ["active","kind active","oklch(.780 .140 158)","oklch(.550 .140 158)"],
  ["evicted","kind evicted","oklch(.830 .130 78)","oklch(.600 .130 70)"],
  ["archive","kind archive","oklch(.620 .010 264)","oklch(.600 .010 264)"],
  ["entity","node entitas","oklch(.740 .130 300)","oklch(.550 .160 300)"],
  ["read","chart baca","oklch(.720 .130 250)","oklch(.550 .150 250)"],
  ["write","chart tulis","oklch(.700 .140 300)","oklch(.520 .170 300)"],
];
const row = (t, dark) => {
  const v = dark ? t[2] : t[3];
  const tx = dark ? "#f2f3f7" : "#22262f";
  const sub = dark ? "#9da3b0" : "#6b7180";
  const bd = dark ? "rgba(255,255,255,.14)" : "rgba(17,20,34,.12)";
  return `        <div style="display: flex; align-items: center; gap: 11px">
          <span style="width: 26px; height: 26px; flex-shrink: 0; border-radius: 8px; background: ${v}; border: 1px solid ${bd}"></span>
          <span style="width: 74px; flex-shrink: 0; font-size: 11.5px; color: ${tx}" class="num">${t[0]}</span>
          <span style="flex-grow: 1; font-size: 11px; color: ${sub}">${t[1]}</span>
          <span class="num" style="font-size: 10.5px; color: ${sub}">${v}</span>
        </div>`;
};
const col = (dark) => T.map((t) => row(t, dark)).join("\n");
process.stdout.write(JSON.stringify({ dark: col(true), light: col(false) }));
