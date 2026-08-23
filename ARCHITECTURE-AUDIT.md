# Caduceus — Product & Technical Architecture Audit

**Auditor:** Principal Systems Architect & Product Strategist (30-year veteran — autonomous agent observability, distributed knowledge graphs, developer tooling)
**Scope:** `/home/fakhrads/caduceus` @ commit `e646635` (Aug 23 2026)
**Stack audited:** Next.js 16.3.1 (App Router, RSC) · React 19.2.8 · TS 5 · Tailwind v4 · pg/pgvector (remote Postgres) · better-sqlite3 (dead) · react-force-graph-2d · d3-force-3d · recharts · jose · Dokploy/Docker
**Live:** https://caduceus.fakhrads.dev

> **Note on stale artifacts:** `graphify-out/GRAPH_REPORT.md` was built from commit `94c202b`, which predates the Kanban/Subagent/Soft-Depth work (now at `e646635`). Run `graphify update .` to refresh; the report below supersedes it.

---

## 0. Executive Summary

Caduceus is an unusually well-crafted **single-viewer read-only observability console** for a Hermes agent: it is fast, disciplined (documented read-only posture, no write endpoints to `vania_*`), and visually distinctive (mature oklch soft-depth tokens, dual theme, GPU-conscious static surfaces). Its DNA is *agent memory explorer + knowledge graph*, not yet *agent execution observability* — which is the category it is now entering (Kanban + subagent live tracking).

**Highest-leverage findings, ranked:**

| # | Finding | Class | Impact |
|---|---|---|:--|
| F1 | Pure HTTP polling everywhere; no streaming/SSE/pubsub | Scalability/UX | Critical to agent-observability ambition |
| F2 | `src/lib/sqlite.ts` is **dead code** — never imported (postgres write-migration left it behind) | Hygiene/Confusion | Med (must decide + delete or revive) |
| F3 | Search = `ILIKE '%q%'` with leading wildcard → **no index can be used**; pgvector never actually queried (semantic) | Scalability/Product | High at corpus scale |
| F4 | Real-time view and replay debugging absent; only point-in-time snapshots | Product gap | Critical for multi-agent workflows |
| F5 | Auth = single-user JWT in `localStorage`; no redaction; sensitive `transcript_json`/`body` exposed unguarded | Security | High |
| F6 | Graph canvas renders full corpus on a 60s poll; no clustering/remote nodes/budgeting | UX/Perf | Med-High |
| F7 | No `SELECT … WHERE embedding IS NOT NULL` for vector calls; no HNSW index strategy surfaced | Scalability | Med |
| F8 | Kanban/agents pages poll 3s but data freshness is capped by producer interval (containers read remote Postgres only) | Correctness | Med |

---

## 1. Product Architecture & Positioning

### 1.1 What Caduceus actually is
A **read-only, single-operator desktop/mobile "mission control"** for one Hermes agent's long-term memory (LTM) and, increasingly, its task pipeline. Nine routes (plus login):

| Route | Endpoint | What it shows | Data source |
|---|---|---|---|
| `/` Kesehatan | `GET /api/health` | 7 parallel queries: watchdog verdict, corpus by scope×kind×audience, ops-24h, hourly timeline, recent 12 ops, staleness lag, embedding coverage | `vania_health`, `vania_ltm`, `vania_ltm_ops` |
| `/kanban` | `GET /api/kanban` | Multi-agent task pipeline (backlog/in-progress/review/done), worker PID, branch, failure counts | `vania_kanban_tasks` |
| `/agents` | `GET /api/agents` | Subagent delegations (`delegate_task`), state machine, live transcript from `transcript_json` | `vania_subagents` |
| `/ltm` Korpus | `GET /api/ltm` | Paginated LTM with kind/scope/q filters | `vania_ltm` |
| `/graph` | `GET /api/graph` | Force-directed entry↔entity graph (Obsidian-like local graph) | `vania_ltm` |
| `/ops` Audit | `GET /api/ops` | Paginated op audit log | `vania_ltm_ops` |
| `/search` Cari | `POST /api/search` | ILIKE across inbox + obs + ltm | 3 tables |
| `/inbox`, `/observations` | GET | Ancient/active message and observation tables | `vania_inbox_legacy`, `vania_obs_active` |
| `/api/stats` | `GET` | Corp-level counts for dashboard | counts |

