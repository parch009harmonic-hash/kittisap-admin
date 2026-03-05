# Smoke Test Checklist: Admin Products Bulk Import

## Scope
- Feature: `/admin/products` bulk import button and modal
- API: `POST /api/admin/products/import` (`preview`, `commit`)
- Data path: Product create pipeline and storefront revalidation

## Test Matrix
| ID | Test Case | Method | Expected | Status | Notes |
|---|---|---|---|---|---|
| SMK-001 | Type check | `npx tsc --noEmit` | No TS errors | PASS | Executed locally |
| SMK-002 | Lint check (changed files) | `npx eslint ...` | No lint errors | PASS | Executed locally |
| SMK-003 | Production build | `npm run build` | Build succeeds, import route compiled | PASS | Executed locally |
| SMK-004 | Git sync to origin | `git status -sb`, `git branch -vv` | Branch aligned with `origin/master` | PASS | `master...origin/master` |
| SMK-005 | Local AI key wiring | Read `.env.local` | `GEMINI_API_KEY`/`GOOGLE_AI_API_KEY` available | PASS | Present in `.env.local` |
| SMK-006 | Vercel deploy path | `vercel --prod --yes` | Successful production deploy | FAIL | Network blocked (`EACCES ...:443`) |
| SMK-007 | GitHub API/check status query | `curl https://api.github.com/...` | Reachable API | FAIL | Network blocked (`Bad access`) |
| SMK-008 | UI smoke (admin session) | Manual browser test | Preview + mapping + commit flow works | BLOCKED | Requires deployed/local authenticated admin session |

## Manual UI Smoke Cases (Run Next)
1. Open `/admin/products` as admin and confirm `Bulk Import` button visible beside `Add Product`.
2. Upload CSV with known headers (`title_th`, `price`, `stock`) and click `Scan Preview`.
3. Verify mapped headers are auto-selected and row counters (`total/ready/invalid`) are correct.
4. Change at least one mapping manually and verify preview rows/ready counters update immediately.
5. Click `Save Ready Items` and verify:
   - Success toast appears.
   - Redirect includes `?notice=bulk_imported&count=...`.
   - Products appear in table.
6. Upload malformed CSV (missing title/price/stock) and verify invalid rows and issue messages.
7. Upload image/PDF:
   - With AI key: scan should return rows.
   - Without AI or unavailable AI: fallback notes should appear or clear local-engine error shown.

## Known External Blockers
- Current environment intermittently blocks outbound `443` to GitHub/Vercel APIs.
- This blocker affects deploy/check badges and can surface as red status in GitHub UI.

