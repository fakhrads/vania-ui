const rows = [
  ["ok","add","hermes","fakhri",1,0,"","22 Agt 13.58"],
  ["ok","recall","plugin","fakhri",0,0,"","22 Agt 13.51"],
  ["ok","replace","hermes","fakhri",1,1,"","22 Agt 13.47"],
  ["skip","add","hermes","fakhri",0,0,"transien — konten sudah ada di korpus","22 Agt 13.30"],
  ["ok","sync_file","cron","fakhri",0,0,"","22 Agt 13.30"],
  ["ok","add","web","abiane",2,0,"","22 Agt 12.58"],
  ["ok","recall","plugin","fakhri",0,0,"","22 Agt 12.44"],
  ["error","sync_file","cron","fakhri",0,0,"MEMORY.md: 12 baris berkas vs 9 baris korpus","22 Agt 11.02"],
  ["ok","edit","hermes","fakhri",0,0,"","22 Agt 11.20"],
  ["ok","remove","hermes","abiane",0,1,"","22 Agt 10.14"],
  ["ok","add","hermes","fakhri",1,0,"","22 Agt 09.36"],
  ["skip","add","hermes","fakhri",0,0,"transien — konten sudah ada di korpus","22 Agt 09.35"],
  ["ok","repair","cron","fakhri",0,0,"","22 Agt 08.00"],
  ["ok","recall","plugin","abiane",0,0,"","22 Agt 07.51"],
  ["ok","add","hermes","fakhri",3,0,"","21 Agt 22.19"],
];
const DOT = {
  ok: '<svg width="10" height="10" viewBox="0 0 10 10"><circle cx="5" cy="5" r="4" fill="var(--ok)"></circle></svg>',
  skip: '<svg width="10" height="10" viewBox="0 0 10 10"><path d="M5 1 9.3 8.5H.7Z" fill="var(--warn)"></path></svg>',
  error: '<svg width="10" height="10" viewBox="0 0 10 10"><path d="M5 .6 9.4 5 5 9.4.6 5Z" fill="var(--bad)"></path></svg>',
};
const ACT = {
  add: "--active", replace: "--seed", remove: "--evicted", recall: "--entity",
  repair: "--bad", sync_file: "--archive", edit: "--warn",
};
const ACTBG = {
  add: "--ok-bg", replace: "--accent-bg", remove: "--warn-bg", recall: "--accent-bg",
  repair: "--bad-bg", sync_file: "--idle-bg", edit: "--warn-bg",
};
const out = rows.map(([st, act, src, scope, add, ev, err, ts], i) => {
  const raised = i === 0;
  const rowStyle = raised
    ? "display: flex; align-items: center; gap: 14px; padding: 11px 18px; margin: 0 -1px; border-radius: 12px; background: var(--surf2); border: 1px solid var(--line); box-shadow: var(--sh1), var(--inset); position: relative; z-index: 1"
    : "display: flex; align-items: center; gap: 14px; padding: 11px 19px; border-top: 1px solid var(--line-soft)";
  const delta = [
    add > 0 ? `<span style="color: var(--ok)">+${add}</span>` : "",
    ev > 0 ? `<span style="color: var(--evicted)">−${ev}</span>` : "",
  ].filter(Boolean).join(" ");
  const msg = err
    ? `<span style="flex-grow: 1; font-size: 11.5px; color: var(${st === "error" ? "--bad" : "--tx3"}); overflow: hidden; text-overflow: ellipsis; white-space: nowrap">${err}</span>`
    : `<span style="flex-grow: 1"></span>`;
  return `          <div style="${rowStyle}">
            ${DOT[st]}
            <span class="num" style="width: 78px; padding: 3px 10px; border-radius: 999px; font-size: 11px; text-align: center; color: var(${ACT[act]}); background: var(${ACTBG[act]})">${act}</span>
            <span style="width: 54px; font-size: 11px; color: var(--tx3)">${src}</span>
            <span style="width: 52px; font-size: 11.5px; color: var(--tx2)">${scope}</span>
            <span class="num" style="width: 62px; font-size: 11.5px; color: var(--tx3)">${delta}</span>
            ${msg}
            <span class="num" style="flex-shrink: 0; font-size: 11.5px; color: var(--tx3)">${ts}</span>
          </div>`;
}).join("\n");
process.stdout.write(out + "\n");
