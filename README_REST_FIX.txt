This version removes @supabase/supabase-js from the Netlify Function and uses Supabase REST/PostgREST directly via fetch. It avoids the Node 20 WebSocket/Realtimes client issue entirely.
