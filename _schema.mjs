import pg from "pg";
import { readFileSync } from "fs";
const env = Object.fromEntries(readFileSync(".env","utf8").split("\n").filter(Boolean).map(l=>{const i=l.indexOf("=");return [l.slice(0,i), l.slice(i+1)];}));
const pool = new pg.Pool({ connectionString: env.VANIA_DATABASE_URL });
const t = await pool.query(`SELECT table_name FROM information_schema.tables WHERE table_schema='public' ORDER BY table_name`);
console.log("TABLES:", t.rows.map(r=>r.table_name).join(", "));
const c = await pool.query(`SELECT table_name, column_name, data_type, is_nullable FROM information_schema.columns WHERE table_schema='public' ORDER BY table_name, ordinal_position`);
let cur=null;
for (const r of c.rows){ if(r.table_name!==cur){cur=r.table_name;console.log("\n== "+cur);} console.log(`   ${r.column_name} :: ${r.data_type}${r.is_nullable==='NO'?' NOT NULL':''}`); }
await pool.end();
