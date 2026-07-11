-- =====================================================================
-- GÜNCELLEME 1: DUYURULAR
-- Supabase → SQL Editor'a yapıştır (sağ üstte rol: postgres) → Run.
-- Bu betik mevcut verilere dokunmaz, sadece duyuru tablosunu ekler.
-- =====================================================================

create table public.duyurular (
  id uuid primary key default gen_random_uuid(),
  baslik text not null,
  icerik text,
  onemli boolean not null default false,
  created_at timestamptz default now()
);

alter table public.duyurular enable row level security;

-- Giriş yapan herkes duyuruları okuyabilir
create policy "duyuru_okuma" on public.duyurular
  for select using (auth.role() = 'authenticated');

-- Yalnızca admin ekler, düzenler, siler
create policy "duyuru_yonetim" on public.duyurular
  for all using (public.is_admin()) with check (public.is_admin());
