<p align="center">
  <img src="apps/web/public/provenance-mark.png" alt="Provenance AI" width="112" />
</p>

<h1 align="center">Provenance AI</h1>

<p align="center">
  Open-source, multi-tenant RAG platform for AI assistants that answer from evidence you can trace.
</p>

<p align="center">
  <a href="LICENSE"><img alt="MIT License" src="https://img.shields.io/badge/license-MIT-3b82f6.svg" /></a>
  <img alt="Next.js" src="https://img.shields.io/badge/Next.js-16-black" />
  <img alt="Supabase" src="https://img.shields.io/badge/Supabase-Postgres-3ECF8E" />
  <img alt="Python" src="https://img.shields.io/badge/worker-Python-3776AB" />
</p>

## What is Provenance?

Provenance is an open-source knowledge platform for building specialized AI assistants over private documents, curated knowledge packs, and optionally the live web. Its core principle is simple: important answers should be inspectable back to their sources.

The project includes templates for:

- Legal research
- Tax and accounting
- Health information
- Study and revision
- Portfolio management (allocation, exposure and diversification only; no price forecasts, options calls or market timing)
- General document analysis
- Fully custom assistants

Users can create assistants, attach private documents, select jurisdiction defaults, enable web search per assistant or per turn, and inspect the exact retrieved source chunks behind citations.

## Zero-cost reference deployment

The default deployment path is deliberately designed to avoid billable infrastructure:

- Supabase Free for Postgres, Auth, pgvector and private Storage
- Vercel Hobby for the Next.js web app
- GitHub Actions standard runners on this public repository for batched ingestion and source refresh
- Gemini API free tier for chat and 1536-dimensional embeddings
- ClamAV in a GitHub Actions service container for fail-closed malware scanning

Paid AI providers are disabled by default. `ALLOW_BILLABLE_AI` must be explicitly set to `true` before the web app may use an AI Gateway or direct OpenAI fallback.

The free worker is intentionally batch-oriented rather than always-on. New uploads can wait for the next scheduled GitHub Actions run instead of being indexed instantly.

## Highlights

### Web application

- Next.js App Router + TypeScript + Tailwind
- Supabase SSR authentication and session refresh
- RLS-protected multi-tenant schema
- Bot templates plus custom instructions
- Coarse IP-derived jurisdiction suggestion with editable confirmation
- Private signed document uploads with live status, retry and deletion
- Streaming AI chat with markdown rendering
- Hybrid pgvector + PostgreSQL FTS retrieval using Reciprocal Rank Fusion
- HNSW vector index
- Effective-date and current-source filtering
- Clickable RAG citations with source inspection
- Optional web search per turn
- Persistent conversation history
- Daily usage quota reservation
- Signup confirmation, login/logout and password recovery

### Document ingestion worker

- Python + Docling structural document processing
- Page, heading and table provenance retention
- Gemini Embedding 2 at 1536 dimensions by default
- `FOR UPDATE SKIP LOCKED` job claiming
- One-shot mode for scheduled GitHub Actions execution
- Retry and stale-lock recovery
- SHA-256 content hashing and immutable document versions
- Curated-source refresh with redirect-aware SSRF controls and bounded downloads
- Fail-closed ClamAV support
- Jurisdiction-pack manifest importer

### Portfolio Manager

The portfolio module deterministically calculates portfolio structure before the LLM explains it:

- security weights
- largest / top-3 / top-5 concentration
- HHI concentration
- effective number of holdings (`1 / HHI`)
- sector and industry exposure
- asset-class exposure
- geographic exposure
- currency exposure
- account exposure
- duplicate-security aggregation across accounts
- concentration and data-quality flags

The assistant policy blocks price targets, expected-return forecasts, security predictions, options strategies, leverage calls and market timing.

## Architecture

