# Supabase Email Templates (TH) - Kittisap Gold Theme

ไฟล์นี้เป็นชุด HTML ธีมสีทองสำหรับแบรนด์ Kittisap พร้อมคัดลอกไปวางใน Supabase Dashboard ได้ทันที

จุดแก้ Template ใน Supabase:
1. เข้าโปรเจกต์ Supabase ของคุณ
2. ไปที่ `Authentication`
3. ไปที่ `Email Templates` (บาง UI อาจชื่อ `Auth templates`)
4. เลือกเทมเพลตที่ต้องการ เช่น `Confirm signup`
5. วาง `Subject` และ `Body (HTML)` จากด้านล่าง แล้วกด Save

หมายเหตุสำคัญ:
- ถ้าต้องการให้อีเมล Magic Link แสดงรหัส OTP ให้ใช้ `{{ .Token }}`
- ถ้าต้องการแบบ “กรอกรหัสในหน้าเว็บ” ไม่ควรใส่ `{{ .ConfirmationURL }}` ใน Magic Link template

---

## 1) Confirm Signup (ยืนยันสมัครสมาชิก)

**Subject**
```txt
[Kittisap] ยืนยันอีเมลเพื่อเปิดใช้งานบัญชี
```

**Body (HTML)**
```html
<!doctype html>
<html lang="th">
  <body style="margin:0;padding:0;background:#0b0b0c;font-family:Tahoma,Segoe UI,Arial,sans-serif;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="padding:24px 12px;background:#0b0b0c;">
      <tr><td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#121212;border:1px solid #3a2a0b;border-radius:16px;overflow:hidden;">
          <tr><td style="height:6px;background:linear-gradient(90deg,#8a5a08,#f59e0b,#facc15,#f59e0b,#8a5a08);"></td></tr>
          <tr><td style="padding:24px 22px;color:#f8e7c1;">
            <div style="font-size:22px;font-weight:700;color:#fbbf24;">ยืนยันอีเมลของคุณ</div>
            <p style="margin:10px 0 0;font-size:14px;line-height:1.7;color:#f6deb0;">ขอบคุณที่สมัครสมาชิก Kittisap กรุณายืนยันอีเมลเพื่อเปิดใช้งานบัญชีของคุณ</p>

            <div style="margin:16px 0 0;padding:14px;border:1px dashed #d4a649;border-radius:12px;background:#1a1408;text-align:center;">
              <div style="font-size:12px;color:#d4b47a;">รหัสยืนยัน (OTP)</div>
              <div style="margin-top:6px;font-size:32px;letter-spacing:8px;font-weight:800;color:#fde68a;">{{ .Token }}</div>
            </div>

            <div style="margin-top:16px;">
              <a href="{{ .ConfirmationURL }}" style="display:inline-block;padding:11px 18px;border-radius:10px;background:#f59e0b;color:#1f1302;text-decoration:none;font-weight:700;">ยืนยันอีเมล</a>
            </div>

            <p style="margin:14px 0 0;font-size:12px;line-height:1.6;color:#bfa26d;">หากคุณไม่ได้สมัครสมาชิก กรุณาเพิกเฉยอีเมลนี้</p>
          </td></tr>
        </table>
      </td></tr>
    </table>
  </body>
</html>
```

---

## 2) Magic Link / OTP Sign In (แนะนำ: ใช้ OTP)

**Subject**
```txt
[Kittisap] รหัส OTP สำหรับเข้าสู่ระบบ
```

