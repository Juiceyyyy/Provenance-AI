# RAG evaluation plan

Maintain per-bot JSONL test sets with: question, expected source IDs/URLs, answer facts, prohibited claims, jurisdiction and effective date.

Track at minimum:

- retrieval Recall@5/10
- citation precision and citation coverage
- answer groundedness/correctness
- stale-source use rate
- appropriate abstention rate
- cross-tenant leakage (must be zero)
- prompt-injection success rate (must be zero for protected actions/data)
- first-token latency, retrieval latency and cost/query

Release gates should fail when security tests regress or when retrieval/citation quality falls below an agreed threshold. Human domain review is required before labeling a legal/tax/health pack production-ready.
