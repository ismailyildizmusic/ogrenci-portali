import { useState, useRef, useEffect } from 'react'
import { supabase } from './supabaseClient'

// =====================================================================
// YARDIM ASISTANI — kişisel veri okuyan, kural tabanlı, API'siz.
// Öğrencinin kendi görev/ödev/etkinlik/puan verilerini okuyup cevaplar.
// =====================================================================

const tarihYaz = (t) => (t ? new Date(t).toLocaleString('tr-TR', { dateStyle: 'medium', timeStyle: 'short' }) : '')

// --- Genel "nasıl yapılır" cevapları (kişisel veri gerektirmeyenler) ---
const SSS = [
  { anahtarlar: ['şifre', 'sifre', 'parola', 'unuttum'], cevap: 'Şifreni unuttuysan öğretmenine haber ver, yeni şifre tanımlasın. Değiştirmek istersen "Ayarlar" sekmesinden yapabilirsin. 🔐' },
  { anahtarlar: ['nasıl teslim', 'nasil teslim', 'nasıl yükle', 'nasil yukle', 'nasıl gönder', 'nasil gonder'], cevap: 'Ödev teslimi 2 adımdır: "Ödevlerim" sekmesinde 1️⃣ "Dosya seç" ile dosyanı seç (veya bağlantı yapıştır), sonra 2️⃣ "Teslim et" butonuna bas. 📚' },
  { anahtarlar: ['drive', 'video', 'büyük', 'buyuk', '50 mb', 'youtube'], cevap: 'Dosyan 50 MB\'tan büyükse: videoyu Google Drive\'ına yükle → Paylaş → "Bağlantıya sahip herkes" → linki ödevdeki kutuya yapıştır → "Teslim et". 🎬' },
  { anahtarlar: ['uygulama', 'telefon', 'kur', 'ana ekran', 'indir'], cevap: 'iPhone: Safari\'de siteyi aç → paylaş → "Ana Ekrana Ekle". Android: Chrome menüsü (⋮) → "Ana ekrana ekle". Logomuz telefonunda belirir. 📱' },
  { anahtarlar: ['yanlış', 'yanlis', 'sil', 'hata yaptım'], cevap: 'Yanlış dosya teslim ettiysen: teslimin yanındaki "Sil" butonuyla sil, doğrusunu yeniden teslim et. 🔄' },
  { anahtarlar: ['merhaba', 'selam', 'hey', 'naber'], cevap: 'Merhaba! 👋 Görevlerini, ödevlerini, etkinliklerini ve puanlarını bana sorabilirsin. Aşağıdaki hazır sorulara da dokunabilirsin.' },
  { anahtarlar: ['teşekkür', 'tesekkur', 'sağol', 'sagol'], cevap: 'Rica ederim! Başarılar! 🎵' },
]

const VARSAYILAN =
  'Bunu tam anlayamadım. 🤔 Şunları sorabilirsin: "görevlerim neler", "hangi ödevlerim eksik", "yaklaşan etkinlikler", "puanlarım", "son duyurular"… ya da öğretmenine danışabilirsin.'

