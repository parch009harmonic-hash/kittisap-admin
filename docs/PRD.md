# Kittisap Customer Public Site PRD

## 1. Product Context
- Product: Kittisap Public Site
- Stack: Next.js (App Router), Supabase, Vercel
- Production domains:
  - Public: `https://kittisap.vercel.app/`
  - Admin: `https://kittisap.vercel.app/admin`

## 2. Goals
- Build customer-facing website with 6 core menus.
- Share one product data source with admin (`/admin/products`).
- Enable customer ordering with PromptPay payment flow.
- Keep customer identity and permissions fully separated from admin identity.

## 3. Scope (MVP)
1. Home
2. Products
3. Pricing
4. Promotions + Coupon validation
5. Contact
6. Customer auth + account + my orders

## 4. Non-Goals (MVP)
- Full ERP/inventory forecasting.
- Automatic slip OCR verification.
- Complex campaign engine.

## 5. Functional Requirements

### 5.1 Home
- Show hero, featured products, promotion blocks, CTA to product listing.
- SEO metadata + Open Graph.

### 5.2 Products
- Read active products from Supabase only.
- Search/filter/sort/pagination.
- Product detail page with gallery and localized fields.
- Out-of-stock state visible and order button disabled.

### 5.3 Pricing
- Display active products as pricing table.
- Group by category if category exists, else by price ranges.

### 5.4 Promotions + Coupons
- Show activity/news cards (can start from static data).
- Coupon validation by code only via API.
- Do not expose all coupon data publicly.

### 5.5 Contact
- Show phone, LINE, map, hours.
- Include LocalBusiness JSON-LD.

### 5.6 Customer Auth + Account
- Routes: `/auth/register`, `/auth/login`, `/auth/callback`, `/account`, `/orders`.
- Customer and admin user paths must remain separated.

### 5.7 Orders + PromptPay
- Cart and checkout flow from selected items.
- Server computes final price and creates order.
- PromptPay link generated from admin setting:
  - Base fixed: `https://promptpay.io/`
  - Editable in admin: phone + amount (amount from server-side final total)
- Upload payment slip and set order to pending review.
- Admin sees customer orders in `/admin/orders`.

## 6. Security and Permission Requirements
- Customer role must never pass admin guard.
- Admin guard checks only `profiles.role in ('admin','staff')`.
- Public site never uses `SUPABASE_SERVICE_ROLE_KEY`.
- RLS:
  - Customer can read own profile and own orders.
  - Customer cannot access admin-only rows.

## 7. Data Model Summary
- Main tables:
  - `categories`
  - `products`
  - `product_images`
  - `customer_profiles`
  - `orders`
  - `order_items`
  - `payment_slips`
  - `coupons`
  - `settings` (for payment config)
- Full SQL in `docs/SUPABASE_SCHEMA.sql`.

## 8. API Summary
- Public:
  - `GET /api/public/products`
  - `GET /api/public/products/{slug}`
  - `GET /api/public/pricing`
  - `POST /api/public/coupons/validate`
  - `POST /api/public/orders/create`
  - `POST /api/public/orders/{order_no}/slip`
- Customer:
  - `POST /api/auth/register`
  - `POST /api/auth/login`
  - `GET /api/customer/profile`
  - `GET /api/customer/orders`
- Full contract in `docs/OPENAPI.yaml`.

## 9. End-to-End Flow (Order)
1. Customer browses `/products`.
2. Add products to cart.
3. Select items and continue checkout.
4. Enter shipping/contact info.
5. Optional coupon validation.
6. `POST /api/public/orders/create` (server-side pricing).
7. Show PromptPay QR from generated `promptpay_url`.
8. Upload slip via `POST /api/public/orders/{order_no}/slip`.
9. Admin reviews in `/admin/orders`.

## 10. Acceptance Criteria by Phase

### Phase 1: Public pages + product read
- AC1: Add product in admin, appears in public products after refresh.
- AC2: Inactive products do not appear.
- AC3: Cover image is primary image.

### Phase 2: Detail + pricing + promotions
- AC1: Product detail shows sorted gallery.
- AC2: Pricing groups correctly by category/range.
- AC3: Coupon validate API returns valid discount output.

### Phase 3: Cart + checkout + order create
- AC1: Selected cart items only are included in created order.
- AC2: PromptPay URL uses admin-configured phone.
- AC3: Slip upload updates order status to pending review.

### Phase 4: Customer auth + my orders
- AC1: Register/login works.
- AC2: Customer sees only own orders.
- AC3: Cross-user access is blocked by RLS.

### Phase 5: Hardening + SEO
- AC1: Localized metadata/canonical/hreflang/sitemap in place.
- AC2: API has baseline rate-limit and standardized error codes.
- AC3: Monitoring hooks enabled for core flows.

## 11. Operational Notes
- Keep payment base URL immutable in admin settings UI.
- Keep all monetary calculations on server only.
- Standardize error body shape:
  - `{ ok: false, code: "SOME_CODE", error: "Human message" }`
