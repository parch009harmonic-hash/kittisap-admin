# Customer KYC + Real Biometric Design

## 1) Objective
- Add real KYC at first customer signup.
- Replace browser-only face detection with server-verified biometric flow.
- Support:
  - onboarding verification after first signup,
  - recovery verification before account recovery,
  - future high-risk step-up verification (optional).

## 2) Current System Baseline
- Signup/login UI: `src/components/storefront/CustomerAuthForm.tsx`
- Auth callback: `src/app/auth/callback/route.ts`
- Customer profile API: `src/app/api/customer/profile/route.ts`
- Account deletion + recovery flow:
  - `src/components/storefront/CustomerAccountClient.tsx`
  - `src/app/api/customer/account-delete/recover/route.ts`
  - `lib/db/customer-account-deletion.ts`

Current "face scan" is only client-side camera + optional `FaceDetector`, not identity matching.

## 3) Target Product Flow
### 3.1 First-time Signup (Customer)
1. User registers with email/password.
2. Email confirmation remains required (existing flow).
3. After callback success, route user to `/kyc/start` instead of `/account` if KYC not passed.
4. KYC wizard steps:
   - Step A: consent + privacy notice.
   - Step B: ID document capture (front/back or passport).
   - Step C: selfie video with active liveness challenge (blink/turn/smile random prompts).
   - Step D: server sends media to KYC provider and waits for decision.
5. If pass: mark account `kyc_status=approved`, then allow normal `/account`.
6. If fail/manual review: show status and retry rules.

### 3.2 Recovery / Sensitive Action
1. Client requests a server challenge.
2. User performs live selfie video challenge.
3. Server validates liveness + face match against enrolled reference (provider-side).
4. Only server can issue `biometric_verified_token` for next action.
5. Recovery API accepts only valid server token, not raw `faceScanPassed: true`.

## 4) Architecture
## 4.1 Services
- Web app (Next.js) handles UI + orchestration.
- Supabase stores KYC state, audit log, and provider references (not raw biometrics unless required).
- External KYC/Biometric provider handles:
  - document verification,
  - liveness,
  - face match (1:1).

## 4.2 Provider Abstraction
Create adapter layer:
- `lib/kyc/provider.ts` (interface)
- `lib/kyc/providers/<vendor>.ts` (implementation)

Interface example:
- `createSession(userId, purpose)`
- `submitDocument(sessionId, files)`
- `submitLiveness(sessionId, media)`
- `getDecision(sessionId)`
- `matchFace(sessionId, enrolledRef)`

This avoids vendor lock-in and keeps API stable.

## 5) Data Model (Supabase)
Add tables:

1. `customer_kyc_profiles`
- `customer_id uuid pk`
- `kyc_status text` (`not_started|in_progress|pending_review|approved|rejected|blocked`)
- `kyc_level text` (`none|basic|full`)
- `approved_at timestamptz`
- `rejected_reason text`
- `provider text`
- `provider_subject_ref text`
- `created_at`, `updated_at`

2. `customer_kyc_sessions`
- `id uuid pk`
- `customer_id uuid`
- `purpose text` (`onboarding|account_recovery|step_up`)
- `status text` (`created|submitted|processing|passed|failed|expired`)
- `challenge_nonce text`
- `expires_at timestamptz`
- `provider_session_ref text`
- `result_payload jsonb`
- `created_at`, `updated_at`

3. `customer_biometric_enrollments`
- `id uuid pk`
- `customer_id uuid`
- `provider text`
- `provider_face_ref text` (reference only, no template if avoidable)
- `is_active boolean`
- `created_at`, `revoked_at`

4. `customer_kyc_audit_logs`
- `id uuid pk`
- `customer_id uuid`
- `session_id uuid null`
- `event_type text`
- `event_status text`
- `ip inet null`
- `user_agent text null`
- `metadata jsonb`
- `created_at timestamptz`