### 1.2 Competitive positioning (30-yr read)

| Capability | Caduceus | LangSmith | Arize Phoenix | AgentOps | Obsidian | Linear |
|---|---|---|---|---|---|---|
| LTM/vector memory explorer | **Own concept** (agent memory as first-class) | Trace explorer only | spans/traces, no memory | traces, agents | graph notes | issues only |
| Knowledge graph | Obsidian-class **2D canvas**, local-graph isolate | none | none | none | native | none |
| Multi-agent task board | basic Kanban (read-only) | datasets+annotations | eval suites | runs | none | native, mutable |
| Replay/debug | **none** | step-level playback | rich traces | traces | n/a | none |
| Token cost analytics | **none** | per-run cost | per-trace cost | cost tracking | none | none |
| Eval pipelines | **none** | rich | rich | rich | none | none |
| Feedback/HITL | **none** | annotations | human-opinion | none | none | issue comments |
| Export/plugin SDK | none | SDKs everywhere | OTel-native | SDK | plugins | API/automations |

**Strategic insight:** Nobody owns "LTM memory + knowledge graph + agent task pipeline in one self-hosted pane." Caduceus's wedge is real. But LangSmith/Phoenix win on *traces*: they capture **every tool call, token, latency, and diff** and let you replay. Caduceus currently captures **outcomes** (ops rows, final results, transcripts-as-rows) but not **causal structure**. To compete on observability, it must stop being a *status board* and become a *trace store with replay* — while keeping its differentiated memory-graph view as the moat.

**The single-operator assumption is the winning constraint** — but it is also the ceiling. The read-only, single-viewer posture is a great v1 discipline, but the moment you want multi-device viewing, alerting, or sharing, the localStorage-JWT and single-browser graph-position cache become blockers.

---

## 2. Deep Technical Gaps & Scalability Bottlenecks

### 2.1 Data flow & sync model (the crux)
- **Producers write → this app only ever *reads*.** `vania_kanban_tasks`, `vania_subagents`, `vania_ltm_ops`, `vania_health` are populated by Hermes-side jobs (a `reconcile.py` watchdog writes the health verdict; a sync ships kanban/subagent state). The app has **no ingest, no webhook, no event loop** — it just queries whatever the last producer wrote.
- **Container-to-machine gap.** `state.db` and `kanban.db` (SQLite, WAL) live on the Hermes machine (`~/.hermes/`). The app runs in Dokploy container. Early commits (`5ae7c51`) read SQLite directly; a later commit (`e968211`) moved resources to Postgres. The SQLite sync layer (`src/lib/sqlite.ts`, `better-sqlite3`, `getKanbanDb`/`getStateDb`, `{readonly:true, WAL}`) is **never imported anywhere** — it is leftover from that migration.

**Bottleneck:** freshness = producer flush interval, not reader pull. The "live" dot on Kanban/Subagents is polling Postgres every 3s at best. If the domain writer flushes every 30–60s, the UI registers change only after that delay regardless of poll cadence. A `watchdog` verdict (`vania_health`) is only as stale as its last reconcile, and the code *knows* this (`lag.sinceLastCheck`) but offers no visible signal for "watchdog stopped."

### 2.2 Real-time vs polling
- `useLive<T>(url, ms)` polls on a timer, **visibility-aware** (`document.hidden` gate — genuinely good). But it is pull-based; an armistice page can miss transitions entirely if the poll interval misses them.
- Worst case burst: Kadash/agents poll every **3s**, health every 5s, graph every 60s — that’s a tiny QPS against a 5-connection pool, so no overload today. But at scale, N dashboard tabs × 3s → connection churn on WAL/Postgres, needless DB hammering while a terminal is idle.
- **There is no `Content-Type: text/event-stream`, no Server-Sent Events, no WebSocket, no `React Server Actions` streaming composer in this repo.** (Confirmed: zero matches.) For terminal-with-live-pipes, SSE + `ReadableStream` (Next Route Handlers support both) is the correct, low-tech, CDN/Dokploy-friendly fix — idle React dynamic IO flushing sends keepalive, no client lib needed.

