BUSINESS TRIP SCHEDULER – v19 SUPABASE

Changes in v19:
- Events / Holidays row stays fixed with the toolbar and date headers during vertical scrolling.
- Events / Holidays row remains half-height.
- Event/holiday boxes are also compact half-height boxes.
- Event/holiday box text remains visible using smaller compact text.
- Sticky regions use opaque backgrounds and higher layering to prevent rows/names showing through.

Setup:
1) Create .env.local in this folder.
2) Add:
   VITE_SUPABASE_URL=https://qcvhgtnbxltxnqwkxhjr.supabase.co
   VITE_SUPABASE_ANON_KEY=your_real_anon_or_publishable_key
   VITE_PLANNER_ID=main
3) Run: npm.cmd install --no-audit --no-fund
4) Run: npm.cmd run dev
5) Run: npm.cmd run build for Netlify.
6) Upload the dist folder to Netlify.
