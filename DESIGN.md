---
version: alpha
name: "Saranankara Oil Mart"
description: "Sri Lankan lubricant catalogue and shop administration"
colors:
  primary: "#17353A"
  accent: "#B83A33"
  background: "#F7F1E7"
  ink: "#1E292B"
  muted: "#667276"
  signal: "#E5B64C"
typography:
  sans:
    fontFamily: "Noto Sans, Noto Sans Sinhala, Noto Sans Tamil, system-ui, sans-serif"
  mono:
    fontFamily: "Geist Mono, monospace"
rounded:
  DEFAULT: "0.625rem"
  sm: "0.5rem"
  md: "0.875rem"
  lg: "1.5rem"
spacing:
  page-max: "1380px"
  page-gutter: "1rem"
components:
  button: {}
  card: {}
  input: {}
  select: {}
---

# Saranankara Oil Mart design context

## Product and visual direction

Preserve the established lubricant-store identity: deep teal shop chrome, racing-red actions, warm ivory surfaces, and yellow wayfinding accents. The storefront's automotive film is its expressive signature; inventory controls, prices, sizes and approval screens remain quiet and functional. This work extends the existing visual identity rather than rebranding it.

Customers in Sri Lanka browse on phones, compare pack sizes and ask the Dehiwala shop to confirm stock. Admin users maintain exact prices and measured inventory. Storefront routes have English, Sinhala and Tamil copy; untranslated product content explicitly falls back to English. Admin copy follows the existing English dashboard. New locale copy needs owner/native-language review before launch.

## Runtime ownership and mapping

The canonical runtime values live in `src/app/globals.css`; this document mirrors them. `:root` maps primary to `--store-deep`, accent to `--store-accent`, background to `--store-warm-ivory`, ink to `--store-ink`, muted to `--store-steel`, and signal to `--store-signal-yellow`. Tailwind's inline theme consumes those variables. Fonts are supplied by the root layout and its Noto/Geist variables. There is no generated token export.

The literal radius variables above describe `:root`; Tailwind's radius aliases separately derive from `--radius` in the existing inline theme. Do not confuse those two existing paths or copy their values into new controls. Commerce fields use `--radius-sm`; panels and buttons reuse established classes. `site-container` owns the 1380px cap and 1rem edge gutters.

## Components and interaction

`ProductCard` and the catalogue's `ProductTile` retain their existing image geometry. Product variants and independent pack SKUs use `ProductOptions`, with native selects accepted for their OS-owned popup behavior. The request form shares `.request-form` and dashboard panel styles with review forms. Existing `button-primary`, `button-secondary`, `admin-primary-button`, and panel classes remain canonical.

Prices always carry the localized price-change notice. The stock-confirmation notice uses the existing soft-accent surface and red left border. Error text is visible and announced. Focus uses the accent outline; buttons retain disabled/busy states. Page content scrolls naturally; no viewport-height constraint is added to forms. Global scrollbars use muted thumbs, ivory tracks and deep-teal hover/active states, reverting to system colors in forced-color mode.

## Responsive and motion rules

Use the established single-column phone layout and two-column desktop detail/admin layout. Fields may shrink and long product names or references wrap. Native dropdowns remain keyboard-operable. Preserve the existing reduced-motion rules and avoid new ambient animation for commerce controls. Validate changed desktop/mobile workflows with the dedicated Playwright requirements suite.