```text
Browser / Next.js
       │
       ▼
RAG orchestrator ───── optional web search
       │
       ├── PostgreSQL full-text search
       ├── pgvector semantic search
       └── metadata / jurisdiction filters
       │
       ▼
Model + citations

Uploads → private Supabase Storage → ingestion queue
                                      │
                                      ▼
                       scheduled GitHub Actions worker
                                      │
                         Docling + ClamAV + Gemini
                                      │
                                      ▼
                              chunks + embeddings
```

A bot is configuration, not a separate service: instructions + attached knowledge bases + tools + jurisdiction + retrieval/model policy. See [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).

## Repository layout

```text
.
├── apps/
│   ├── web/                 # Next.js application
│   └── worker/              # Docling/embedding ingestion worker
├── supabase/
│   ├── migrations/          # schema, RLS, storage, retrieval RPCs
│   └── tests/
├── knowledge/manifests/     # curated knowledge-pack manifests
├── evals/                   # RAG / safety evaluation fixtures
├── docs/                    # architecture, security, deployment and eval docs
└── .github/workflows/       # CI + free scheduled ingestion
```

## Quick start

### 1. Create a Supabase project

Create a fresh Supabase project and apply every SQL file in `supabase/migrations` in lexical order. Do not reuse an unrelated production database.

### 2. Configure the free AI provider

Create a Gemini API key and set `GEMINI_API_KEY`. The defaults are:

```text
GEMINI_MODEL=gemini-3.8-flash
GEMINI_EMBEDDING_MODEL=gemini-embedding-2
EMBEDDING_DIMENSIONS=1536
ALLOW_BILLABLE_AI=false
```

Copy `.env.example` for the complete environment contract. Never commit populated secrets.

### 3. Start the web app

```bash
cd apps/web
npm install
npm run dev
```

### 4. Run ingestion locally

```bash
cd apps/worker
python -m venv .venv
. .venv/bin/activate
pip install . --extra-index-url https://download.pytorch.org/whl/cpu
grounded-worker
```

For the hosted zero-cost path, configure the repository secrets documented in [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md); `.github/workflows/free-worker.yml` then refreshes due sources and processes queued documents every 15 minutes.

### 5. Smoke test

1. Create and confirm an account.
2. Create a Document Analyst.
3. Upload a PDF and wait for status `ready`.
4. Ask a question that requires the PDF.
5. Open a citation and verify its page/section text.
6. Create a second test user and verify tenant isolation.
7. Import a portfolio CSV and create a Portfolio Manager assistant.

## Professional knowledge packs

The repository contains maintained pack definitions and source registries without claiming exhaustive legal, tax or clinical coverage. The India starter packs register official Government of India sources and are refreshed/versioned by the source pipeline.

Production operators remain responsible for source licensing/redistribution review, freshness, domain-specific evaluation and professional-assistant disclosures.

## Security

The LLM does not decide authorization. Access is enforced by PostgreSQL Row Level Security and private Storage policies. Retrieved documents and web content are treated as untrusted evidence, so prompt injection in a document cannot grant database permissions.

Uploaded/source documents can be scanned fail-closed through ClamAV before parsing. The zero-cost hosted workflow provides ClamAV as an isolated Actions service container.

Please read [`docs/SECURITY.md`](docs/SECURITY.md). To report a vulnerability, follow [`.github/SECURITY.md`](.github/SECURITY.md).

## Deployment

The zero-cost reference split is:

- `apps/web` → Vercel Hobby
- Supabase Free → Postgres / Auth / Storage / pgvector
- `.github/workflows/free-worker.yml` → scheduled ingestion and source refresh
- Gemini free tier → generation and embeddings

No Render resource is required by the default deployment.

See [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md).

## Contributing

Contributions are welcome. Read [`CONTRIBUTING.md`](CONTRIBUTING.md) before opening a pull request, and follow the [`CODE_OF_CONDUCT.md`](CODE_OF_CONDUCT.md).

## License

Provenance AI is released under the [MIT License](LICENSE).
