# Sync and Deploy Checklist

Use this project as the only source of truth:
- `E:\kittisap-admin\kittisap-admin-main-latest`

## One-time setup

1. Open terminal in `kittisap-admin-main-latest`
2. Install packages:
   - `npm install`
3. Login tools:
   - `vercel login`
4. Ensure git remote points to your repo:
   - `git remote -v`

## Remove old folders (run once as Administrator)

1. Open PowerShell as Administrator
2. Run:
   - `cd E:\kittisap-admin\kittisap-admin-main-latest`
   - `npm run cleanup:old-folders`

## Every update (safe flow)

1. Start from repo root:
   - `cd E:\kittisap-admin\kittisap-admin-main-latest`
2. Optional local reset for dev lock:
   - `npm run dev:reset`
3. Run release:
   - `npm run release -- -Message "feat: your message"`

This release command runs in order:
1. `npm run build`
2. `git add -A`
3. `git commit`
4. `git push origin master`
5. `vercel deploy --prod`

## If you only want GitHub sync

- `npm run sync:github -- -Message "chore: sync only"`

## Security session cleanup (optional)

After deploy, logout from Vercel on shared machines:
- `vercel logout`

If you intentionally want to clear saved GitHub credentials on this machine, do it manually from Windows Credential Manager.

## NPM permission hardening

- This repo uses local npm cache via `.npmrc` (`.npm-cache/`) to avoid global cache permission issues.
- If you hit `EPERM` during npm/audit:
  1. `npm run npm:cache:reset`
  2. `npm run audit:fix:safe`
