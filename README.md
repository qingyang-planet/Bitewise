# Bitewise 食见

Bitewise (食见) is a mobile-first PWA prototype for international visitors eating in China.

> Your AI dining companion in China.

> Understand the dish. Know what fits you. Order with confidence.

## Included in this MVP

- Six-language UI foundation: English, Korean, Japanese, Russian, Spanish and Italian.
- Food Passport with explicit allergens, dietary restrictions, spice and preference controls.
- Backend-connected menu scanner with rear-camera/photo input fallback, structured Dish Cards and localized dish names. Sample Menu remains available offline.
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
npm run dev:full
```

`npm run dev:full` starts Vite on `http://localhost:5173` and the local API on `http://localhost:3001`. To start them separately, use `npm run dev` and `npm run server`.

For the current architecture, branch status, API contracts, menu-analysis rules, model prompts, and handoff checklist, see [`docs/PROJECT_HANDOFF.md`](docs/PROJECT_HANDOFF.md).

Copy `.env.example` to `.env` only when configuring the backend. With `LLM_API_KEY` and `LLM_MODEL` empty, the API uses a fixed mock analyzer so the full upload-to-results flow still works. If both are configured, `server/services/llm.ts` sends the image to the configured OpenAI-compatible vision endpoint and validates the returned JSON before it reaches the frontend.

The main endpoints are:

- `POST /api/menus/analyze` — multipart upload field `image`, plus `restaurantName`, `language` and optional `foodPassport` JSON.
- `POST /api/assistant/ask` — answers only from the submitted current-menu dishes and returns Chinese restaurant wording.
- `GET /api/health` — local server health check.

Production checks:

```bash
npm run typecheck
npm run build
npm run preview
```

Uploaded images are held in memory only, limited to JPEG/PNG/WebP under 8 MB, and are not written to disk. API keys are read only by the backend; the Vite client never receives them. Dietary rules run after menu evidence extraction and expose `MATCH`, `WARNING`, `CONFLICT` or `UNKNOWN`; `MATCH` is decision support, not a safety guarantee.

Safety boundary: this app provides decision support from menu evidence and user input. It never makes an absolute allergy-safety claim; serious allergies must still be confirmed with the restaurant.
