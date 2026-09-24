# Provenance

Production-oriented multi-tenant RAG platform for source-grounded AI assistants.

Provenance ships with assistant templates for:

- Legal research
- Tax & accounting
- Health information
- Study/revision
- Portfolio management (allocation/exposure/diversification only; no price forecasts, options calls or market timing)
- General document analysis
- Fully custom assistants

Users can create and name assistants, attach private documents, choose jurisdiction defaults, enable web search per bot/per turn, and inspect the exact retrieved source chunks behind citations.

## What is implemented

### Web SaaS

- Next.js App Router + TypeScript + Tailwind
- Supabase SSR authentication/session refresh
- Personal workspace bootstrap on signup
- RLS-protected multi-tenant schema
- Bot templates and custom instructions
- Coarse IP-derived jurisdiction suggestion with explicit editable confirmation
- Private signed document uploads (50 MB/file)
- Multi-file upload with live queue/status UI, retry and deletion controls
- Streaming AI chat with AI Elements/Streamdown markdown rendering
- Hybrid pgvector + PostgreSQL FTS retrieval with RRF
- HNSW vector index
- Effective-date/current-source filtering
- Clickable internal RAG citations and source inspection page
- Optional OpenAI web-search tool per turn
- Persistent conversation history with new-chat/delete flows and assistant settings
- Atomic conversation persistence, validated AI SDK message payloads and abort-safe stream persistence
- Atomic abuse-resistant daily chat quota reservation
- Signup confirmation, login/logout and password-recovery flow
- Settings and jurisdiction defaults

### Document worker

- Dedicated Python container (not serverless OCR)
- Docling conversion
- Docling HybridChunker with structural metadata/table handling
- Page/heading provenance retention
- OpenAI embeddings (1536 dimensions)
- `FOR UPDATE SKIP LOCKED` horizontal job claiming
- Retry/stale-lock recovery
- SHA-256 content hashing
- Immutable document versions
- Source-registry refresh tool with redirect-aware SSRF controls, bounded downloads and continuity of the last ready version
- Optional fail-closed ClamAV scanning for user uploads and curated-source refreshes
- Jurisdiction-pack manifest importer

### Portfolio Manager

The portfolio module accepts positions manually or via CSV and deterministically computes:

- portfolio weights
- largest / top-3 / top-5 concentration
- HHI concentration
- effective number of holdings (`1 / HHI`)
- sector exposure
- industry metadata
- asset-class exposure
- geographic exposure
- currency exposure
- account exposure
- security-level aggregation across duplicate account line items
- concentration/data-quality flags

The Portfolio Manager AI receives those calculations as trusted deterministic context. Its policy expressly blocks price targets, return forecasts, stock/ETF/crypto predictions, options strategies, leverage calls and market timing.

## Repository

```text
.
├── apps/
│   ├── web/                 # Next.js SaaS
│   └── worker/              # Docling/embedding ingestion worker
├── supabase/
│   ├── migrations/          # schema, RLS, storage, retrieval RPCs
│   └── tests/
├── knowledge/manifests/     # curated pack manifest format
├── evals/                   # RAG/safety evaluation fixtures
├── docs/                    # architecture/security/deploy/evals
└── .github/workflows/ci.yml
```

## Local setup

### 1. Database

Create a **new** Supabase project. Apply all SQL files in `supabase/migrations` in lexical order.

Do not reuse an unrelated production database.

### 2. Environment

Copy `.env.example` values into `apps/web/.env.local` and your worker runtime secrets.

For the web app, configure either:

- `AI_GATEWAY_API_KEY` (preferred for chat model routing), or
- `OPENAI_API_KEY`

The ingestion worker currently uses OpenAI embeddings directly and therefore needs `OPENAI_API_KEY`.

### 3. Web

```bash
cd apps/web
npm install
npm run dev
```

### 4. Worker

```bash
cd apps/worker
python -m venv .venv
. .venv/bin/activate
pip install . --extra-index-url https://download.pytorch.org/whl/cpu
grounded-worker
```

### 5. Smoke test

1. Create account and confirm email.
2. Create a Document Analyst.
3. Upload a PDF.
4. Wait for document status `ready`.
5. Ask a question answered by the PDF.
6. Open a `[S#]` citation and verify page/section text.
7. Create a second test user and verify tenant A data is absent for tenant B.
8. Import a portfolio CSV and create a Portfolio Manager assistant.

## Jurisdiction/professional knowledge packs

The code contains the **production mechanism** for professional packs, but intentionally does not pretend an example dataset is a complete legal/tax/clinical corpus.

A production operator should:

1. create a reviewed manifest per jurisdiction/domain;
2. use exact official/licensed downloadable sources;
3. verify redistribution/indexing rights;
4. import with `grounded-import-manifest`;
5. refresh sources on a suitable schedule;
6. run domain-specific RAG/citation evals;
7. only then label that jurisdiction pack production-ready.

Newly imported `legal-*` / `accounting-*` jurisdiction packs automatically attach to existing matching assistants.

## Security model

The LLM does **not** decide access.

Access is enforced through PostgreSQL RLS + Storage policies. Tenant/owner/linkage identity fields are also immutable to authenticated clients after row creation, preventing an allowed update from being turned into tenant reassignment. Retrieved documents/web pages are treated as untrusted evidence, so prompt injection inside a PDF cannot grant permissions or expose another tenant's data.

See `docs/SECURITY.md`.

## Deployment

Recommended split:

- `apps/web` -> Vercel
- Supabase -> Postgres/Auth/Storage
- `apps/worker` -> long-lived container service

See `docs/DEPLOYMENT.md` for the go-live checklist.

## Verification status in this artifact

- All 60 TypeScript/TSX app source files were parsed with the TypeScript compiler parser: no syntax diagnostics.
- Local import targets were statically resolved with no missing app imports.
- All Python worker modules pass `py_compile`.
- Ingestion security unit tests pass locally (8/8); deterministic portfolio aggregation was separately sanity-checked.
- The container used to generate this project could not finish downloading npm dependencies, so a real `next build` could not be executed here. CI is included to run typecheck, lint, build and worker tests in a networked environment.
- No live Supabase project was modified. Provisioning a new project requires explicit selection of the user's Supabase organization.

This distinction is intentional: the codebase is deployment-ready, but a live production instance still requires real credentials, a fresh database, professional source curation and successful deployment checks.
