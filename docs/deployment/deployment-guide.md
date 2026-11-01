# Deployment guide

## Required services

Node.js 22 runtime, PostgreSQL 15+, shared rate-limit store, S3-compatible private object storage, transactional email, production SMS, error monitoring, and a background worker. Mapping and payment providers are optional until configured.

## Release sequence

1. Build and test the immutable artifact.
2. Back up the database and confirm restore readiness.
3. Run `pnpm db:migrate:deploy` with a migration-only credential.
4. Deploy web and worker with least-privilege runtime credentials.
5. Run smoke checks, verify logs/monitoring, and inspect pending notifications.
6. Roll back application code if needed; use forward database migrations rather than destructive rollback.

Set `APP_URL`, `AUTH_SECRET`, and `DATABASE_URL`. Configure provider variables only when those integrations are enabled. Enforce TLS, secure cookies, restricted database networking, and private bucket ACLs.