**Body (HTML)**
```html
<!doctype html>
<html lang="th">
  <body style="margin:0;padding:0;background:#0b0b0c;font-family:Tahoma,Segoe UI,Arial,sans-serif;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="padding:24px 12px;background:#0b0b0c;">
      <tr><td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#121212;border:1px solid #3a2a0b;border-radius:16px;overflow:hidden;">
          <tr><td style="height:6px;background:linear-gradient(90deg,#8a5a08,#f59e0b,#facc15,#f59e0b,#8a5a08);"></td></tr>
          <tr><td style="padding:24px 22px;color:#f8e7c1;">
            <div style="font-size:22px;font-weight:700;color:#fbbf24;">เข้าสู่ระบบ Kittisap</div>
            <p style="margin:10px 0 0;font-size:14px;line-height:1.7;color:#f6deb0;">กรอกรหัส OTP นี้ในหน้าเข้าสู่ระบบ:</p>

            <div style="margin:16px 0 0;padding:14px;border:1px dashed #d4a649;border-radius:12px;background:#1a1408;text-align:center;">
              <div style="font-size:12px;color:#d4b47a;">OTP</div>
              <div style="margin-top:6px;font-size:34px;letter-spacing:8px;font-weight:800;color:#fde68a;">{{ .Token }}</div>
            </div>

            <p style="margin:14px 0 0;font-size:12px;line-height:1.6;color:#bfa26d;">รหัสนี้มีอายุจำกัดเพื่อความปลอดภัย ห้ามแชร์กับผู้อื่น</p>
          </td></tr>
        </table>
      </td></tr>
    </table>
  </body>
</html>
```

---

## 3) Reset Password

**Subject**
```txt
[Kittisap] คำขอรีเซ็ตรหัสผ่าน
```

**Body (HTML)**
```html
<!doctype html>
<html lang="th">
  <body style="margin:0;padding:0;background:#0b0b0c;font-family:Tahoma,Segoe UI,Arial,sans-serif;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="padding:24px 12px;background:#0b0b0c;">
      <tr><td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#121212;border:1px solid #3a2a0b;border-radius:16px;overflow:hidden;">
          <tr><td style="height:6px;background:linear-gradient(90deg,#8a5a08,#f59e0b,#facc15,#f59e0b,#8a5a08);"></td></tr>
          <tr><td style="padding:24px 22px;color:#f8e7c1;">
            <div style="font-size:22px;font-weight:700;color:#fbbf24;">รีเซ็ตรหัสผ่าน</div>
            <p style="margin:10px 0 0;font-size:14px;line-height:1.7;color:#f6deb0;">เราได้รับคำขอรีเซ็ตรหัสผ่านของบัญชีนี้</p>

            <div style="margin:16px 0 0;padding:14px;border:1px dashed #d4a649;border-radius:12px;background:#1a1408;text-align:center;">
              <div style="font-size:12px;color:#d4b47a;">รหัส OTP</div>
              <div style="margin-top:6px;font-size:32px;letter-spacing:8px;font-weight:800;color:#fde68a;">{{ .Token }}</div>
            </div>

            <div style="margin-top:16px;">
              <a href="{{ .ConfirmationURL }}" style="display:inline-block;padding:11px 18px;border-radius:10px;background:#f59e0b;color:#1f1302;text-decoration:none;font-weight:700;">ตั้งรหัสผ่านใหม่</a>
            </div>
          </td></tr>
        </table>
      </td></tr>
    </table>
  </body>
</html>
```

---

## 4) Invite User

**Subject**
```txt
[Kittisap] คุณได้รับคำเชิญเข้าใช้งานระบบ
```

**Body (HTML)**
```html
<!doctype html>
<html lang="th">
  <body style="margin:0;padding:0;background:#0b0b0c;font-family:Tahoma,Segoe UI,Arial,sans-serif;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="padding:24px 12px;background:#0b0b0c;">
      <tr><td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#121212;border:1px solid #3a2a0b;border-radius:16px;overflow:hidden;">
          <tr><td style="height:6px;background:linear-gradient(90deg,#8a5a08,#f59e0b,#facc15,#f59e0b,#8a5a08);"></td></tr>
          <tr><td style="padding:24px 22px;color:#f8e7c1;">
            <div style="font-size:22px;font-weight:700;color:#fbbf24;">คำเชิญเข้าใช้งาน Kittisap</div>
            <p style="margin:10px 0 0;font-size:14px;line-height:1.7;color:#f6deb0;">กดปุ่มด้านล่างเพื่อยืนยันและเริ่มใช้งานบัญชีของคุณ</p>
            <div style="margin-top:16px;">
              <a href="{{ .ConfirmationURL }}" style="display:inline-block;padding:11px 18px;border-radius:10px;background:#f59e0b;color:#1f1302;text-decoration:none;font-weight:700;">ยืนยันคำเชิญ</a>
            </div>
            <p style="margin:14px 0 0;font-size:12px;line-height:1.6;color:#bfa26d;">OTP สำรอง: <b>{{ .Token }}</b></p>
          </td></tr>
        </table>
      </td></tr>
    </table>
  </body>
</html>
```

