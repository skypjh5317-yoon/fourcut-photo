-- Run this in the Supabase SQL editor.
-- Set an administrator's app_metadata.role to "admin" in Supabase Auth.

create table if not exists public.backgrounds (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  image_url text not null,
  storage_path text not null unique,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

alter table public.backgrounds enable row level security;

drop policy if exists "Anyone can read active backgrounds" on public.backgrounds;
create policy "Anyone can read active backgrounds"
  on public.backgrounds for select
  using (is_active = true or (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

drop policy if exists "Admins can insert backgrounds" on public.backgrounds;
create policy "Admins can insert backgrounds"
  on public.backgrounds for insert to authenticated
  with check ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

drop policy if exists "Admins can update backgrounds" on public.backgrounds;
create policy "Admins can update backgrounds"
  on public.backgrounds for update to authenticated
  using ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
  with check ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

drop policy if exists "Admins can delete backgrounds" on public.backgrounds;
create policy "Admins can delete backgrounds"
  on public.backgrounds for delete to authenticated
  using ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

insert into storage.buckets (id, name, public)
values ('photo-backgrounds', 'photo-backgrounds', true)
on conflict (id) do nothing;

drop policy if exists "Anyone can view background files" on storage.objects;
create policy "Anyone can view background files"
  on storage.objects for select
  using (bucket_id = 'photo-backgrounds');

drop policy if exists "Admins can upload background files" on storage.objects;
create policy "Admins can upload background files"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'photo-backgrounds'
    and (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
  );

drop policy if exists "Admins can delete background files" on storage.objects;
create policy "Admins can delete background files"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'photo-backgrounds'
    and (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
  );
