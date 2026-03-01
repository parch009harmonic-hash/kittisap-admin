create extension if not exists pgcrypto;

create table if not exists public.web_settings (
  id text primary key default 'default',
  banner_eyebrow text not null default 'KITTISAP CUSTOMER SITE',
  banner_title text not null default 'แพลตฟอร์มลูกค้า เชื่อมสินค้าและคำสั่งซื้อชุดเดียวกับระบบแอดมิน',
  banner_description text not null default 'ลูกค้าดูสินค้า ตารางราคา โปรโมชัน สั่งซื้อ และชำระเงินผ่าน PromptPay ได้ครบในระบบเดียว',
  banner_primary_button_label text not null default 'สินค้าของเรา',
  banner_secondary_button_label text not null default 'กิจกรรม + ส่วนลด/คูปอง',
  banner_background_from text not null default '#0f172a',
  banner_background_to text not null default '#020617',
  banner_image_url text null,
  banner_show_buttons boolean not null default true,
  banner_content_align text not null default 'left',
  banner_auto_height boolean not null default true,
  banner_min_height_px integer not null default 340,
  banner_eyebrow_font_size_px integer not null default 11,
  banner_title_font_size_px integer not null default 56,
  banner_title_font_scale_thai_percent integer not null default 92,
  banner_description_font_size_px integer not null default 18,
  banner_text_effect text not null default 'none',
  banner_image_frame_enabled boolean not null default true,
  banner_image_frame_style text not null default 'soft',
  banner_image_motion text not null default 'none',
  banner_image_frame_color text not null default '#ffffff',
  banner_image_frame_radius_px integer not null default 16,
  banner_image_frame_border_width_px integer not null default 1,
  page_background_color text not null default '#0b0f16',
  footer_bottom_background_color text not null default '#0f172a',
  text_color text not null default '#cbd5e1',
  homepage_intro_title text not null default 'SST INNOVATION CO., LTD.',
  homepage_intro_content text not null default 'SST INNOVATION คือทีมผู้เชี่ยวชาญด้านงานระบบครบวงจร ตั้งแต่กลยุทธ์ดิจิทัล การออกแบบ พัฒนา ไปจนถึงการดูแลหลังส่งมอบ โดยมุ่งเน้นคุณภาพและผลลัพธ์ทางธุรกิจที่วัดผลได้จริง',
  homepage_section_gap_px integer not null default 56,
  homepage_intro_card_background_color text not null default '#ffffff',
  homepage_intro_title_color text not null default '#0f274f',
  homepage_intro_content_color text not null default '#1f3a62',
  homepage_intro_title_font_size_px integer not null default 56,
  homepage_intro_content_font_size_px integer not null default 24,
  homepage_intro_title_font_weight integer not null default 800,
  homepage_intro_content_font_weight integer not null default 500,
  homepage_intro_text_glow boolean not null default false,
  homepage_image_section_gap_px integer not null default 36,
  homepage_image_boxes jsonb not null default '[]'::jsonb,
  homepage_why_choose_us_section_gap_px integer not null default 44,
  homepage_why_choose_us_title text not null default 'ทำไมต้อง SST INNOVATION Pro',
  homepage_why_choose_us_subtitle text not null default 'ออกแบบเพื่อธุรกิจที่ต้องการความแตกต่างและความน่าเชื่อถือ',
  homepage_why_choose_us_tagline text not null default 'ยกระดับเว็บไซต์ให้เป็นสินทรัพย์เชิงธุรกิจ',
  homepage_why_choose_us_items jsonb not null default '[]'::jsonb,
  homepage_middle_banner_section_gap_px integer not null default 40,
  homepage_middle_banner_section_gap_rem numeric(4,2) not null default 0.15,
  homepage_middle_banner_background_color text not null default '#050b14',
  homepage_middle_banner_image_url text null,
  homepage_middle_banner_image_alt text not null default 'Middle banner',
  homepage_middle_banner_items jsonb not null default '[]'::jsonb,
  homepage_news_section_gap_px integer not null default 48,
  homepage_news_cards jsonb not null default '[]'::jsonb,
  homepage_brand_guarantee_section_gap_px integer not null default 24,
  homepage_brand_guarantee_title text not null default 'แบรนด์การันตีมาตรฐาน / ชั้นนำประเทศไทย',
  homepage_brand_guarantee_subtitle text not null default 'พันธมิตรและมาตรฐานที่เราได้รับความไว้วางใจ',
  homepage_brand_guarantee_align text not null default 'center',
  homepage_brand_guarantee_effect text not null default 'lift',
  homepage_brand_guarantee_items jsonb not null default '[]'::jsonb,
  updated_by text null,
  updated_at timestamptz not null default now(),
  constraint web_settings_banner_background_from_check check (banner_background_from ~ '^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$'),
  constraint web_settings_banner_background_to_check check (banner_background_to ~ '^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$'),
  constraint web_settings_banner_content_align_check check (banner_content_align in ('left','center','right')),
  constraint web_settings_banner_min_height_px_check check (banner_min_height_px between 220 and 720),
  constraint web_settings_banner_eyebrow_font_size_px_check check (banner_eyebrow_font_size_px between 10 and 24),
  constraint web_settings_banner_title_font_size_px_check check (banner_title_font_size_px between 24 and 96),
  constraint web_settings_banner_title_font_scale_thai_percent_check check (banner_title_font_scale_thai_percent between 70 and 110),
  constraint web_settings_banner_description_font_size_px_check check (banner_description_font_size_px between 12 and 36),
  constraint web_settings_banner_text_effect_check check (banner_text_effect in ('none','shadow','glow','gradient')),
  constraint web_settings_banner_image_frame_style_check check (banner_image_frame_style in ('soft','glass','neon','minimal')),
  constraint web_settings_banner_image_motion_check check (banner_image_motion in ('none','slide_lr','float_ud','zoom','tilt')),
  constraint web_settings_banner_image_frame_color_check check (banner_image_frame_color ~ '^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$'),
  constraint web_settings_banner_image_frame_radius_px_check check (banner_image_frame_radius_px between 0 and 40),
  constraint web_settings_banner_image_frame_border_width_px_check check (banner_image_frame_border_width_px between 0 and 8),
  constraint web_settings_page_background_color_check check (page_background_color ~ '^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$'),
  constraint web_settings_footer_bottom_background_color_check check (footer_bottom_background_color ~ '^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$'),
  constraint web_settings_text_color_check check (text_color ~ '^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$'),
  constraint web_settings_homepage_section_gap_px_check check (homepage_section_gap_px between 0 and 200),
  constraint web_settings_homepage_intro_card_background_color_check check (homepage_intro_card_background_color ~ '^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$'),
  constraint web_settings_homepage_intro_title_color_check check (homepage_intro_title_color ~ '^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$'),
  constraint web_settings_homepage_intro_content_color_check check (homepage_intro_content_color ~ '^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$'),
  constraint web_settings_homepage_intro_title_font_size_px_check check (homepage_intro_title_font_size_px between 18 and 96),
  constraint web_settings_homepage_intro_content_font_size_px_check check (homepage_intro_content_font_size_px between 12 and 48),
  constraint web_settings_homepage_intro_title_font_weight_check check (homepage_intro_title_font_weight in (300,400,500,600,700,800,900)),
  constraint web_settings_homepage_intro_content_font_weight_check check (homepage_intro_content_font_weight in (300,400,500,600,700,800,900)),
  constraint web_settings_homepage_image_section_gap_px_check check (homepage_image_section_gap_px between 0 and 200),
  constraint web_settings_homepage_why_choose_us_section_gap_px_check check (homepage_why_choose_us_section_gap_px between 0 and 220),
  constraint web_settings_homepage_middle_banner_section_gap_px_check check (homepage_middle_banner_section_gap_px between 0 and 240),
  constraint web_settings_homepage_middle_banner_section_gap_rem_check check (homepage_middle_banner_section_gap_rem between 0 and 5),
  constraint web_settings_homepage_middle_banner_background_color_check check (homepage_middle_banner_background_color ~ '^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$'),
  constraint web_settings_homepage_news_section_gap_px_check check (homepage_news_section_gap_px between 0 and 220),
  constraint web_settings_homepage_brand_guarantee_section_gap_px_check check (homepage_brand_guarantee_section_gap_px between 0 and 220),
  constraint web_settings_homepage_brand_guarantee_align_check check (homepage_brand_guarantee_align in ('left','center','right')),
  constraint web_settings_homepage_brand_guarantee_effect_check check (homepage_brand_guarantee_effect in ('none','lift','glow','pulse'))
);

