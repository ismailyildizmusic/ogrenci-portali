-- =====================================================================
-- GÜNCELLEME 2: Görselli duyurular + bağlantıyla ödev teslimi
-- Supabase → SQL Editor (rol: postgres) → yapıştır → Run.
-- Mevcut verilere dokunmaz.
-- =====================================================================

-- Duyurulara görsel ve bağlantı alanları
alter table public.duyurular add column gorsel_yolu text;
alter table public.duyurular add column baglanti text;

-- Teslimlere bağlantı alanı (Drive/YouTube linki ile teslim için)
alter table public.teslimler add column baglanti text;
alter table public.teslimler alter column dosya_yolu drop not null;
alter table public.teslimler alter column dosya_adi drop not null;

-- Duyuru görselleri için herkese açık depolama alanı
insert into storage.buckets (id, name, public)
values ('duyuru-gorselleri', 'duyuru-gorselleri', true);

create policy "duyuru_gorsel_yukleme" on storage.objects
  for insert with check (bucket_id = 'duyuru-gorselleri' and public.is_admin());

create policy "duyuru_gorsel_okuma" on storage.objects
  for select using (bucket_id = 'duyuru-gorselleri');

create policy "duyuru_gorsel_silme" on storage.objects
  for delete using (bucket_id = 'duyuru-gorselleri' and public.is_admin());