### 2.3 Search — the fundamental index gap (F3)
`POST /api/search` runs **three `ILIKE $1` with `%q%` leading wildcards** across `turn_text`, `claim`, `content`. PostgreSQL can still use a `pg_trgm` index for ILIKE with wildcards (GIN trigram), but **no index is declared in an explicit migration**, and there is no query path **at all** for the pgvector `embedding` column — the one genuinely differentiated vector corpus is never searched semantically. The `/api/search` route has no vector path at all — there is no `embedding IS NOT NULL` filter, no `<=>` operator, no HNSW tuning, no cosine. This is the single biggest **architectural** gap between "table explorer" and "LTM search."

### 2.4 SQLite WAL / concurrency
- The dead `sqlite.ts` opened WAL `{readonly:true}` **but fileMustExist:false** — a silent misconfig: it would lazily *create* a WAL file on the container even in readonly if path resolution differed, and WAL lockouts (`SQLITE_BUSY`) are the classic failure for a single-node read app. Since it’s dead code, the risk is moot — **but it must be deleted** so nobody revives an anti-pattern reading SQLite from a stateless container across a network FS (NFS/EFS-backed WAL is a documented deadlock source).

### 2.5 Memory & rendering footprint
- **ForceGraph2D holds the entire corpus in one JS graph** on a 60s refresh. `nodeCanvasObject` custom-paints every node + halo per frame; `cooldownTicks={80}` and per-node `measureText` for labels are O(n) per frame. At thousands of entries this is CPU/GC-heavy; on mobile it bricks.
- The **watchfully nice** incremental sync (`fx/fy` pins, `looseRef` set freeing new nodes, localStorage position cache v2) is genuinely strong engineering — JSON-parse of full corpus every 60s is the real cost, plus full re-simulation reheat.
- `recharts` loaded for the one 24h activity chart pulls a huge dep into every page (Next bundles per route, but recharts weight is per-page).

### 2.6 Postgres pool / query discipline
- `db.ts`: a single `pg.Pool` with `max:5`, no query timeout, no connection string validation, **no read-pool/standby split**, no `statement_timeout`. Health does 7 queries in `Promise.all` — correct parallelization, but each handler re-enters auth (`requireAuth` + `jwtVerify` — fine) so every poll does JWT decode.

---

## 3. Strategic Feature Improvements (missing capabilities)

### 3.1 Multi-agent workflows (the whole point of kanban+subagents exists but is *read-only outcome board*)
1. **Structured trace capture** — a `vania_traces` (run_id, agent, parent, event_type, ts, input, output, tok_io, latency, model, tool, error). Aggregate `transcript_json` into event rows; gives stats + replay + filter.
2. **Per-agent live status with heartbeat/age-of-last-update** — the single most useful "is this still alive" signal; currently implicit.
3. **Worker/US signal** — `owner_pid` exists; host it into a process telemetry table (cpu/mem/pid/alive) rather than static int.
4. **Human-in-the-loop approvals/checkpoints** — Caduceus is *read-only*, but a *separate* opt-in `vania_approvals` queue (safe-sandbox actions awaiting human go/a-bort) is the natural next feature that doesn't violate the "don't mutate memory" posture (it mutates a *task queue*, not memory).

### 3.2 Replay & debugging
- Add `/api/traces/{id}/events` cursor + a replay UI (step, jump, speed, token/branch diff). LangSmith/Phoenix all have this; Caduce has zero. This is the #1 recall gap for a KB tool.

### 3.3 Evaluation pipelines
- Evaluate on the trace store: pass/judge scores, dataset export (`vania_evals`), regression comparison. Hugging Face evals + OpenAI — at minimum a small `vania_eval_runs` spine + a chart.

### 3.4 Token cost analytics
- `transcript_json`/`task_json` presumably hold token counts — surface **per-day / per-agent / per-model tokens & USD** aggregated. Right now the only cost-ish signal is opaque op counts.

