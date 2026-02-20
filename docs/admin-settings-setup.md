# Admin Settings Table Setup (Supabase)

Use this when the app shows:
"ยังไม่พบตาราง admin_settings ในฐานข้อมูล ..."

## 1) Run SQL migration

Open Supabase Dashboard -> SQL Editor, then run:

`sql/ensure-admin-settings.sql`

## 2) Verify table exists

Run:

```sql
select to_regclass('public.admin_settings') as table_exists;
```

Expected result:

- `public.admin_settings`

## 3) Verify required columns

Run:

```sql
select column_name
from information_schema.columns
where table_schema = 'public' and table_name = 'admin_settings'
order by ordinal_position;
```

Must include:

- `user_id`
- `display_name`
- `contact_email`
- `default_language`
- `store_name`
- `support_phone`
- `currency`
- `security_2fa_enabled`
- `session_policy`
- `notify_email_enabled`
- `notify_browser_enabled`
- `notify_order_enabled`
- `ui_mode`
- `created_at`
- `updated_at`

## 4) Verify policies

Run:

```sql
select policyname, cmd
from pg_policies
where schemaname = 'public' and tablename = 'admin_settings'
order by policyname;
```

Must include:

- `admin_settings_select_own`
- `admin_settings_insert_own`
- `admin_settings_update_own`
