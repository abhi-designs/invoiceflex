<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://ai.google.dev/static/site-assets/images/share-ais-513315318.png" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/b9fda2f0-2da1-4f52-afd4-51d8ddf1d826

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`

## Supabase (cloud database)

All data (customers, invoices, payments, quotations, Bill Book, company profile, plan) is stored in the Supabase project `invoiceflex`.

- `assets/js/supabase-config.js` – public project URL and anon key (used when the build has no VITE_ values).
- `assets/js/supabase-bridge.js` – bundled Supabase client (built from `src/supabase-bridge.ts`).
- `assets/js/supabase-layer.js` – login/register, loads data before each page, saves changes in the background (with a retry outbox).
- `assets/js/app.js` – screens; its load/save functions call the layer.
