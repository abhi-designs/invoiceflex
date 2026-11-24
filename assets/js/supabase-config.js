/* Public Supabase settings (safe in the browser: row level security protects the data).
   Used when the build has no VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY, and by the
   Android app where there is no server to ask. Loaded BEFORE supabase-bridge.js. */
(function () {
  try {
    sessionStorage.setItem('if_sb_runtime_cfg_v1', JSON.stringify({
      url: 'https://itvhwiuilzxlmyrntitn.supabase.co',
      anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml0dmh3aXVpbHp4bG15cm50aXRuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTUwODU1NzgsImV4cCI6MjExMDY2MTU3OH0.-vlNiTwHQO99t8fmD6ZuRs-lN_7Gs2u3TIYuH1rSXtk'
    }));
  } catch (e) { /* ignore */ }
})();
