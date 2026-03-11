# Admin KYC Viewer + Team PIN Design

## 1) เป้าหมาย
- ให้ฝั่งแอดมินกดดูข้อมูล KYC ของลูกค้าที่ผ่านแล้วได้ (ชื่อ/อีเมล/สถานะ/รูปหน้าอ้างอิง)
- การเข้าดู KYC ต้องผ่าน PIN ของผู้ใช้ทีมงานแต่ละคน (ไม่ใช้ PIN กลางร่วมกัน)
- PIN ต้องตั้งได้ตอนสร้าง/แก้ไข user ทีมงาน และแยกเป็นของใครของมัน
- ทุกการเข้าดู KYC ต้องมี audit log

## 2) สิ่งที่มีอยู่แล้วในระบบ
- หน้าจัดการทีมงาน: `src/components/admin/settings/SettingsClient.tsx`
- API ทีมงาน: `src/app/api/admin/users/route.ts`, `lib/db/admin-users.ts`
- หน้าผู้ใช้ลูกค้า + สถานะ KYC: `src/components/admin/settings/CustomerUsersSettingItem.tsx`
- API ผู้ใช้ลูกค้า: `src/app/api/admin/customer-users/route.ts`, `lib/db/admin-customer-users.ts`
- ตาราง KYC หลัก: `customer_kyc_profiles` (`sql/ensure-customer-kyc.sql`)

หมายเหตุ: ตอนนี้มีแค่ `kyc_status/approved_at/rejected_reason/provider` ยังไม่มีข้อมูลรูปหน้าอ้างอิงที่พร้อมแสดงในแอดมิน

## 3) Data Model ที่เสนอ