## 6) Security Requirements
- Never trust biometric pass flags from client.
- All verification decisions must come from server/provider signed response.
- Use short-lived upload URLs for media (1-5 minutes).
- Encrypt sensitive metadata at rest where possible.
- Retention policy:
  - raw selfie/document files auto-delete after decision window,
  - keep only provider reference + audit logs.
- Add replay protection:
  - one-time `challenge_nonce`,
  - session expiry,
  - single-use verification token.
- Rate limit:
  - KYC attempts per user/day,
  - recovery attempts per hour.

## 7) API Design
Public authenticated customer APIs:

1. `POST /api/customer/kyc/session`
- input: `{ purpose: "onboarding" | "account_recovery" }`
- output: `{ sessionId, expiresAt, uploadConfig, challenge }`

2. `POST /api/customer/kyc/session/{id}/document`
- upload doc media (or upload URL finalize).

3. `POST /api/customer/kyc/session/{id}/liveness`
- upload selfie video/frame sequence + challenge response.

4. `POST /api/customer/kyc/session/{id}/submit`
- finalize to provider.

5. `GET /api/customer/kyc/session/{id}`
- poll status + decision.

6. `POST /api/customer/kyc/session/{id}/issue-token`
- on passed session, returns short-lived signed `biometric_verified_token`.

7. Recovery endpoint update:
- `POST /api/customer/account-delete/recover`
- replace `faceScanPassed` with `biometricToken`.

Admin APIs:
- list pending manual review,
- approve/reject with reason,
- audit search.

## 8) Auth + Routing Rules
- Extend customer profile view with `kyc_status`.
- Middleware/page guard:
  - If logged in and `kyc_status != approved`, redirect to `/kyc/start` for protected customer pages.
- Allow limited pages without KYC:
  - `/kyc/*`, logout, support pages.

## 9) UI/UX Changes
### Signup
- Keep current registration form.
- After email verify + first login, show KYC required step.

### KYC Wizard
- Mobile-first camera UX.
- Progress states: capture -> upload -> processing -> result.
- Clear fallback for unsupported devices (switch to manual review flow).

### Recovery
- Replace current "Scan Face" quick check with real liveness capture modal.
- Only enable recover action after server confirms biometric token.

## 10) Fraud/Risk Controls
- Device fingerprint + IP reputation in `metadata`.
- Detect repeated failures across accounts.
- Optional: require OTP in addition to biometric for high-risk actions.
- Block account if abuse threshold exceeded, require manual admin unlock.

## 11) Rollout Plan (Safe)
Phase 1:
- Add schema + audit + session APIs (feature flag off).

Phase 2:
- Integrate one provider sandbox, onboarding only.

Phase 3:
- Enforce KYC for new customers only; existing users grandfathered.

Phase 4:
- Replace account-recovery face check with provider-based liveness+match.

Phase 5:
- Add manual review admin panel + reporting.

## 12) Implementation Map for This Repo
1. Add new SQL migration:
- `sql/ensure-customer-kyc.sql` with tables + RLS + indexes.

2. Add provider abstraction:
- `lib/kyc/provider.ts`
- `lib/kyc/providers/<vendor>.ts`

3. Add APIs:
- `src/app/api/customer/kyc/...`

4. Add KYC pages:
- `src/app/kyc/start/page.tsx`
- locale variants if needed.

5. Update callback:
- `src/app/auth/callback/route.ts` to route non-approved KYC users to KYC start.

6. Update recovery:
- `src/components/storefront/CustomerAccountClient.tsx`
- `src/app/api/customer/account-delete/recover/route.ts`
- `lib/db/customer-account-deletion.ts`

## 13) Compliance Notes
- Treat biometric data as highly sensitive personal data.
- Add explicit consent text before capture.
- Add data retention + deletion policy for biometric artifacts.
- Keep immutable audit logs for security investigations.

## 14) Minimum Accept Criteria
- New user cannot access account pages before KYC approved.
- Recovery requires server-issued biometric verification token.
- No API accepts client-only pass flags for face verification.
- Every KYC decision has audit trail with timestamp/user/session.
