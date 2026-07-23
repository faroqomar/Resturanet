---
name: i18n-rtl
description: Implement and verify Arabic RTL and English LTR Resturanet UI behavior.
---

# I18n and RTL

Use for any renderer, validation-copy, catalog-label, CSV, print, or native
dialog change.

## Implement

1. Inventory visible strings plus labels, titles, placeholders, `aria-*`,
   validation, empty/loading/error states, confirmations, CSV, print, and
   dialogs.
2. Add both values to the typed local dictionary. Do not add a network
   translation dependency or silently fall back to the other locale.
3. Keep supplier/category/recipient names, document numbers, and notes exactly
   as entered.
4. Built-in catalog rows display through stable translation keys; custom rows
   display their stored name.
5. Set root `lang`/`dir`; use logical CSS, direction-aware icon semantics, and
   locale-neutral DOM order where possible.
6. Format numbers, integer IQD, and dates with `ar-IQ` or `en-IQ` without
   changing stored values.

## Verify

- live switch updates current and reused components without reload;
- restart persists the selected locale;
- sidebar, forms, summary, tables, focus order, and validation read naturally in
  RTL and LTR;
- keyboard-only operation and screen-reader names remain correct;
- long Arabic/English labels and large IQD values do not clip;
- installed English UI/accessibility tree has no unexpected Arabic system copy,
  and Arabic has no unexpected English copy;
- CSV, print, and native dialogs use the chosen locale while preserving custom
  text.

Do not “fix” direction with duplicated locale-specific layouts unless a semantic
order genuinely differs.
