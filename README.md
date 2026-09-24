# Bitewise 食见

Bitewise (食见) is a mobile-first PWA prototype for international visitors eating in China.

> Your AI dining companion in China.

> Understand the dish. Know what fits you. Order with confidence.

## Included in this MVP

- Six-language UI foundation: English, Korean, Japanese, Russian, Spanish and Italian.
- Food Passport with explicit allergens, dietary restrictions, spice and preference controls.
- Offline demo menu scanner with camera/photo input fallback, structured Dish Cards and localized dish names.
- Evidence-aware states: Match, Warning, Conflict and Unknown; no unknown dish is rendered as “safe”.
- Dish details, cultural context and bilingual Ask Restaurant copy with Chinese speech playback.
- Dining Assistant with party size, budget, temporary preference, hard-constraint filtering and rule-checked table plans.
- Waiter Mode with large Chinese requests and confirmed order context.
- Split Bill with equal and by-item modes, exact CNY reconciliation and native share-sheet hook.
- Lightweight Find Food entry point and localStorage persistence for the Food Passport/session demo.
- Installable PWA manifest, responsive mobile UI and generated Service Worker for offline shell caching.

## Run locally

```bash
npm install
npm run dev
```

Production checks:

```bash
npm run typecheck
npm run build
npm run preview
```

The current repository is intentionally backend-free. Menu/receipt recognition uses a deterministic local demo parser so the product flow can be tested offline. The parser and recommendation validator are isolated in `src/App.tsx` and can be replaced by OCR/AI services without changing the core UI flow.

Safety boundary: this app provides decision support from menu evidence and user input. It never makes an absolute allergy-safety claim; serious allergies must still be confirmed with the restaurant.
