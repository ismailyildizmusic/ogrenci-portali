-- =====================================================================
-- ÖĞRENCİ PORTALI — Supabase kurulum betiği
-- Supabase panelinde SQL Editor'a bu dosyanın TAMAMINI yapıştırıp çalıştır.
-- =====================================================================

-- 1) PROFİLLER --------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  ad_soyad text not null,
  kullanici_adi text unique not null,
  rol text not null default 'ogrenci' check (rol in ('ogrenci', 'admin')),
  created_at timestamptz default now()
);

-- Admin kontrolü (RLS içinde döngü oluşmasın diye security definer)
create or replace function public.is_admin()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and rol = 'admin'
  );
$$;

alter table public.profiles enable row level security;

create policy "profil_okuma" on public.profiles
  for select using (auth.uid() = id or public.is_admin());

create policy "profil_ekleme" on public.profiles
  for insert with check (public.is_admin() or auth.uid() = id);

create policy "profil_guncelleme" on public.profiles
  for update using (public.is_admin());

create policy "profil_silme" on public.profiles
  for delete using (public.is_admin());

-- 2) SORUMLULUKLAR ----------------------------------------------------
create table public.sorumluluklar (
  id uuid primary key default gen_random_uuid(),
  ogrenci_id uuid not null references public.profiles(id) on delete cascade,
  baslik text not null,
  aciklama text,
  durum text not null default 'bekliyor' check (durum in ('bekliyor', 'tamamlandi')),
  created_at timestamptz default now()
);

alter table public.sorumluluklar enable row level security;

create policy "sorumluluk_okuma" on public.sorumluluklar
  for select using (ogrenci_id = auth.uid() or public.is_admin());

create policy "sorumluluk_ekleme" on public.sorumluluklar
  for insert with check (public.is_admin());

create policy "sorumluluk_guncelleme" on public.sorumluluklar
  for update using (ogrenci_id = auth.uid() or public.is_admin());

create policy "sorumluluk_silme" on public.sorumluluklar
  for delete using (public.is_admin());

-- 3) ETKİNLİKLER ------------------------------------------------------
create table public.etkinlikler (
  id uuid primary key default gen_random_uuid(),
  baslik text not null,
  aciklama text,
  tarih timestamptz,
  konum text,
  created_at timestamptz default now()
);

create table public.etkinlik_katilimcilari (
  etkinlik_id uuid not null references public.etkinlikler(id) on delete cascade,
  ogrenci_id uuid not null references public.profiles(id) on delete cascade,
  primary key (etkinlik_id, ogrenci_id)
);

alter table public.etkinlikler enable row level security;
alter table public.etkinlik_katilimcilari enable row level security;

create policy "etkinlik_okuma" on public.etkinlikler
  for select using (auth.role() = 'authenticated');

create policy "etkinlik_yonetim" on public.etkinlikler
  for all using (public.is_admin()) with check (public.is_admin());

create policy "katilimci_okuma" on public.etkinlik_katilimcilari
  for select using (ogrenci_id = auth.uid() or public.is_admin());

create policy "katilimci_yonetim" on public.etkinlik_katilimcilari
  for all using (public.is_admin()) with check (public.is_admin());

-- 4) ÖDEVLER ve TESLİMLER ---------------------------------------------
create table public.odevler (
  id uuid primary key default gen_random_uuid(),
  baslik text not null,
  aciklama text,
  son_tarih timestamptz,
  created_at timestamptz default now()
);

create table public.teslimler (
  id uuid primary key default gen_random_uuid(),
  odev_id uuid not null references public.odevler(id) on delete cascade,
  ogrenci_id uuid not null references public.profiles(id) on delete cascade,
  dosya_yolu text not null,
  dosya_adi text not null,
  dosya_boyut bigint,
  created_at timestamptz default now()
);

alter table public.odevler enable row level security;
alter table public.teslimler enable row level security;

create policy "odev_okuma" on public.odevler
  for select using (auth.role() = 'authenticated');

create policy "odev_yonetim" on public.odevler
  for all using (public.is_admin()) with check (public.is_admin());

create policy "teslim_okuma" on public.teslimler
  for select using (ogrenci_id = auth.uid() or public.is_admin());

create policy "teslim_ekleme" on public.teslimler
  for insert with check (ogrenci_id = auth.uid());

create policy "teslim_silme" on public.teslimler
  for delete using (ogrenci_id = auth.uid() or public.is_admin());

-- 5) DOSYA DEPOLAMA (Storage) -----------------------------------------
insert into storage.buckets (id, name, public)
values ('teslimler', 'teslimler', false);

-- Öğrenci yalnızca kendi klasörüne ({kendi_id}/...) yükleyebilir
create policy "depo_yukleme" on storage.objects
  for insert with check (
    bucket_id = 'teslimler'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Öğrenci kendi dosyalarını, admin herkesinkini okuyabilir
create policy "depo_okuma" on storage.objects
  for select using (
    bucket_id = 'teslimler'
    and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin())
  );

-- Öğrenci kendi dosyasını, admin herkesinkini silebilir
create policy "depo_silme" on storage.objects
  for delete using (
    bucket_id = 'teslimler'
    and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin())
  );

-- =====================================================================
-- 6) İLK ADMİN HESABI
-- Önce Supabase panelinde: Authentication → Users → Add user →
--   Email: admin@ogrenci.portal   Şifre: (belirle)  → "Auto Confirm User" işaretli
-- Sonra aşağıdaki satırı çalıştır (e-postayı birebir aynı yaz):
-- =====================================================================
-- insert into public.profiles (id, ad_soyad, kullanici_adi, rol)
-- select id, 'Yönetici', 'admin', 'admin' from auth.users
-- where email = 'admin@ogrenci.portal';
