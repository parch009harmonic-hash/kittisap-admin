# Cloudflare WAF Plan (Production)

## 1) DNS and SSL
- Proxy all public records through Cloudflare (orange cloud).
- SSL/TLS mode: `Full (strict)`.
- Enable `Always Use HTTPS`.
- Enable `Automatic HTTPS Rewrites`.

## 2) Baseline Security
- Enable `WAF Managed Rules` (Cloudflare Managed + OWASP).
- Set Security Level: `Medium` (start) and tune with logs.
- Enable `Bot Fight Mode` (or `Super Bot Fight Mode` on Pro/Business).
- Enable `Browser Integrity Check`.

## 3) Rate Limiting Rules
- Rule: protect admin auth routes.
  - Expression: `(http.request.uri.path contains "/login" or http.request.uri.path contains "/auth/callback")`
  - Threshold: `30 requests / 1 minute / IP`
  - Action: `Managed Challenge`
- Rule: protect admin API uploads.
  - Expression: `(http.request.uri.path contains "/api/admin/upload/product-image")`
  - Threshold: `20 requests / 1 minute / IP`
  - Action: `Block for 10 minutes`

## 4) Custom WAF Rules
- Block obvious bad bots/UAs:
  - SQLMap, Nmap, Nikto, Acunetix signatures in `User-Agent`.
- Restrict admin area by geography if business allows:
  - Example: challenge/block countries outside expected region.
- Protect admin paths:
  - Expression: `(http.request.uri.path starts_with "/admin")`
  - Action: `Managed Challenge` when threat score is high.

## 5) DDoS and Origin Protection
- Enable `Under Attack Mode` during active incident.
- Configure Vercel + Cloudflare with caching for static assets.
- Restrict direct origin access where possible (only Cloudflare to origin).

## 6) Logging and Monitoring
- Enable Cloudflare Security Events logging.
- Alert on spikes:
  - 403/429 surge
  - upload endpoint anomalies
- Review logs weekly and tighten rules incrementally.

## 7) Change Management
- Roll out in `Log/Challenge` mode first for 24-48h.
- Validate no false positives for admin users.
- Then switch highest-risk rules to `Block`.

