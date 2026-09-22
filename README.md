# Spoony PWA — MVP 0.1

Mobile-first Progressive Web App for Spoony. The user scans a QR code, opens Spoony in the browser, takes a meal photo, receives a four-category Spoony Check, one recommendation, and 2–3 clickable Aha questions.

## What is already built

- Mobile-first start screen
- Camera / photo-library upload
- Client-side image resize before upload
- Spoony Check with Protein / Plants / Carbs / Fat
- Real colored spoon icons in the UI
- Deterministic primary-category logic to prevent double counting
- Plants-priority recommendation logic
- 2–3 follow-up questions with different Aha angles
- Clickable follow-up questions in a bottom sheet
- Text meal analysis
- “Was soll ich essen?” with three options
- Local food lookup against the 214-item Spoony matrix
- Ask Spoony
- PWA manifest, service worker, home-screen icons
- No user account required
- No permanent photo storage in this MVP
- Demo mode when no OpenAI API key is present
- Automated engine test suite (30 cases)

## Architecture

1. The AI identifies visible foods and estimates portions.
2. The server maps each food to exactly one primary Spoony category.
3. The local 214-food matrix calculates Spoonies / Teaspoonies.
4. The recommendation engine applies Spoony rules (including Plants priority).
5. The model supplies natural Aha-question candidates; the server enforces diversity and adds safe fallbacks.

This avoids letting the language model freely redefine the Spoony system on every answer.

## Local start

Requires Node.js 20+.

```bash
cp .env.example .env
# Add OPENAI_API_KEY to your environment, or start without it for demo mode.
node server.mjs
```

Open `http://localhost:10000`.

Run tests:

```bash
npm test
```

## Render deployment

Recommended: create a NEW Render Web Service for the PWA. Do not overwrite the existing MCP prototype until the PWA is tested.

1. Create a new GitHub repository, e.g. `spoony-pwa`.
2. Upload the contents of this folder.
3. In Render, create a Web Service from the repository.
4. Runtime: Node.
5. Start command: `node server.mjs`.
6. Add environment variable `OPENAI_API_KEY`.
7. Optional environment variable `OPENAI_MODEL=gpt-5.6-terra`.
8. Health endpoint: `/api/health`.

`render.yaml` is included if you prefer a Blueprint deployment.

## Important production items before public rollout

- Add final legal operator information / Impressum and a reviewed privacy notice for Germany/EU.
- Decide on a retention policy and document it clearly. This MVP itself does not write uploaded photos to disk or a database.
- Add rate limiting and abuse controls before broad public distribution.
- Add monitoring / error logging without storing meal photos.
- Use a custom domain and HTTPS before printing the final QR code.
- Test with several real iPhones and Android phones, especially camera permissions and “Add to Home Screen”.

## Core files

- `public/index.html` — mobile UI
- `public/styles.css` — Spoony visual design
- `public/app.js` — camera, API, cards, buttons
- `public/manifest.webmanifest` — PWA manifest
- `public/sw.js` — offline shell cache
- `server.mjs` — API + static server + OpenAI calls
- `lib/engine.mjs` — deterministic Spoony engine
- `data/matrix.json` — 214 foods, parsed from the current Spoony matrix
- `data/spoony-rules.md` — current Spoony rules
- `tests/engine.test.mjs` — 30 automated behavior checks

## Current MVP limitation

Image recognition requires an OpenAI API key on the server. Without it, the app runs in a clearly marked demo mode. The deterministic matrix/recommendation engine still runs locally on the server.
