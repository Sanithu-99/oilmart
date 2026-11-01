# Backup and recovery

Use managed PostgreSQL point-in-time recovery plus encrypted daily logical backups in a separate failure domain. Retention and access must match the privacy policy.

Test quarterly: provision an isolated database, restore the latest backup, run migrations, compare critical row counts/totals, execute smoke tests, and record recovery time/recovery point. Never run recovery tests against production. Object storage needs versioning/lifecycle rules and a separate inventory of keys referenced by product images.
