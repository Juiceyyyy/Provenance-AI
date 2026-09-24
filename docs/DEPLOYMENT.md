# Deployment

This repository's reference deployment is intentionally zero-billable. Do not enable paid plans, paid model fallbacks, or usage-based infrastructure unless you explicitly intend to do so.

## 1. Supabase Free

Create a dedicated Supabase Free project in the region required by your data-residency policy. Apply every migration in `supabase/migrations` in lexical order, then run the Supabase security and performance advisors.

Required web environment variables:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `GEMINI_API_KEY`
- `GEMINI_MODEL=gemini-3.8-flash`
- `GEMINI_EMBEDDING_MODEL=gemini-embedding-2`
- `ALLOW_BILLABLE_AI=false`

Paid-provider variables may remain unset. The application refuses to use them unless `ALLOW_BILLABLE_AI=true` is explicitly configured.

## 2. Web: Vercel Hobby

Import this repository into a new Vercel Hobby project. Do not attach an existing unrelated project.

Set Root Directory to `apps/web` and configure:

```text
NEXT_PUBLIC_SUPABASE_URL=<project URL>
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<publishable key>
GEMINI_API_KEY=<free-tier Gemini key>
GEMINI_MODEL=gemini-3.8-flash
GEMINI_EMBEDDING_MODEL=gemini-embedding-2
ALLOW_BILLABLE_AI=false
DAILY_MESSAGE_LIMIT=200
MAX_RAG_CHUNKS=10
```

Set `NEXT_PUBLIC_APP_URL` to the production Vercel origin after the first deployment if the application route needs it.

Keep Vercel AI Gateway/OpenAI credentials unset for the zero-cost deployment.

## 3. Free ingestion worker: GitHub Actions

The public repository contains `.github/workflows/free-worker.yml`. It runs every 15 minutes and can also be started manually. Standard GitHub-hosted runners for public repositories are used instead of a paid always-on worker.

Add these repository Actions secrets:

```text
DATABASE_URL
SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
GEMINI_API_KEY
```

The workflow intentionally skips without error when these secrets are absent; it does not fall back to a paid service.

The workflow:

1. Starts the official ClamAV container.
2. Installs the Python/Docling worker.
3. Waits until ClamAV is reachable.
4. Runs `grounded-refresh-due`.
5. Runs `grounded-worker` in bounded one-shot mode.

The free architecture trades immediate ingestion for cost: uploads may remain queued until the next scheduled run.

## 4. Embeddings

Both document chunks and user queries use `gemini-embedding-2` with exactly 1536 output dimensions. The pgvector column is also `vector(1536)`, so never change `EMBEDDING_DIMENSIONS` without a coordinated database migration and complete re-embedding of stored content.

Do not mix embedding models in the same vector index. If the embedding model changes, re-index all content before querying it with the new model.

## 5. Knowledge packs

India starter pack definitions and official-source registries are included in migration `202609240007_india_core_packs.sql` and under `knowledge/manifests/`.

The scheduler fetches only registered sources, re-validates redirect destinations, blocks private/link-local/loopback destinations, caps downloads, hashes content, versions changes and queues changed versions for ingestion.

A source registry is not a claim of exhaustive legal/tax coverage. Review authority, currency, effective dates and licensing before relying on a pack professionally.

## 6. Supabase Auth email templates

Because the app uses cookie-based SSR auth, configure the Confirm signup email template to send the token hash to the app route:

```text
{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email&next=/app
```

Set Supabase Auth Site URL to the production web origin and deliberately allow-list preview/local redirect URLs.

For password reset use:

```text
{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery&next=/reset-password
```

Verify the full email -> `/auth/confirm` -> authenticated application flow before launch.

## 7. Malware scanning

Production ingestion is configured fail-closed. The free GitHub Actions workflow exposes ClamAV only inside the runner job and sets:

```text
CLAMAV_HOST=127.0.0.1
CLAMAV_PORT=3310
MALWARE_SCAN_REQUIRED=true
```

If ClamAV is unavailable, ingestion must fail rather than parsing unscanned files.

## 8. Go-live gates

- GitHub CI passes typecheck, lint, Next.js production build, Ruff and pytest.
- Supabase security advisor has no unresolved security findings.
- Auth signup/login/email/password-recovery flow verified on the production origin.
- Upload -> scheduled worker -> ready -> retrieval -> citation flow verified with fixtures.
- Two-user tenant-isolation test passes.
- India legal/tax source pack freshness and source licenses reviewed.
- Gemini free-tier quotas are configured/understood; quota exhaustion must fail rather than invoke a paid provider.
- Terms/privacy and professional-assistant disclosures are reviewed for launch jurisdictions.

## 9. Scaling later

The free worker is intentionally not an always-on production queue consumer. If usage eventually justifies paid infrastructure, the same `FOR UPDATE SKIP LOCKED` worker can run as one or more long-lived replicas. That change should be an explicit deployment decision, not an automatic fallback.
