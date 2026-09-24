# Deployment

## 1. Supabase

Create a new Supabase project in the region required by your data-residency policy. Apply the migrations in `supabase/migrations` in order. Then run the Supabase security and performance advisors and resolve findings before launch.

Required web environment variables:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `AI_GATEWAY_API_KEY` or `OPENAI_API_KEY`
- model variables from `.env.example`

Required worker secrets:

- `DATABASE_URL` (direct/pooler connection appropriate for long-lived worker)
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `OPENAI_API_KEY`

## 2. Web

Deploy `apps/web` to Vercel with Node 22. Set production environment variables in Vercel, not in source control. Use preview deployments for pull requests and promote only after CI/evals pass.

## 3. Worker

Build `apps/worker/Dockerfile` and run at least one long-lived replica on a container service. The job claim uses PostgreSQL row locking, so replicas can scale horizontally. Give the container enough memory for Docling/OCR workloads and use CPU-only PyTorch unless GPU inference is intentionally configured.

## 4. Knowledge packs

Create reviewed JSON manifests and import with `grounded-import-manifest`. Register exact authoritative/licensed source URLs, then run `grounded-refresh-source <source-id>` or schedule refreshes with your job platform. Do not use the example manifest in production.

## 5. Go-live gates

- Auth signup/login/email flow verified.
- Upload -> worker -> ready -> retrieval -> citation flow verified with PDF/DOCX/XLSX/image fixtures.
- Two-tenant RLS test passes.
- Legal/tax/health source packs reviewed for authority, effective dates and licenses.
- Backups/PITR and restore drill configured.
- Error monitoring, cost monitoring and provider quotas configured.
- Terms/privacy/professional-assistant disclosures reviewed for launch jurisdictions.

## 6. Supabase Auth email templates

Because the app uses cookie-based SSR auth, configure the **Confirm signup** email template to send the token hash to the app route rather than relying on an implicit browser-only session. Set the confirmation link to the equivalent of:

```text
{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email&next=/app
```

Set Supabase Auth `Site URL` to the production web origin and add preview/local redirect URLs deliberately. Verify the full email -> `/auth/confirm` -> authenticated `/app` flow before launch.

### Password reset template

Configure the **Reset password** email template for the same server-side token exchange pattern. The recovery link should resolve to:

```text
{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery&next=/reset-password
```

The application sends `resetPasswordForEmail` with `/auth/confirm?next=/reset-password` as the redirect target, verifies the recovery token server-side, then lets the authenticated recovery session call `updateUser({ password })`. Keep production redirect URLs allow-listed in Supabase Auth.

## 7. Malware scanning

Run a private ClamAV/clamd service reachable only by the ingestion worker. Set:

```text
CLAMAV_HOST=<private-clamd-host>
CLAMAV_PORT=3310
MALWARE_SCAN_REQUIRED=true
```

The worker fails closed when `MALWARE_SCAN_REQUIRED=true` and the scanner is unavailable. Do not expose clamd directly to the public internet.

## 8. Source refresh scheduler

Schedule `grounded-refresh-due` from the worker environment (for example, hourly). The refresh client blocks loopback/private/link-local source targets, re-validates redirect destinations, limits redirects, and caps downloaded bytes. Production infrastructure should still enforce outbound network policy/egress controls because application-level SSRF checks are defense in depth, not a substitute for network isolation.