insert into public.web_settings (id)
values ('default')
on conflict (id) do nothing;

alter table public.web_settings
  add column if not exists banner_title text not null default 'แพลตฟอร์มลูกค้า เชื่อมสินค้าและคำสั่งซื้อชุดเดียวกับระบบแอดมิน';
alter table public.web_settings
  add column if not exists banner_description text not null default 'ลูกค้าดูสินค้า ตารางราคา โปรโมชัน สั่งซื้อ และชำระเงินผ่าน PromptPay ได้ครบในระบบเดียว';
alter table public.web_settings
  add column if not exists banner_primary_button_label text not null default 'สินค้าของเรา';
alter table public.web_settings
  add column if not exists banner_secondary_button_label text not null default 'กิจกรรม + ส่วนลด/คูปอง';
alter table public.web_settings
  add column if not exists homepage_intro_content text not null default 'SST INNOVATION คือทีมผู้เชี่ยวชาญด้านงานระบบครบวงจร ตั้งแต่กลยุทธ์ดิจิทัล การออกแบบ พัฒนา ไปจนถึงการดูแลหลังส่งมอบ โดยมุ่งเน้นคุณภาพและผลลัพธ์ทางธุรกิจที่วัดผลได้จริง';
alter table public.web_settings
  add column if not exists homepage_why_choose_us_title text not null default 'ทำไมต้อง SST INNOVATION Pro';
