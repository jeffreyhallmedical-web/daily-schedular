# Daily Practice Planner — Supabase Version

This version keeps the current UI and replaces Netlify Database with Supabase.

## Architecture

- Netlify hosts the React/Vite app.
- Netlify Functions provide the API.
- Supabase stores the database.
- The Supabase service role key is used only inside the Netlify Function.
- The browser never receives the Supabase service role key.
- No app password gate is enabled in this version. Anyone with the URL can edit the planner.

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

This no-password version is suitable only for private testing or a URL that is not shared widely. For broader use, add individual user login and roles.