### 3.1 ทีมงาน + PIN
เพิ่มตารางใหม่ `admin_user_security`
- `user_id uuid primary key references auth.users(id) on delete cascade`
- `can_view_customer_kyc boolean not null default false`
- `kyc_pin_hash text` (nullable เฉพาะคนที่ต้องใช้สิทธิ์นี้)
- `kyc_pin_updated_at timestamptz`
- `failed_attempts int not null default 0`
- `locked_until timestamptz null`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`

### 3.2 ภาพอ้างอิง KYC
เพิ่มคอลัมน์ใน `customer_kyc_profiles`
- `face_image_path text null` (เก็บ path ใน private bucket)
- `face_captured_at timestamptz null`

และใช้ storage bucket private เช่น `customer-kyc-artifacts`

### 3.3 Audit Log การเข้าดู KYC
เพิ่มตาราง `admin_kyc_access_logs`
- `id uuid primary key default gen_random_uuid()`
- `actor_user_id uuid not null references auth.users(id)`
- `customer_id uuid not null references auth.users(id)`
- `action text not null` (`unlock_pin|view_kyc|download_face|failed_pin`)
- `status text not null` (`ok|denied|locked`)
- `ip_address inet null`
- `user_agent text null`
- `metadata jsonb not null default '{}'::jsonb`
- `created_at timestamptz not null default now()`

## 4) Authorization Model
- `admin`: เข้าได้เสมอ แต่ยังต้องยืนยัน PIN ของตัวเองก่อนเปิดดู KYC
- `staff`: ต้องมี `can_view_customer_kyc=true` และต้องยืนยัน PIN ของตัวเอง
- `developer`: แนะนำไม่รวมสิทธิ์นี้โดย default (เปิดได้เฉพาะตั้งใจ)

## 5) API Design

### 5.1 ทีมงาน (ตั้งค่า PIN + สิทธิ์)
ขยาย payload ของ `/api/admin/users` (POST/PATCH):
- `canViewCustomerKyc?: boolean`
- `kycViewPin?: string` (เลข 6 หลัก)

ฝั่ง `lib/db/admin-users.ts`
- hash PIN ด้วย `crypto.scrypt` + random salt (ไม่เก็บ plain text)
- บันทึกลง `admin_user_security`

### 5.2 ตรวจ PIN ก่อนดู KYC
เพิ่ม endpoint:
- `POST /api/admin/customer-users/kyc-access`
input:
- `{ customerId: string, pin: string }`
output:
- `{ ok: true, accessToken: string, expiresAt: string }`

การทำงาน:
1. ตรวจ role + สิทธิ์ `can_view_customer_kyc`
2. ตรวจ lockout (`locked_until`)
3. เทียบ hash PIN
4. สำเร็จ: reset `failed_attempts`, ออก short-lived token (3-5 นาที)
5. ไม่สำเร็จ: เพิ่ม `failed_attempts`, lock เมื่อครบ threshold

### 5.3 ดึงข้อมูล KYC รายลูกค้า
เพิ่ม endpoint:
- `GET /api/admin/customer-users/{id}/kyc-view`
headers:
- `Authorization: Bearer <accessToken>`
output:
- `customer displayName/email/phone`
- `kycStatus/approvedAt/rejectedReason/provider`
- `faceImageSignedUrl` (อายุ 30-60 วินาที)

## 6) UI/UX Design

### 6.1 หน้า "สร้าง user" ทีมงาน
ไฟล์: `SettingsClient.tsx`
- เพิ่ม toggle: `สิทธิ์ดู KYC ลูกค้า`
- ถ้าเปิด toggle: แสดงช่อง `ตั้ง PIN ดู KYC (6 หลัก)` และ `ยืนยัน PIN`
- ตอนแก้ไข user: เปลี่ยน PIN ได้โดยไม่โชว์ค่าเดิม

### 6.2 หน้า "ผู้ใช้ลูกค้า"
ไฟล์: `CustomerUsersSettingItem.tsx`
- เพิ่มปุ่ม `ดู KYC` ต่อแถว user
- กดครั้งแรก: popup ขอ PIN ของผู้ใช้งานปัจจุบัน
- ผ่านแล้ว: เปิด KYC modal แสดงชื่อ/สถานะ/วันที่อนุมัติ/รูปหน้าอ้างอิง
- ใส่ watermark บนรูปหน้า: `viewer email + timestamp`

## 7) Security Controls (สำคัญ)
- PIN เป็นเลข 6 หลักเท่านั้น (ลด input risk + UX ง่าย)
- Hash เท่านั้น, ห้ามเก็บ plain PIN
- lock 15 นาทีเมื่อกรอกผิด 5 ครั้ง
- rate limit endpoint ตรวจ PIN (ต่อ user + ต่อ IP)
- signed URL ของรูปหน้าอายุสั้น (30-60 วินาที)
- บันทึก audit log ทุกการดู/ดาวน์โหลด
- ซ่อนปุ่ม/endpoint ถ้า user ไม่มีสิทธิ์

## 8) ขั้นตอนพัฒนา (แนะนำ)
1. SQL migration ใหม่: `sql/ensure-admin-kyc-access.sql`
2. เพิ่มโมเดล DB ใน `lib/db/admin-users.ts` และ helper security
3. ขยาย `/api/admin/users` ให้รองรับ `canViewCustomerKyc`, `kycViewPin`
4. เพิ่ม API `kyc-access` + `kyc-view`
5. ปรับ `SettingsClient.tsx` ฟอร์มสร้าง/แก้ไขทีมงาน
6. ปรับ `CustomerUsersSettingItem.tsx` เพิ่มปุ่มดู KYC + PIN modal + KYC modal
7. เติม audit log + test cases (PIN success/fail/lockout/permission)

## 9) Acceptance Criteria
- ทีมงานแต่ละคนมี PIN ของตัวเอง และใช้แทนกันไม่ได้
- user ที่ไม่มีสิทธิ์ `can_view_customer_kyc` เปิด KYC ไม่ได้
- user ที่กรอก PIN ผิดเกินกำหนดถูก lock ชั่วคราว
- แอดมินเห็นข้อมูล KYC ที่จำเป็นครบ พร้อมรูปหน้าอ้างอิงผ่าน signed URL
- มี audit log ครบทุกเหตุการณ์สำคัญ

## 10) หมายเหตุด้านกฎหมาย/PDPA
- รูปหน้าเป็นข้อมูลอ่อนไหว ควรเปิดเฉพาะบุคคลที่จำเป็น (need-to-know)
- ควรกำหนด retention ของรูปหน้า (เช่น 90/180 วัน ตามนโยบาย)
- ทุกการเข้าถึงควรตรวจสอบย้อนหลังได้จาก audit log
