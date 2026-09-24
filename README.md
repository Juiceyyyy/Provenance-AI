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
- Tax & accounting
- Health information
- Study and revision
- Portfolio management (allocation, exposure and diversification only; no price forecasts, options calls or market timing)
- General document analysis
- Fully custom assistants

Users can create assistants, attach private documents, select jurisdiction defaults, enable web search per assistant or per turn, and inspect the exact retrieved source chunks behind citations.

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

- Dedicated Python container for document processing
- Docling conversion and structural chunking
- Page, heading and table provenance retention
- OpenAI-compatible embeddings configuration
- `FOR UPDATE SKIP LOCKED` horizontal job claiming
- Retry and stale-lock recovery
- SHA-256 content hashing
- Immutable document versions
- Curated-source refresh with redirect-aware SSRF controls and bounded downloads
- Optional fail-closed ClamAV scanning
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
    Reranking
       │
       ▼
Model + citations

Uploads → private object storage → durable queue → Python/Docling worker → chunks + embeddings
```

A bot is configuration, not a separate service: instructions + attached knowledge bases + tools + jurisdiction + retrieval/model policy. See [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).

## Repository layout

```text
.
├── apps/
│   ├── web/                 # Next.js SaaS
│   └── worker/              # Docling/embedding ingestion worker
├── supabase/
│   ├── migrations/          # schema, RLS, storage, retrieval RPCs
│   └── tests/
├── knowledge/manifests/     # curated knowledge-pack manifests
├── evals/                   # RAG / safety evaluation fixtures
├── docs/                    # architecture, security, deployment and eval docs
└── .github/workflows/ci.yml
```

## Quick start

### 1. Create a Supabase project

Create a fresh Supabase project and apply every SQL file in `supabase/migrations` in lexical order. Do not reuse an unrelated production database.

### 2. Configure environment variables

Copy `.env.example` and fill in your own credentials. Never commit a populated `.env` file.

For web chat, configure either an AI Gateway or direct OpenAI credentials and explicitly choose a model ID supported by your provider. The ingestion worker currently uses OpenAI embeddings directly.

### 3. Start the web app

```bash
cd apps/web
npm install
npm run dev
```

### 4. Start the ingestion worker

```bash
cd apps/worker
python -m venv .venv
. .venv/bin/activate
pip install . --extra-index-url https://download.pytorch.org/whl/cpu
grounded-worker
```

### 5. Smoke test

1. Create and confirm an account.
2. Create a Document Analyst.
3. Upload a PDF and wait for status `ready`.
4. Ask a question that requires the PDF.
5. Open a citation and verify its page/section text.
6. Create a second test user and verify tenant isolation.
7. Import a portfolio CSV and create a Portfolio Manager assistant.

## Professional knowledge packs

The repository includes the mechanism for versioned jurisdiction/domain packs; it intentionally does **not** claim that the example data is a complete legal, tax or clinical corpus. Production operators should use authoritative or properly licensed sources, verify indexing/redistribution rights, run domain-specific retrieval/citation evaluations, and maintain source freshness.

Use `grounded-import-manifest` to import reviewed manifests.

## Security

The LLM does not decide authorization. Access is enforced by PostgreSQL Row Level Security and private Storage policies. Retrieved documents and web content are treated as untrusted evidence, so prompt injection in a document cannot grant database permissions.

Please read [`docs/SECURITY.md`](docs/SECURITY.md). To report a vulnerability, follow [`.github/SECURITY.md`](.github/SECURITY.md).

## Deployment

Recommended split:

- `apps/web` → Vercel
- Supabase → Postgres / Auth / Storage
- `apps/worker` → long-lived container service

See [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md).

## Contributing

Contributions are welcome. Read [`CONTRIBUTING.md`](CONTRIBUTING.md) before opening a pull request, and follow the [`CODE_OF_CONDUCT.md`](CODE_OF_CONDUCT.md).

## License

Provenance AI is released under the [MIT License](LICENSE).