### 3.5 Security & redaction
- `transcript_json` and kanban `body` are raw agent text → **secrets, API keys, PII, private memory — returned to any authenticated viewer**.
- Mitigations: (a) server-side redaction pipeline (regex/LLM scrub) before serialization; (b) field-level row gating; (c) single-user is fine but must not rely on `localStorage`-only credential (httpOnly+Secure cookie is strictly better; move token to cookie with `SameSite=Lax`); (d) **these tables likely carry customer/private data — never expose raw `body` of transcripts to the web tier**, or at least make redaction a hard config default.

### 3.6 Misc high-value
- Search across embeddings (`<=>` on `embedding`, HNSW index), not ILIKE only.
- Retention/eviction dash (already `rows_evicted` in ops) + a "vacuum/embedding gap" view.
- Export (markdown/CSV) for vault portability.
- Alerts/watchdog state — `lag.since_last_op` is *alertable*; wire a DSL to surface "watchdog hasn't run in X."

---

## 4. UX/UI & Soft-Depth Evolution

### 4.1 What’s already excellent
- **Soft-depth token discipline** is genuinely above average: oklch tokens, elevation via layered shadows on solid surfaces, no glassmorphism, no transparencies, `prefers-reduced-motion` honored, `tabular-nums` everywhere, 4-level semantic `Tone`, dual full theme with **flicker-free boot script**, 3-mode override incl. system.
- **Graph UX nice**: local-graph isolate, focus-on-hub camera, per-node-per-empty-label toggle persisted to localStorage, dual explicit canvas palettes (not CSS vars — real awareness of canvas limitation).
- **Read-only framing** is a coherent, communicable product thesis.

### 4.2 Gaps & evolution
1. **Information hierarchy on dense tables** — ops/ltm/inbox/obs are raw paginated tables; no summary sparkline, no column pin/shadow, no quick-filter chips. Density is right; **affordance for exploratory filtering** is missing.
2. **Terminal/transcript streaming UX** — single-pane scrollable black-on-well transcript. Needs: colorized ANSI-aware log lines, line-wrap control, auto-scroll lock, word-wrap vs preserve, copy-per-line. This is the make-or-break UX for the "live tracker" promise.
3. **3D graph** — v1 is 2D via `react-force-graph-2d`. There's a `d3-force-3d` import only for `forceCollide`. If you ship a 3D toggle, it must be **GPU-driven & budgeted** (cluster uncollapsed subgraphs, cap nodes ~800, virtual/dynamic label) or it will brick mobile. Also: compound/jade node colors per kind, edge-dash for chain, density-scaled opacity.
4. **Density lineage** — the soft-depth migration is solid; next is to add a **unified metric rail** (corpus health, cost trend, latency) above the per-view tables so the "mission control" reads as one system, not 7 stacked screens.
5. **Mobile**: bottom-nav is smart; ensure kanban columns become horizontal swipe (read-only) not a 4-column grid crammed (current CSS: `grid-cols-1 lg:grid-cols-4` → it stacks on mobile — acceptable, but add horizontal-scroll columns for glanceability).

---

## 5. Comprehensive Actionable Roadmap

### Phase 1 — Immediate high-impact quick wins (1–2 weeks, no architectural debt)
1. **Delete dead layer cleanly** — remove `src/lib/sqlite.ts` + `better-sqlite3` dep. Eliminate the leftover SQLite path entirely; document the Postgres-only contract in AGENTS.md/README. *(removes a real maintenance trap)*
2. **Search correctness sprint** — add a **GIN`pg_trgm`** index on `turn_text`/`claim`/`content` (per `HERMES` side or a migration) and a **HNSW** index on `embedding`; add an `embedding` semantic search path backed by `<=>` ranking. Fast, safe, and immediately unlocks the vector moat.
3. **Add SSE streaming for `/agents` / `/kanban`** — replace the 3s poll with an SSE `ReadableStream` when a client asks for updates; only DB change is a note to raise producer flush interval. Low-risk, big UX win; keep `useLive` as fallback.
4. **Alert on `lag`** — if `since_last_op` / `since_last_check` exceed a quiet threshold, surface a `warn`/`bad` banner (already have the data in `/health`). 30 min of work, real "watchdog" value.
5. **Redaction quick pass** — at serialization, run a configurable `secrets.rb` scrub over `transcript_json`/`body` before emitting; don’t wait for the auth rewrite.
6. **Cost-light** token sum from `task_json`/`result_json` on the subagent list (pid + token column) — parse once, store suggested.

