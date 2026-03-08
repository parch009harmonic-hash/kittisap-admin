# Supabase Email Templates (TH) - Styled HTML

ชุดนี้ทำมาเพื่อคัดลอกไปวางใน Supabase Dashboard > Authentication > Email Templates ได้ทันที

ข้อสำคัญ:
- ถ้าต้องการให้ `signInWithOtp()` ส่ง "รหัส OTP" ในเทมเพลต Magic Link ต้องมี `{{ .Token }}` และไม่ควรใส่ `{{ .ConfirmationURL }}`
- ใช้ตัวแปรตามที่ Supabase รองรับเท่านั้น เพื่อเลี่ยง template parse error

---

## 1) Magic Link / OTP Sign In (แนะนำ: ใช้เป็น OTP)

**Subject**
```txt
[Kittisap] รหัส OTP สำหรับเข้าสู่ระบบ
```

**Body (HTML)**
```html
<!doctype html>
<html lang="th">
  <body style="margin:0;padding:0;background:#0b0f14;font-family:Segoe UI,Arial,sans-serif;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#0b0f14;padding:24px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:520px;background:#121a24;border:1px solid #1f3147;border-radius:16px;overflow:hidden;">
            <tr><td style="background:linear-gradient(90deg,#0ea5e9,#22d3ee);height:6px;"></td></tr>
            <tr>
              <td style="padding:24px;color:#e5eef8;">
                <div style="font-size:20px;font-weight:700;color:#7dd3fc;">เข้าสู่ระบบ Kittisap</div>
                <p style="margin:12px 0 0;color:#c7d7ea;font-size:14px;line-height:1.6;">กรอกรหัส OTP นี้ในหน้าเว็บไซต์:</p>
                <div style="margin:14px 0 10px;padding:14px 16px;border:1px dashed #38bdf8;background:#0a1522;border-radius:12px;text-align:center;">
                  <span style="font-size:32px;font-weight:800;letter-spacing:8px;color:#e0f2fe;">{{ .Token }}</span>
                </div>
                <p style="margin:0;color:#93abc3;font-size:12px;line-height:1.6;">รหัสมีอายุจำกัดเพื่อความปลอดภัย ห้ามแชร์รหัสนี้กับผู้อื่น</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>
```

---

## 2) Confirm Signup

**Subject**
```txt
[Kittisap] ยืนยันอีเมลเพื่อเปิดใช้งานบัญชี
```

