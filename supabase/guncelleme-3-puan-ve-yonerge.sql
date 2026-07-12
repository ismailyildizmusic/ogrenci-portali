-- =====================================================================
-- GÜNCELLEME 3: Puan/geri bildirim + ödev yönerge dosyaları
-- Supabase → SQL Editor (rol: postgres) → yapıştır → Run.
-- =====================================================================

-- Teslimlere puan ve geri bildirim alanları
alter table public.teslimler add column puan int check (puan between 0 and 100);
alter table public.teslimler add column geri_bildirim text;

-- Admin'in teslimleri puanlayabilmesi için güncelleme yetkisi
create policy "teslim_puanlama" on public.teslimler
  for update using (public.is_admin());

-- Ödevlere yönerge dosyası alanları (nota PDF'i, eşlik kaydı vb.)
alter table public.odevler add column dosya_yolu text;
alter table public.odevler add column dosya_adi text;

-- Yönerge dosyaları için depolama alanı (öğrenciler indirebilsin diye herkese açık)
insert into storage.buckets (id, name, public)
values ('odev-dosyalari', 'odev-dosyalari', true);

create policy "odev_dosya_yukleme" on storage.objects
  for insert with check (bucket_id = 'odev-dosyalari' and public.is_admin());

create policy "odev_dosya_okuma" on storage.objects
  for select using (bucket_id = 'odev-dosyalari');

create policy "odev_dosya_silme" on storage.objects
  for delete using (bucket_id = 'odev-dosyalari' and public.is_admin());