---

## 5) Change Email Address

**Subject**
```txt
[Kittisap] ยืนยันการเปลี่ยนอีเมล
```

**Body (HTML)**
```html
<!doctype html>
<html lang="th">
  <body style="margin:0;padding:0;background:#0b0b0c;font-family:Tahoma,Segoe UI,Arial,sans-serif;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="padding:24px 12px;background:#0b0b0c;">
      <tr><td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#121212;border:1px solid #3a2a0b;border-radius:16px;overflow:hidden;">
          <tr><td style="height:6px;background:linear-gradient(90deg,#8a5a08,#f59e0b,#facc15,#f59e0b,#8a5a08);"></td></tr>
          <tr><td style="padding:24px 22px;color:#f8e7c1;">
            <div style="font-size:22px;font-weight:700;color:#fbbf24;">ยืนยันการเปลี่ยนอีเมล</div>
            <p style="margin:10px 0 0;color:#f6deb0;font-size:14px;">อีเมลเดิม: <b>{{ .Email }}</b></p>
            <p style="margin:6px 0 0;color:#f6deb0;font-size:14px;">อีเมลใหม่: <b>{{ .NewEmail }}</b></p>

            <div style="margin:16px 0 0;padding:14px;border:1px dashed #d4a649;border-radius:12px;background:#1a1408;text-align:center;">
              <div style="font-size:12px;color:#d4b47a;">รหัส OTP</div>
              <div style="margin-top:6px;font-size:32px;letter-spacing:8px;font-weight:800;color:#fde68a;">{{ .Token }}</div>
            </div>

            <div style="margin-top:16px;">
              <a href="{{ .ConfirmationURL }}" style="display:inline-block;padding:11px 18px;border-radius:10px;background:#f59e0b;color:#1f1302;text-decoration:none;font-weight:700;">ยืนยันการเปลี่ยนอีเมล</a>
            </div>
          </td></tr>
        </table>
      </td></tr>
    </table>
  </body>
</html>
```

---

## 6) Reauthentication

**Subject**
```txt
[Kittisap] รหัสยืนยันความปลอดภัย
```

**Body (HTML)**
```html
<!doctype html>
<html lang="th">
  <body style="margin:0;padding:0;background:#0b0b0c;font-family:Tahoma,Segoe UI,Arial,sans-serif;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="padding:24px 12px;background:#0b0b0c;">
      <tr><td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#121212;border:1px solid #3a2a0b;border-radius:16px;overflow:hidden;">
          <tr><td style="height:6px;background:linear-gradient(90deg,#8a5a08,#f59e0b,#facc15,#f59e0b,#8a5a08);"></td></tr>
          <tr><td style="padding:24px 22px;color:#f8e7c1;">
            <div style="font-size:22px;font-weight:700;color:#fbbf24;">ยืนยันตัวตนเพื่อทำรายการต่อ</div>
            <p style="margin:10px 0 0;color:#f6deb0;font-size:14px;">รหัส OTP ของคุณ:</p>
            <p style="margin:10px 0 0;font-size:32px;letter-spacing:8px;font-weight:800;color:#fde68a;">{{ .Token }}</p>
            <div style="margin-top:16px;">
              <a href="{{ .ConfirmationURL }}" style="display:inline-block;padding:11px 18px;border-radius:10px;background:#f59e0b;color:#1f1302;text-decoration:none;font-weight:700;">ยืนยันตัวตน</a>
            </div>
          </td></tr>
        </table>
      </td></tr>
    </table>
  </body>
</html>
```

