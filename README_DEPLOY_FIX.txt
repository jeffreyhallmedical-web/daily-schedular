This package fixes the Netlify build error: "vite: not found".

What changed:
- Uses stable public package versions.
- Ensures Vite is listed in devDependencies.
- Ensures npm installs devDependencies on Netlify.
- Replaces the lockfile to remove environment-specific package URLs.

Upload/replace these files in the GitHub repository root, then clear cache and deploy in Netlify.
