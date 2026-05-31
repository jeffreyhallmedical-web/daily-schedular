# Daily Practice Planner — Supabase Version

This version keeps the current UI and replaces Netlify Database with Supabase.

## Architecture

- Netlify hosts the React/Vite app.
- Netlify Functions provide the API.
- Supabase stores the database.
- The Supabase service role key is used only inside the Netlify Function.
- The browser never receives the Supabase service role key.
- A simple `APP_PASSWORD` protects the planner from casual access.

## Files that matter

```text
src/App.jsx
netlify/functions/planner.mjs
supabase_schema.sql
netlify.toml
package.json
```

## Supabase setup

1. Create a Supabase project.
2. Open SQL Editor.
3. Paste and run `supabase_schema.sql`.
4. Go to Project Settings > API.
5. Copy:
   - Project URL
   - service_role key

## Netlify environment variables

Add these in Netlify site settings:

```text
SUPABASE_URL=your_supabase_project_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
APP_PASSWORD=your_private_app_password
```

Do not add `SUPABASE_SERVICE_ROLE_KEY` to frontend code and do not prefix it with `VITE_`.

## Netlify build settings

```text
Build command: npm run build
Publish directory: dist
Functions directory: netlify/functions
```

`netlify.toml` already contains these settings.

## Local development

```bash
npm install
npm run dev
```

For local testing of Netlify Functions, use Netlify CLI and set the environment variables locally.

## Verified locally

The Vite frontend build was tested successfully with:

```bash
npm run build
```

## Current security level

This is practical app-password protection, not full user authentication. It is suitable for a small private/internal planner. For broader use, add individual user login and roles.
