# InvoiceFlex (static web app + Supabase)

Plain HTML/CSS/JS site. Upload ALL files to the root of a GitHub repo and turn on
Settings > Pages > Deploy from branch > main > / (root). The repo must be public on a free account.

All paths are relative, so it works at https://USER.github.io/REPO/ and on Netlify/Vercel/Cloudflare.
In Supabase > Authentication > URL Configuration add your live site URL (Site URL + Redirect URLs).

- assets/js/app.js            screens and UI logic
- assets/js/supabase-layer.js database layer (login, data, files)
- assets/js/supabase-config.js public project URL + anon key
- assets/js/supabase-bridge.js bundled Supabase client (built from src/supabase-bridge.ts)
