# Öğrenci Portalı — Kurulum Kılavuzu

Bu proje üç ücretsiz servisle çalışır: **Supabase** (veritabanı + giriş sistemi + dosya depolama), **Vercel** (siteyi internette yayınlama) ve bilgisayarında **Node.js** (siteyi derlemek için).

---

## 1. Adım — Supabase projesi aç (yaklaşık 5 dakika)

1. https://supabase.com adresine git, ücretsiz hesap aç.
2. "New project" ile yeni proje oluştur. Proje adı serbest, veritabanı şifresini bir yere not et, bölge olarak **Europe (Frankfurt)** seç (Türkiye'ye en yakını).
3. Proje açılınca sol menüden **SQL Editor**'a gir. Bu klasördeki `supabase/kurulum.sql` dosyasının **tamamını** kopyalayıp yapıştır ve **Run** de. Tablolar, güvenlik kuralları ve dosya deposu otomatik kurulur.

## 2. Adım — E-posta onayını kapat

Sistem kullanıcı adıyla çalışır, gerçek e-posta kullanılmaz. Bu yüzden:

1. Sol menüden **Authentication → Sign In / Providers → Email** bölümüne gir.
2. **"Confirm email"** seçeneğini **kapat** ve kaydet.

## 3. Adım — İlk admin hesabını oluştur

1. **Authentication → Users → Add user → Create new user**
2. Email: `admin@ogrenci.portal` — Şifre: kendin belirle — **"Auto Confirm User"** işaretli olsun.
3. **SQL Editor**'a dön ve şunu çalıştır:

```sql
insert into public.profiles (id, ad_soyad, kullanici_adi, rol)
select id, 'Yönetici', 'admin', 'admin' from auth.users
where email = 'admin@ogrenci.portal';
```

Artık siteye kullanıcı adı `admin` ve belirlediğin şifreyle gireceksin.

## 4. Adım — Anahtarları projeye tanıt

1. Supabase'de **Project Settings → API** bölümünden iki değeri kopyala: **Project URL** ve **anon public key**.
2. Bu klasörde `.env.example` dosyasını kopyalayıp adını `.env` yap ve içini doldur:

```
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOi...
```

> anon key'in sitede görünmesi normaldir ve güvenlidir; asıl koruma veritabanındaki RLS kurallarındadır (kurulum.sql bunları zaten kurdu). **service_role** anahtarını ise asla kimseyle paylaşma ve siteye koyma.

## 5. Adım — Bilgisayarında çalıştır ve test et

Node.js kurulu değilse https://nodejs.org adresinden LTS sürümünü kur. Sonra bu klasörde terminal aç:

```
npm install
npm run dev
```

Tarayıcıda `http://localhost:5173` açılır. `admin` ile giriş yap, Öğrenciler sekmesinden birkaç öğrenci ekle, öğrenci hesabıyla girip ödev yüklemeyi dene.

## 6. Adım — İnternette yayınla (Vercel)

1. Projeyi GitHub'a yükle (GitHub hesabı + "New repository" + dosyaları yükle; `.env` dosyasını **yükleme**, zaten `.gitignore`'da).
2. https://vercel.com adresinde GitHub ile giriş yap, **Add New → Project** de ve depoyu seç.
3. **Environment Variables** bölümüne `.env` içindeki iki değeri (`VITE_SUPABASE_URL` ve `VITE_SUPABASE_ANON_KEY`) ekle.
4. **Deploy**'a bas. Birkaç dakika içinde `senin-proje.vercel.app` adresinde site yayında olur. İstersen sonradan kendi alan adını da bağlayabilirsin.

---

## Günlük kullanım

- **Öğrenci ekleme:** Admin panelindeki Öğrenciler sekmesinden ad, kullanıcı adı ve başlangıç şifresi ile eklersin; giriş bilgilerini öğrenciye iletirsin. Öğrenci isterse Ayarlar sekmesinden şifresini değiştirir.
- **Şifresini unutan öğrenci:** Supabase panelinde **Authentication → Users** bölümünden ilgili kullanıcıyı bul (`kullaniciadi@ogrenci.portal` biçiminde görünür), üç nokta menüsünden yeni şifre ata.
- **Öğrenci silme:** Panelden sildiğinde portal verileri temizlenir; giriş hesabını tamamen kapatmak için Supabase'de Authentication → Users'tan da sil.

## Bilinmesi gereken sınırlar

- **Ücretsiz Supabase paketi:** 500 MB veritabanı + 1 GB dosya depolama + tek dosyada 50 MB sınırı. 30-100 öğrenci ve PDF/Word ağırlıklı ödevler için fazlasıyla yeter.
- **Videolar:** 50 MB'ı aşan videolar ücretsiz pakette yüklenemez. Çözümler: öğrencilerden videoyu sıkıştırmalarını iste, YouTube'a "liste dışı" yükleyip linki bir dokümana koymalarını söyle, ya da aylık 25 dolarlık Pro pakete geç (100 GB depolama, 5 GB'a kadar tek dosya).
- Depolama dolmaya başlarsa admin panelinin Teslimler sekmesinden eski dönem dosyalarını indirip Supabase panelinden (Storage → teslimler) silebilirsin.

## Sorun giderme

- **"Kullanıcı adı veya şifre hatalı"** ama bilgiler doğru → 2. adımdaki e-posta onayı kapatılmamış olabilir.
- **Öğrenci eklerken hata** → `kurulum.sql` tamamen çalıştırıldı mı ve giriş yaptığın hesabın `rol` değeri `admin` mi kontrol et (Table Editor → profiles).
- **Dosya yüklenmiyor** → dosya 50 MB'tan büyük olabilir; ya da Storage'da `teslimler` bucket'ı oluşmamıştır (SQL'in 5. bölümünü tekrar çalıştır).
