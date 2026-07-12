// =====================================================================
// TESLİM BİLDİRİM FONKSİYONU
// Bu kodu Supabase → Edge Functions → yeni fonksiyon editörüne yapıştır.
// Kurulum adımları: BILDIRIM-KURULUM.md dosyasında.
// =====================================================================

import { createClient } from 'npm:@supabase/supabase-js@2'

Deno.serve(async (req) => {
  try {
    const { record } = await req.json()

    // Öğrenci adını ve ödev başlığını veritabanından al
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )
    const [{ data: ogrenci }, { data: odev }] = await Promise.all([
      supabase.from('profiles').select('ad_soyad').eq('id', record.ogrenci_id).single(),
      supabase.from('odevler').select('baslik').eq('id', record.odev_id).single(),
    ])

    const ad = ogrenci?.ad_soyad ?? 'Bir öğrenci'
    const odevAdi = odev?.baslik ?? 'bir ödev'
    const teslim = record.baglanti
      ? `Bağlantı ile teslim: <a href="${record.baglanti}">${record.baglanti}</a>`
      : `Dosya: ${record.dosya_adi ?? ''}`

    // Resend ile e-posta gönder
    const cevap = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${Deno.env.get('RESEND_API_KEY')}`,
      },
      body: JSON.stringify({
        from: 'Bilsem Müzik Portalı <onboarding@resend.dev>',
        to: ['adapazaribilsemmuzikkulubu@gmail.com'],
        subject: `🎵 Yeni teslim: ${ad} — ${odevAdi}`,
        html: `
          <div style="font-family:sans-serif;line-height:1.6">
            <h2 style="color:#14624f">Yeni ödev teslimi</h2>
            <p><strong>${ad}</strong>, <strong>"${odevAdi}"</strong> ödevine teslim yaptı.</p>
            <p>${teslim}</p>
            <p><a href="https://adapazaribilsemmuzik.com" style="background:#14624f;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none">Portalı aç</a></p>
          </div>
        `,
      }),
    })

    if (!cevap.ok) {
      const hata = await cevap.text()
      console.error('Resend hatası:', hata)
      return new Response('mail hatası: ' + hata, { status: 500 })
    }

    return new Response('ok')
  } catch (e) {
    console.error(e)
    return new Response('hata: ' + e.message, { status: 500 })
  }
})