alter table public.web_settings
  add column if not exists homepage_why_choose_us_subtitle text not null default 'ออกแบบเพื่อธุรกิจที่ต้องการความแตกต่างและความน่าเชื่อถือ';
alter table public.web_settings
  add column if not exists homepage_why_choose_us_tagline text not null default 'ยกระดับเว็บไซต์ให้เป็นสินทรัพย์เชิงธุรกิจ';
alter table public.web_settings
  add column if not exists homepage_brand_guarantee_title text not null default 'แบรนด์การันตีมาตรฐาน / ชั้นนำประเทศไทย';
alter table public.web_settings
  add column if not exists homepage_brand_guarantee_subtitle text not null default 'พันธมิตรและมาตรฐานที่เราได้รับความไว้วางใจ';
alter table public.web_settings
  alter column banner_auto_height set default true;
alter table public.web_settings
  add column if not exists banner_title_font_scale_thai_percent integer not null default 92;

update public.web_settings
set banner_auto_height = true
where id = 'default';

create or replace function public.touch_web_settings_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_web_settings_updated_at on public.web_settings;
create trigger trg_web_settings_updated_at
before update on public.web_settings
for each row
execute function public.touch_web_settings_updated_at();

create table if not exists public.newsletter_subscribers (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  email text not null unique,
  is_active boolean not null default true,
  unsubscribed_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint newsletter_subscribers_email_check check (position('@' in email) > 1)
);

create index if not exists idx_newsletter_subscribers_active_created
  on public.newsletter_subscribers (is_active, created_at desc);

create table if not exists public.broadcast_messages (
  id uuid primary key default gen_random_uuid(),
  mode text not null check (mode in ('all','single')),
  target_subscriber_id uuid null references public.newsletter_subscribers(id) on delete set null,
  subject text not null,
  headline text not null,
  message text not null,
  image_url text null,
  sent_by text null,
  sent_count integer not null default 0,
  failed_count integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists idx_broadcast_messages_created
  on public.broadcast_messages (created_at desc);

create table if not exists public.broadcast_recipients (
  id uuid primary key default gen_random_uuid(),
  broadcast_message_id uuid not null references public.broadcast_messages(id) on delete cascade,
  subscriber_id uuid null references public.newsletter_subscribers(id) on delete set null,
  email_snapshot text not null,
  status text not null check (status in ('sent','failed')),
  error_message text null,
  sent_at timestamptz not null default now()
);

create index if not exists idx_broadcast_recipients_message
  on public.broadcast_recipients (broadcast_message_id, sent_at desc);

create or replace function public.touch_newsletter_subscribers_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_newsletter_subscribers_updated_at on public.newsletter_subscribers;
create trigger trg_newsletter_subscribers_updated_at
before update on public.newsletter_subscribers
for each row
execute function public.touch_newsletter_subscribers_updated_at();
