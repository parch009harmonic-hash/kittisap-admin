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
  banner_auto_height boolean not null default false,
  banner_min_height_px integer not null default 340,
  banner_eyebrow_font_size_px integer not null default 11,
  banner_title_font_size_px integer not null default 56,
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
  updated_by text null,
  updated_at timestamptz not null default now(),
  constraint web_settings_banner_background_from_check check (banner_background_from ~ '^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$'),
  constraint web_settings_banner_background_to_check check (banner_background_to ~ '^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$'),
  constraint web_settings_banner_content_align_check check (banner_content_align in ('left','center','right')),
  constraint web_settings_banner_min_height_px_check check (banner_min_height_px between 220 and 720),
  constraint web_settings_banner_eyebrow_font_size_px_check check (banner_eyebrow_font_size_px between 10 and 24),
  constraint web_settings_banner_title_font_size_px_check check (banner_title_font_size_px between 24 and 96),
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
  constraint web_settings_homepage_image_section_gap_px_check check (homepage_image_section_gap_px between 0 and 200)
);

insert into public.web_settings (id)
values ('default')
on conflict (id) do nothing;

alter table public.web_settings
  add column if not exists banner_image_url text null;

alter table public.web_settings
  add column if not exists banner_show_buttons boolean not null default true;

alter table public.web_settings
  add column if not exists banner_content_align text not null default 'left';

alter table public.web_settings
  add column if not exists banner_auto_height boolean not null default false;

alter table public.web_settings
  add column if not exists banner_min_height_px integer not null default 340;

alter table public.web_settings
  add column if not exists banner_eyebrow_font_size_px integer not null default 11;

alter table public.web_settings
  add column if not exists banner_title_font_size_px integer not null default 56;

alter table public.web_settings
  add column if not exists banner_description_font_size_px integer not null default 18;

alter table public.web_settings
  add column if not exists banner_text_effect text not null default 'none';

alter table public.web_settings
  add column if not exists banner_image_frame_enabled boolean not null default true;

alter table public.web_settings
  add column if not exists banner_image_frame_style text not null default 'soft';

alter table public.web_settings
  add column if not exists banner_image_motion text not null default 'none';

alter table public.web_settings
  add column if not exists banner_image_frame_color text not null default '#ffffff';

alter table public.web_settings
  add column if not exists banner_image_frame_radius_px integer not null default 16;

alter table public.web_settings
  add column if not exists banner_image_frame_border_width_px integer not null default 1;

alter table public.web_settings
  add column if not exists page_background_color text not null default '#0b0f16';

alter table public.web_settings
  add column if not exists footer_bottom_background_color text not null default '#0f172a';

alter table public.web_settings
  add column if not exists text_color text not null default '#cbd5e1';

alter table public.web_settings
  add column if not exists homepage_intro_title text not null default 'SST INNOVATION CO., LTD.';

alter table public.web_settings
  add column if not exists homepage_intro_content text not null default 'SST INNOVATION คือทีมผู้เชี่ยวชาญด้านงานระบบครบวงจร ตั้งแต่กลยุทธ์ดิจิทัล การออกแบบ พัฒนา ไปจนถึงการดูแลหลังส่งมอบ โดยมุ่งเน้นคุณภาพและผลลัพธ์ทางธุรกิจที่วัดผลได้จริง';

alter table public.web_settings
  add column if not exists homepage_section_gap_px integer not null default 56;

alter table public.web_settings
  add column if not exists homepage_intro_card_background_color text not null default '#ffffff';

alter table public.web_settings
  add column if not exists homepage_intro_title_color text not null default '#0f274f';

alter table public.web_settings
  add column if not exists homepage_intro_content_color text not null default '#1f3a62';

alter table public.web_settings
  add column if not exists homepage_intro_title_font_size_px integer not null default 56;

alter table public.web_settings
  add column if not exists homepage_intro_content_font_size_px integer not null default 24;

alter table public.web_settings
  add column if not exists homepage_intro_title_font_weight integer not null default 800;

alter table public.web_settings
  add column if not exists homepage_intro_content_font_weight integer not null default 500;

alter table public.web_settings
  add column if not exists homepage_intro_text_glow boolean not null default false;

alter table public.web_settings
  add column if not exists homepage_image_section_gap_px integer not null default 36;

alter table public.web_settings
  add column if not exists homepage_image_boxes jsonb not null default '[]'::jsonb;

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
