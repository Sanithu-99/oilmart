# Requirements implementation verification - 26 November 2026

## Automated checks

- Complete Vitest suite: 155 tests passed across 22 files. New tests cover signed PayHere notifications and preparation, bounded callback input, duplicate/late/refund handling, verified-phone loyalty, email delivery and one-time token consumption, batch price/preorder authorization and stale revisions, exact manufacturer matching and decoding the actual new photo assets.
- Complete requirements browser suites: 16 passed across Chromium desktop and Pixel 7 mobile. They cover catalogue/source sections, absence of fitment/sort controls, notices, protected routes, preserved failure values, explicit acknowledgement, previewed batch changes and PayHere continuation. The final external payment POST is intercepted locally; it never reaches PayHere.
- An additional targeted desktop/mobile batch check verifies textarea resize behavior and page overflow after visual inspection identified the legacy CSS override.
- ESLint: passed after excluding generated Prisma and disposable test artifacts. This also prevents the browser runner's report-directory cleanup from racing the linter.
- Production build including TypeScript: passed, 82 pages processed. Routes include `/admin/launch` and `/api/payments/payhere/notify`.
- Strict premium UI audit: zero errors/warnings. Current JSON is retained in `premium-audit.json`.
- `git diff --check`: passed.

Node 22.16.0 was selected with `pnpm --use-node-version=22.16.0`. Tests use fake transactional persistence and provider responses. Browser action fixtures bundle the real client components with isolated fake actions, so creating a fixture order or changing a fixture discount cannot mutate the connected production database. Existing app catalogue/route checks are read-only.

## Content evidence

The imported inventory has 313 products. Original manufacturer summaries now match 88, compared with 13 before this change; 225 exact identities/formulations remain unverified. Ten manufacturer photo assets were added: nine high resolution and one original 300x493 Prestone packshot flagged for quality review. Nine previously missing slots now display exact manufacturer images, leaving 121 missing storefront photos. The database still has 130 products without attached image records because these are checked presentation fallbacks; no production image record was inserted.

CSV and JSON review exports agree across all 313 rows. Source dates, regional sources, exact grade/pack matches, dimensions and rejected ambiguous candidates are recorded under `docs/assets/`. Owner-uploaded photos take priority. Public manufacturer origin does not establish unrestricted image reuse rights; owner approval remains a launch input.

## Operational limits

No real merchant charge, notification, email or SMS, production order, stock movement or price update was performed. Actual gateway/device/sender credentials remain absent. Unit transaction mocks do not establish real PostgreSQL concurrent rollback behavior; verify this with an isolated database and real sandbox merchant account before launch.

Native LANKAQR requires bank/network specifications and a registered merchant payload. A generic EMV CRC does not establish an authorized merchant QR, so no such payload was invented. The 4% card estimate is not applied to provider checkout pending an approved merchant policy. See `docs/requirements-2026-11-26.md` for the full requirement table and activation guides.