**Body (HTML)**
```html
<!doctype html>
<html lang="th">
  <body style="margin:0;padding:0;background:#0f0f11;font-family:Segoe UI,Arial,sans-serif;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="padding:24px 12px;background:#0f0f11;">
      <tr><td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:520px;background:#17171c;border:1px solid #2b2b34;border-radius:16px;">
          <tr><td style="padding:24px;color:#f5f5f6;">
            <h2 style="margin:0 0 10px;font-size:22px;color:#fcd34d;">ยืนยันอีเมลของคุณ</h2>
            <p style="margin:0 0 14px;color:#d4d4d8;font-size:14px;line-height:1.7;">ขอบคุณที่สมัครสมาชิก Kittisap กรุณายืนยันอีเมลเพื่อเปิดใช้งานบัญชี</p>
            <p style="margin:0 0 8px;color:#a1a1aa;font-size:13px;">รหัสยืนยัน (OTP):</p>
            <p style="margin:0 0 16px;font-size:28px;font-weight:800;letter-spacing:6px;color:#fde68a;">{{ .Token }}</p>
            <a href="{{ .ConfirmationURL }}" style="display:inline-block;padding:11px 18px;border-radius:10px;background:#f59e0b;color:#111827;text-decoration:none;font-weight:700;">ยืนยันอีเมล</a>
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
  <body style="margin:0;padding:0;background:#0a1010;font-family:Segoe UI,Arial,sans-serif;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="padding:24px 12px;background:#0a1010;">
      <tr><td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:520px;background:#111a1a;border:1px solid #214040;border-radius:16px;">
          <tr><td style="padding:24px;color:#ecfeff;">
            <h2 style="margin:0 0 10px;font-size:22px;color:#5eead4;">รีเซ็ตรหัสผ่าน</h2>
            <p style="margin:0 0 14px;color:#cbd5e1;font-size:14px;line-height:1.7;">เราได้รับคำขอรีเซ็ตรหัสผ่านของบัญชีคุณ</p>
            <p style="margin:0 0 8px;color:#94a3b8;font-size:13px;">รหัส OTP:</p>
            <p style="margin:0 0 16px;font-size:28px;font-weight:800;letter-spacing:6px;color:#99f6e4;">{{ .Token }}</p>
            <a href="{{ .ConfirmationURL }}" style="display:inline-block;padding:11px 18px;border-radius:10px;background:#14b8a6;color:#052e2b;text-decoration:none;font-weight:700;">ตั้งรหัสผ่านใหม่</a>
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
  <body style="margin:0;padding:0;background:#111827;font-family:Segoe UI,Arial,sans-serif;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="padding:24px 12px;background:#111827;">
      <tr><td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:520px;background:#1f2937;border:1px solid #334155;border-radius:16px;">
          <tr><td style="padding:24px;color:#f8fafc;">
            <h2 style="margin:0 0 10px;font-size:22px;color:#93c5fd;">คำเชิญเข้าใช้งาน Kittisap</h2>
            <p style="margin:0 0 16px;color:#cbd5e1;font-size:14px;line-height:1.7;">กดปุ่มด้านล่างเพื่อยืนยันและเริ่มใช้งานบัญชีของคุณ</p>
            <a href="{{ .ConfirmationURL }}" style="display:inline-block;padding:11px 18px;border-radius:10px;background:#60a5fa;color:#0f172a;text-decoration:none;font-weight:700;">ยืนยันคำเชิญ</a>
            <p style="margin:14px 0 0;color:#94a3b8;font-size:12px;">OTP สำรอง: <b>{{ .Token }}</b></p>
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
  <body style="margin:0;padding:0;background:#13120d;font-family:Segoe UI,Arial,sans-serif;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="padding:24px 12px;background:#13120d;">
      <tr><td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:520px;background:#1b1912;border:1px solid #3f3a22;border-radius:16px;">
          <tr><td style="padding:24px;color:#fefce8;">
            <h2 style="margin:0 0 10px;font-size:22px;color:#facc15;">ยืนยันการเปลี่ยนอีเมล</h2>
            <p style="margin:0 0 8px;color:#d6d3d1;font-size:14px;">อีเมลเดิม: <b>{{ .Email }}</b></p>
            <p style="margin:0 0 14px;color:#d6d3d1;font-size:14px;">อีเมลใหม่: <b>{{ .NewEmail }}</b></p>
            <p style="margin:0 0 8px;color:#a8a29e;font-size:13px;">รหัส OTP:</p>
            <p style="margin:0 0 16px;font-size:28px;font-weight:800;letter-spacing:6px;color:#fde047;">{{ .Token }}</p>
            <a href="{{ .ConfirmationURL }}" style="display:inline-block;padding:11px 18px;border-radius:10px;background:#eab308;color:#1c1917;text-decoration:none;font-weight:700;">ยืนยันการเปลี่ยนอีเมล</a>
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
  <body style="margin:0;padding:0;background:#120f1f;font-family:Segoe UI,Arial,sans-serif;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="padding:24px 12px;background:#120f1f;">
      <tr><td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:520px;background:#1b1630;border:1px solid #332a55;border-radius:16px;">
          <tr><td style="padding:24px;color:#f5f3ff;">
            <h2 style="margin:0 0 10px;font-size:22px;color:#c4b5fd;">ยืนยันตัวตนเพื่อทำรายการต่อ</h2>
            <p style="margin:0 0 8px;color:#cbd5e1;font-size:14px;">รหัส OTP:</p>
            <p style="margin:0 0 16px;font-size:28px;font-weight:800;letter-spacing:6px;color:#ddd6fe;">{{ .Token }}</p>
            <a href="{{ .ConfirmationURL }}" style="display:inline-block;padding:11px 18px;border-radius:10px;background:#a78bfa;color:#1e1b4b;text-decoration:none;font-weight:700;">ยืนยันตัวตน</a>
          </td></tr>
        </table>
      </td></tr>
    </table>
  </body>
</html>
```

