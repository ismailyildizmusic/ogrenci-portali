# Teslim Bildirimi Kurulumu (E-posta)

Öğrenci ödev teslim ettiğinde **adapazaribilsemmuzikkulubu@gmail.com** adresine otomatik mail gelmesi için. Toplam ~15 dakika, tamamen ücretsiz.

Mantık: Teslim tablosuna yeni kayıt düşünce Supabase bir "webhook" tetikler → bu, bizim küçük fonksiyonumuzu çalıştırır → fonksiyon da Resend adlı mail servisiyle sana mail atar.

---

## 1. Adım — Resend hesabı aç (mail gönderme servisi)

1. https://resend.com adresine git → **Sign up**.
2. **ÖNEMLİ:** Hesabı **adapazaribilsemmuzikkulubu@gmail.com** adresiyle aç. Sebebi: ücretsiz pakette Resend, alan adı doğrulaması yapmadan yalnızca **hesap sahibinin kendi adresine** mail göndermene izin verir. Hesabı bu gmail ile açınca bildirimler sorunsuz gelir. (Gelen kutusuna gelen doğrulama mailini onaylamayı unutma.)
3. Giriş yaptıktan sonra sol menüden **API Keys** → **Create API Key** → adı `portal` olabilir → oluştur.
4. `re_` ile başlayan anahtarı kopyala ve bir yere not et — **bir daha gösterilmez**.

> Not: İleride "portal@adapazaribilsemmuzik.com" gibi kendi adresinden göndermek istersen Resend'de **Domains** bölümünden alan adını doğrularsın (Vercel'de yaptığın gibi birkaç DNS kaydı) — o zaman istediğin adrese de mail atabilir. Şimdilik gerek yok.

## 2. Adım — Fonksiyonu oluştur

1. Supabase panelinde sol menüden **Edge Functions** bölümüne gir.
2. **Deploy a new function** (veya **Create function**) → **Via Editor** seçeneğini seç.
3. Fonksiyon adı: `teslim-bildirimi`
4. Editörde hazır gelen örnek kodu tamamen sil, `supabase/bildirim-fonksiyonu.ts` dosyasındaki kodun **tamamını** yapıştır.
5. **Deploy** butonuna bas ve bitmesini bekle.

## 3. Adım — Anahtarı fonksiyona tanıt

1. **Edge Functions → Secrets** bölümüne gir (bazı sürümlerde: Project Settings → Edge Functions).
2. **Add new secret**:
   - Name: `RESEND_API_KEY`
   - Value: 1. adımda kopyaladığın `re_...` anahtarı
3. Kaydet.

## 4. Adım — Fonksiyonun kapısını webhook'a aç

1. **Edge Functions → teslim-bildirimi** fonksiyonuna tıkla → **Details** (Ayrıntılar) bölümünü bul.
2. **"Verify JWT" / "Enforce JWT verification"** seçeneğini **kapat** ve kaydet. (Bunu yapmazsan webhook fonksiyona ulaşamaz ve mail gelmez.)

## 5. Adım — Webhook'u kur (tetikleyici)

1. Sol menüden **Database → Webhooks** → ilk kezse **Enable webhooks** de.
2. **Create a new hook**:
   - **Name:** `teslim-maili`
   - **Table:** `teslimler` (şema: public)
   - **Events:** sadece **INSERT** işaretli olsun
   - **Type of webhook:** **Supabase Edge Functions** seç
   - **Edge function:** `teslim-bildirimi`
3. **Create webhook** ile kaydet.

## 6. Adım — Test et

1. Siteye bir öğrenci hesabıyla gir ve herhangi bir ödeve küçük bir dosya ya da bağlantı teslim et.
2. 1 dakika içinde **adapazaribilsemmuzikkulubu@gmail.com** adresine "🎵 Yeni teslim: …" konulu mail gelmeli.
3. Gelmezse önce **spam klasörüne** bak (ilk mailler genelde oraya düşer — "spam değil" işaretle, sonrakiler gelen kutusuna gelir).

## Sorun giderme

- Mail hiç gelmiyorsa: Supabase → Edge Functions → teslim-bildirimi → **Logs** bölümüne bak. "Resend hatası" satırı varsa mesajı oku:
  - `API key is invalid` → 3. adımdaki secret yanlış girilmiş.
  - `You can only send testing emails to your own email address` → Resend hesabı gmail adresinle açılmamış (1. adım) ya da fonksiyondaki alıcı adres farklı.
- Log'da hiç kayıt yoksa webhook tetiklenmiyor demektir → 5. adımı kontrol et; ayrıca 4. adımdaki JWT ayarının kapalı olduğundan emin ol.