export default function YardimBotu({ profil }) {
  const [acik, setAcik] = useState(false)
  const [mesajlar, setMesajlar] = useState([
    { kim: 'bot', metin: `Merhaba ${profil.ad_soyad.split(' ')[0]}! 👋 Görevlerini, ödevlerini, etkinliklerini ve puanlarını bana sorabilirsin.` },
  ])
  const [soru, setSoru] = useState('')
  const [dusunuyor, setDusunuyor] = useState(false)
  const veriRef = useRef(null)
  const altRef = useRef(null)

  useEffect(() => {
    altRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [mesajlar, acik, dusunuyor])

  // Kişisel verileri getir (panel ilk açıldığında; her açılışta tazelenir)
  const veriGetir = async () => {
    const admin = profil.rol === 'admin'
    const [sorumluluklar, etkinlikler, odevler, teslimler, duyurular, ogrenciSayisi] = await Promise.all([
      admin
        ? supabase.from('sorumluluklar').select('baslik, durum, ogrenci:profiles(ad_soyad)')
        : supabase.from('sorumluluklar').select('baslik, aciklama, durum').eq('ogrenci_id', profil.id),
      admin
        ? supabase.from('etkinlikler').select('baslik, tarih, konum')
        : supabase.from('etkinlik_katilimcilari').select('etkinlik:etkinlikler(baslik, tarih, konum)').eq('ogrenci_id', profil.id),
      supabase.from('odevler').select('id, baslik, son_tarih'),
      admin
        ? supabase.from('teslimler').select('odev_id, puan, geri_bildirim, ogrenci:profiles(ad_soyad)')
        : supabase.from('teslimler').select('odev_id, puan, geri_bildirim, dosya_adi').eq('ogrenci_id', profil.id),
      supabase.from('duyurular').select('baslik, created_at').order('created_at', { ascending: false }).limit(3),
      admin ? supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('rol', 'ogrenci') : Promise.resolve({ count: null }),
    ])
    veriRef.current = {
      admin,
      sorumluluklar: sorumluluklar.data || [],
      etkinlikler: admin ? (etkinlikler.data || []) : (etkinlikler.data || []).map((k) => k.etkinlik).filter(Boolean),
      odevler: odevler.data || [],
      teslimler: teslimler.data || [],
      duyurular: duyurular.data || [],
      ogrenciSayisi: ogrenciSayisi.count,
    }
  }

  const panelAc = async () => {
    const acilacak = !acik
    setAcik(acilacak)
    if (acilacak) {
      veriRef.current = null
      veriGetir()
    }
  }

  // --- Kişisel veri cevapları ---
  const veriCevabi = (s) => {
    const v = veriRef.current
    if (!v) return null

    // Görevler / sorumluluklar
    if (/görev|gorev|sorumluluk/.test(s)) {
      if (v.admin) {
        const bekleyen = v.sorumluluklar.filter((x) => x.durum !== 'tamamlandi')
        if (bekleyen.length === 0) return 'Şu anda bekleyen görev yok, tüm sorumluluklar tamamlanmış. ✅'
        return `Bekleyen ${bekleyen.length} görev var:\n` + bekleyen.slice(0, 8).map((x) => `• ${x.ogrenci?.ad_soyad}: ${x.baslik}`).join('\n')
      }
      if (v.sorumluluklar.length === 0) return 'Şu anda sana atanmış bir görev yok. 🎉'
      const bekleyen = v.sorumluluklar.filter((x) => x.durum !== 'tamamlandi')
      const biten = v.sorumluluklar.length - bekleyen.length
      let m = `${v.sorumluluklar.length} görevin var (${biten} tamamlandı):\n`
      m += v.sorumluluklar.map((x) => `${x.durum === 'tamamlandi' ? '✅' : '⏳'} ${x.baslik}`).join('\n')
      if (bekleyen.length > 0) m += '\n\nBir görevi bitirince "Sorumluluklarım" sekmesinden tamamlandı olarak işaretlemeyi unutma!'
      return m
    }

    // Eksik ödevler / teslimler
    if (/ödev|odev|eksik|teslim et(m|c)|kalan/.test(s) && !/nasıl|nasil/.test(s)) {
      const teslimEdilenler = new Set(v.teslimler.map((t) => t.odev_id))
      if (v.admin) {
        return `Sistemde ${v.odevler.length} ödev ve toplam ${v.teslimler.length} teslim var. Detaylar için "Teslimler" sekmesine bakabilirsin.`
      }
      const eksikler = v.odevler.filter((o) => !teslimEdilenler.has(o.id))
      if (v.odevler.length === 0) return 'Şu anda tanımlı bir ödev yok.'
      if (eksikler.length === 0) return `Harikasın, ${v.odevler.length} ödevin hepsini teslim etmişsin! 🎉`
      let m = `Teslim etmediğin ${eksikler.length} ödev var:\n`
      m += eksikler.map((o) => `📌 ${o.baslik}${o.son_tarih ? ' — son gün: ' + tarihYaz(o.son_tarih) : ''}`).join('\n')
      return m
    }

    // Etkinlikler
    if (/etkinlik|konser|prova|ne zaman/.test(s)) {
      const simdi = new Date()
      const yaklasan = v.etkinlikler
        .filter((e) => !e.tarih || new Date(e.tarih) >= simdi)
        .sort((a, b) => new Date(a.tarih || 0) - new Date(b.tarih || 0))
      if (yaklasan.length === 0) return v.admin ? 'Yaklaşan etkinlik yok.' : 'Dahil olduğun yaklaşan bir etkinlik görünmüyor.'
      let m = 'Yaklaşan etkinlikler:\n'
      m += yaklasan.slice(0, 5).map((e) => `🗓️ ${e.baslik}${e.tarih ? ' — ' + tarihYaz(e.tarih) : ''}${e.konum ? ' 📍 ' + e.konum : ''}`).join('\n')
      return m
    }

    // Puanlar
    if (/puan|not(um|lar)|değerlendir|degerlendir/.test(s)) {
      if (v.admin) {
        const bekleyen = v.teslimler.filter((t) => t.puan == null && !t.geri_bildirim).length
        return bekleyen > 0
          ? `Değerlendirme bekleyen ${bekleyen} teslim var. "Teslimler" sekmesinden puanlayabilirsin.`
          : 'Tüm teslimler değerlendirilmiş. ✅'
      }
      const puanlilar = v.teslimler.filter((t) => t.puan != null || t.geri_bildirim)
      if (puanlilar.length === 0) return 'Henüz değerlendirilen bir teslimin yok. Öğretmenin puanladığında burada ve "Ödevlerim" sekmesinde görünecek.'
      const odevAdi = (id) => v.odevler.find((o) => o.id === id)?.baslik || 'Ödev'
      let m = 'Değerlendirilen teslimlerin:\n'
      m += puanlilar.map((t) => `⭐ ${odevAdi(t.odev_id)}: ${t.puan != null ? t.puan + ' puan' : ''}${t.geri_bildirim ? ' 💬 "' + t.geri_bildirim + '"' : ''}`).join('\n')
      return m
    }

    // Duyurular
    if (/duyuru|haber|yenilik/.test(s)) {
      if (v.duyurular.length === 0) return 'Henüz duyuru yok.'
      return 'Son duyurular:\n' + v.duyurular.map((d) => `📢 ${d.baslik} (${tarihYaz(d.created_at)})`).join('\n') + '\n\nDetaylar "Duyurular" sekmesinde.'
    }

    // Admin: öğrenci sayısı
    if (v.admin && /öğrenci|ogrenci|kaç kişi|kac kisi/.test(s)) {
      return `Sistemde kayıtlı ${v.ogrenciSayisi ?? '?'} öğrenci var.`
    }

    return null
  }

  const sor = async (metin) => {
    const temiz = metin.trim()
    if (!temiz) return
    setMesajlar((m) => [...m, { kim: 'ben', metin: temiz }])
    setSoru('')
    setDusunuyor(true)

    // Veri henüz gelmediyse bekle
    if (!veriRef.current) {
      try { await veriGetir() } catch { /* veri gelmezse SSS ile devam */ }
    }

    const s = temiz.toLocaleLowerCase('tr')

    // Önce "nasıl yapılır" soruları, sonra kişisel veri, sonra SSS
    let cevap = null
    if (/nasıl|nasil|unuttum/.test(s)) {
      const sss = SSS.filter((k) => k.anahtarlar.some((a) => s.includes(a))).sort((a, b) => b.anahtarlar.filter((x) => s.includes(x)).length - a.anahtarlar.filter((x) => s.includes(x)).length)[0]
      cevap = sss?.cevap || null
    }
    if (!cevap) cevap = veriCevabi(s)
    if (!cevap) {
      const sss = SSS.filter((k) => k.anahtarlar.some((a) => s.includes(a)))[0]
      cevap = sss?.cevap || VARSAYILAN
    }

    setDusunuyor(false)
    setMesajlar((m) => [...m, { kim: 'bot', metin: cevap }])
  }

  const hizliSorular = profil.rol === 'admin'
    ? ['Bekleyen görevler neler?', 'Kaç öğrenci var?', 'Değerlendirme bekleyen var mı?', 'Yaklaşan etkinlikler?']
    : ['Görevlerim neler?', 'Hangi ödevlerim eksik?', 'Yaklaşan etkinlikler?', 'Puanlarım?']

  return (
    <>
      <button className="bot-dugme" onClick={panelAc} aria-label="Yardım asistanı">
        {acik ? '✕' : '💬'}
      </button>

      {acik && (
        <div className="bot-panel" role="dialog" aria-label="Yardım asistanı">
          <div className="bot-baslik">🎵 Yardım Asistanı</div>
          <div className="bot-mesajlar">
            {mesajlar.map((m, i) => (
              <div key={i} className={'bot-mesaj ' + m.kim}>{m.metin}</div>
            ))}
            {dusunuyor && <div className="bot-mesaj bot">Bakıyorum… 🎼</div>}
            <div ref={altRef} />
          </div>
          <div className="bot-hizli">
            {hizliSorular.map((h) => (
              <button key={h} onClick={() => sor(h)}>{h}</button>
            ))}
          </div>
          <div className="bot-giris">
            <input
              value={soru}
              onChange={(e) => setSoru(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && sor(soru)}
              placeholder="Sorunu yaz…"
            />
            <button onClick={() => sor(soru)}>Gönder</button>
          </div>
        </div>
      )}
    </>
  )
}
