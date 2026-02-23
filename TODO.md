# Customer Site Roadmap (TODO)

## Phase 1: Public Pages + Products Read
- Scope:
- Build public pages baseline and products listing from Supabase.
- Ensure only `active` products are visible to customers.
- Acceptance Criteria (AC):
- Add/update product in admin, then `/products` reflects changes in one refresh.
- `inactive` products are never shown on `/products`.
- Product cover image is correct (primary image first).

## Phase 2: Product Detail + Pricing + Promotions
- Scope:
- Product detail page with gallery.
- Pricing page with grouping logic.
- Promotions page and coupon validation API integration.
- Acceptance Criteria (AC):
- Product detail page shows ordered gallery correctly.
- Pricing groups work as designed (category first, fallback to ranges).
- Coupon validation succeeds via API and returns usable discount result.

## Phase 3: Cart + Checkout + Order Create + PromptPay URL
- Scope:
- Cart flow, checkout page, server-side order creation.
- PromptPay URL generated from admin payment settings.
- Acceptance Criteria (AC):
- Customer can create an order successfully.
- New order appears in `/admin/orders`.
- PromptPay URL matches settings-derived format and amount.

## Phase 4: Customer Auth + My Orders
- Scope:
- Customer register/login/callback flow.
- Account area and “My Orders” pages.
- Acceptance Criteria (AC):
- Customer can view only their own orders.
- RLS blocks cross-user order access.
- Admin still sees all orders in admin panel.

## Phase 5: Hardening + SEO
- Scope:
- SEO foundations and operational hardening.
- Add basic abuse protection and monitoring hooks.
- Acceptance Criteria (AC):
- `sitemap`, `robots`, and per-page metadata are configured.
- Basic rate limit is active on sensitive public APIs.
- Error monitoring hooks are wired (capture-ready in key flows).