### Phase 2 — Deep architectural refactors (weeks 3–8)
1. **Introduce writer-owned trace spine** — a `vania_traces`/`vania_events` series with (agent_id, run_id, parent_event, ts, kind, input, output, tokens, model, latency, error). Replay + filter all derive here. Producer writes it (Hermes-side), app reads-only.
2. **Auth rewrite** — shift from localStorage don’t-store-JWT to **httpOnly Secure `SameSite=Lax` cookie via `jose`**, add CSRF protection for any mutating gate; keep single-user as default, but open a `roles`/`viewer` matrix later.
3. **Observability server (optional but owning the category)** — separate worker reading `state.db`-side deltas and pushing to Postgres at fast cadence (or SSE from container and **drop Postgres entirely for live views**; keep Postgres as the durable corpus). This arms toward Phoenix/LangSmith parity.
4. **Real FTS migration** — when ILIKE degrades at 100k+ rows: move search to `tsvector`/`search` (Postgres) + `embedding` hybrid (RAG rerank). Do this in Phase 2, not Phase 1, since corpus is still small.

### Phase 3 — Open-source ecosystem & extensibility (months 2+)
5. **Plugin/extension mechanism** — a spec for third-party producers to write to the same contract (Markdown/JSON or CSV export, or JSON over MCP SSE to a collection shim). Caduceus should be the **web front-end** an MCP client, not a hardcoded single-Hermes dashboard.
6. **Schema documentation artifact** — publish the `vania_*` tables + sync contract as `docs/SYNC-CONTRACT.md`, plus a migration runner (actual `migrations/*.sql`) for security & onboarding.
7. **Multi-viewer / linked identity** (optional) — if open-source traction confirms, adapt the single-operator assumption to `viewer` / `admin` roles behind the current read-only wall.
8. **Public DevRel assets** — README quickstart for *"bring your own Hermes memory"*, screenshots, a live demo mode, commit-for-playground.

---

## 6. Appendix — concrete code-level observations

| File | Finding | Severity |
|---|---|---|
| `src/lib/sqlite.ts` | Unreferenced WAL `{readonly:true,fileMustExist:false}` leftover | Dead code trap |
| `src/app/api/search/route.ts` | `ILIKE '%q%'` ×3; no vector path; no trgm index | H |
| `src/app/api/graph/route.ts` | `ENTITIES` list duplicated against `~/.hermes/scripts/vania-obsidian-export.py` (two-hand edit risk) | M |
| `src/lib/auth.ts` | Hardcoded fallback secret/username/password **in source** (`"vania-memory-manager-fakhri-2026"`, `"vn-memory-2026"`) | **Critical security** — outside `.env` |
| `src/lib/auth-fetch.ts` | Token in `localStorage`, auto-redirect on 401 (OK) but no rotation, no httpOnly cookie | H |
| `src/lib/db.ts` | No pool timeout / statement timeout / size checks | M |
| `src/app/agents/page.tsx`, `kanban/page.tsx` | 3s poll over Postgres; freshness owned by producer | M |
| `src/app/graph/page.tsx` | Full-corpus canvas repaint on refresh loop; no cluster/downsample | M‒H |
| All pages | Read-only posture excellent; table-render logic duplicated across ~7 screen files (extract a shared Table part) | M |
| `src/app/api/agents/route.ts` | `SELECT *`, raw `task_json`/`result_json` parsed and returned | H (data exposure) |
| `package.json` | `better-sqlite3`+`d3-force-3d` deps only used by dead/2D code | prune |

**Security note (F5/F6)**: the **fallback hardcoded credential pair in `auth.ts`** is the single most urgent fix — if `AUTH_*` envs are missing at deploy, the known default credential works. Remove the source-code fallbacks; **fail closed**.

---

*Audit complete — see `ARCHITECTURE-AUDIT.md`.*