-- =============================================
-- Gallery Feature — Supabase Schema
-- Run in: Supabase Dashboard → SQL Editor
-- Safe to run multiple times (idempotent)
-- =============================================

-- Tag groups (e.g. "النوع", "المصدر")
create table if not exists gallery_tag_groups (
  id            uuid primary key default gen_random_uuid(),
  project_id    uuid references projects(id) on delete cascade,
  name          text not null,
  allow_multiple boolean not null default false,
  created_at    timestamptz default now()
);

-- Tag values within a group (e.g. "رخام", "جرانيت", "مصري", "مستورد")
create table if not exists gallery_tags (
  id         uuid primary key default gen_random_uuid(),
  group_id   uuid references gallery_tag_groups(id) on delete cascade,
  name       text not null,
  created_at timestamptz default now()
);

-- Images uploaded to Cloudflare R2
create table if not exists gallery_images (
  id            uuid primary key default gen_random_uuid(),
  project_id    uuid references projects(id) on delete cascade,
  r2_key        text not null,
  r2_thumb_key  text,
  url           text not null,
  thumbnail_url text,
  title         text,
  created_at    timestamptz default now()
);

-- Add new columns if they don't exist yet (safe for re-runs)
alter table gallery_images add column if not exists r2_thumb_key  text;
alter table gallery_images add column if not exists thumbnail_url text;

-- Many-to-many: images <-> tags
create table if not exists gallery_image_tags (
  image_id uuid references gallery_images(id) on delete cascade,
  tag_id   uuid references gallery_tags(id) on delete cascade,
  primary key (image_id, tag_id)
);

-- Enable RLS
alter table gallery_tag_groups enable row level security;
alter table gallery_tags        enable row level security;
alter table gallery_images      enable row level security;
alter table gallery_image_tags  enable row level security;

-- Drop existing policies first (safe for re-runs)
drop policy if exists "Public read tag_groups" on gallery_tag_groups;
drop policy if exists "Public read tags"       on gallery_tags;
drop policy if exists "Public read images"     on gallery_images;
drop policy if exists "Public read image_tags" on gallery_image_tags;
drop policy if exists "Service all tag_groups" on gallery_tag_groups;
drop policy if exists "Service all tags"       on gallery_tags;
drop policy if exists "Service all images"     on gallery_images;
drop policy if exists "Service all image_tags" on gallery_image_tags;

-- Allow read access to everyone (for public gallery page)
create policy "Public read tag_groups"  on gallery_tag_groups  for select using (true);
create policy "Public read tags"        on gallery_tags         for select using (true);
create policy "Public read images"      on gallery_images       for select using (true);
create policy "Public read image_tags"  on gallery_image_tags   for select using (true);

-- Allow full access to service role (used by API routes)
create policy "Service all tag_groups"  on gallery_tag_groups  for all using (true) with check (true);
create policy "Service all tags"        on gallery_tags         for all using (true) with check (true);
create policy "Service all images"      on gallery_images       for all using (true) with check (true);
create policy "Service all image_tags"  on gallery_image_tags   for all using (true) with check (true);
